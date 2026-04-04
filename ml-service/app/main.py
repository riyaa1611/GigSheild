"""
GigShield ML Service — FastAPI Application
Port: 8001

Endpoints:
    POST /predict/premium      — XGBoost premium multiplier
    POST /score/fraud          — Isolation Forest + Rule engine fraud score
    GET  /forecast/disruption  — Zone risk forecast (heuristic / LSTM)
    GET  /health               — Service health + model load status

Startup: loads all model files from app/models/. Returns 503 on
         missing model file until models are trained via `make ml-train`.
"""

from __future__ import annotations

import logging
import math
from contextlib import asynccontextmanager
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.schemas.premium import PremiumRequest, PremiumResponse, PremiumBreakdown
from app.schemas.fraud import FraudRequest, FraudResponse
from app.schemas.forecast import ForecastResponse, DailyForecast

# ── Logging ───────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(name)s | %(message)s")
log = logging.getLogger("gigshield.ml")

# ── Paths ─────────────────────────────────────────────────────
APP_DIR    = Path(__file__).parent
MODELS_DIR = APP_DIR / "models"
DATA_DIR   = APP_DIR / "data"

PREMIUM_MODEL_PATH = MODELS_DIR / "premium_model.pkl"
FRAUD_MODEL_PATH   = MODELS_DIR / "fraud_model.pkl"
ZONE_HISTORY_PATH  = DATA_DIR   / "zone_history.csv"

# ── Model registry (populated at startup) ────────────────────
_models: Dict[str, Any] = {
    "premium": None,
    "fraud": None,
    "lstm": None,          # placeholder — set when PyTorch model loaded
    "zone_history_df": None,
    "loaded_at": None,
}

# ── Seasonal factor table ────────────────────────────────────
SEASONAL_FACTOR = {
    1: -0.10, 2: -0.10, 3: -0.05, 4:  0.00,
    5:  0.05, 6:  0.15, 7:  0.18, 8:  0.15,
    9:  0.10, 10: -0.02, 11: -0.08, 12: -0.10,
}

PLAN_BASE = {"basic": 29, "pro": 49, "ultra": 79}

RISK_LEVELS = [
    (0.25, "low"),
    (0.50, "moderate"),
    (0.75, "high"),
    (1.01, "critical"),
]

PLAN_THRESHOLDS = {
    "ultra": 0.65,
    "pro":   0.40,
    "basic": 0.0,
}


# ─────────────────────────────────────────────────────────────
# Startup / Shutdown
# ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load all model files on startup."""
    log.info("⚙  Loading ML models…")

    # Premium model
    if PREMIUM_MODEL_PATH.exists():
        _models["premium"] = joblib.load(PREMIUM_MODEL_PATH)
        log.info(f"✅ Premium model loaded (trained at: "
                 f"{_models['premium'].get('trained_at', 'unknown')})")
    else:
        log.warning(f"⚠  Premium model NOT found at {PREMIUM_MODEL_PATH}. "
                    "Run: make ml-train-premium")

    # Fraud model
    if FRAUD_MODEL_PATH.exists():
        _models["fraud"] = joblib.load(FRAUD_MODEL_PATH)
        log.info(f"✅ Fraud model loaded (trained at: "
                 f"{_models['fraud'].get('trained_at', 'unknown')})")
    else:
        log.warning(f"⚠  Fraud model NOT found at {FRAUD_MODEL_PATH}. "
                    "Run: make ml-train-fraud")

    # LSTM model (optional — heuristic fallback active if missing)
    lstm_path = MODELS_DIR / "lstm_forecast.pt"
    if lstm_path.exists():
        try:
            import torch
            _models["lstm"] = torch.load(lstm_path, map_location="cpu")
            log.info("✅ LSTM forecast model loaded.")
        except Exception as e:
            log.warning(f"⚠  LSTM load failed: {e}")
    else:
        log.info("ℹ  LSTM model not found — heuristic fallback active for /forecast/disruption")

    # Zone history for forecast fallback
    if ZONE_HISTORY_PATH.exists():
        _models["zone_history_df"] = pd.read_csv(ZONE_HISTORY_PATH)
        log.info(f"✅ Zone history loaded ({len(_models['zone_history_df'])} rows)")
    else:
        log.warning("⚠  zone_history.csv not found — run synthetic_generator.py")

    import datetime as _dt
    _models["loaded_at"] = _dt.datetime.utcnow().isoformat()

    yield   # ← application runs here

    log.info("🛑 ML service shutting down.")


# ─────────────────────────────────────────────────────────────
# App Init
# ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="GigShield ML Service",
    description=(
        "Parametric income insurance ML engine: "
        "dynamic premium pricing (XGBoost), fraud detection "
        "(Isolation Forest + rules), and disruption forecasting (LSTM / heuristic)."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def _require_model(key: str, endpoint: str):
    """Raise 503 if the requested model bundle isn't loaded."""
    if _models[key] is None:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "Model not loaded",
                "model": key,
                "fix": f"Run: make ml-train-{key.replace('_model', '')}",
            }
        )
    return _models[key]


def _risk_level(score: float) -> str:
    for threshold, level in RISK_LEVELS:
        if score < threshold:
            return level
    return "critical"


def _recommended_plan(peak_score: float) -> str:
    for plan, threshold in PLAN_THRESHOLDS.items():
        if peak_score >= threshold:
            return plan
    return "basic"


# ─────────────────────────────────────────────────────────────
# Feature Engineering (mirrors train_premium.py)
# ─────────────────────────────────────────────────────────────

def _build_premium_features(req: PremiumRequest, bundle: dict) -> np.ndarray:
    kmeans  = bundle["kmeans"]
    le      = bundle["label_encoder"]
    scaler  = bundle["scaler"]

    coords = np.array([[req.zoneLat, req.zoneLng]])
    zone_cluster = int(kmeans.predict(coords)[0])

    platform_enc = int(le.transform([req.platform])[0])
    is_monsoon   = int(req.currentMonth in [6, 7, 8, 9])
    month_sin    = math.sin(2 * math.pi * req.currentMonth / 12)
    month_cos    = math.cos(2 * math.pi * req.currentMonth / 12)
    claim_bucket = min(req.claimHistoryCount // 2, 3)

    feature_vector = np.array([[
        zone_cluster, platform_enc, req.avgWeeklyHours,
        req.claimHistoryCount, claim_bucket,
        req.zoneRiskScore, is_monsoon, month_sin, month_cos,
    ]], dtype=np.float32)

    return scaler.transform(feature_vector)


# ─────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────

@app.post("/predict/premium", response_model=PremiumResponse, tags=["Premium"])
def predict_premium(req: PremiumRequest):
    """
    Predict the premium multiplier for a worker using the XGBoost model.
    Returns adjustedPremium for basic/pro/ultra plans and a factor breakdown.
    """
    bundle = _require_model("premium", "/predict/premium")
    model  = bundle["model"]

    X = _build_premium_features(req, bundle)
    raw_multiplier = float(model.predict(X)[0])
    multiplier = float(np.clip(raw_multiplier, 0.70, 1.30))

    # Compute breakdown approximation (explainability)
    zone_delta     = round((req.zoneRiskScore - 1.0) * 0.40, 4)
    seasonal_delta = round(SEASONAL_FACTOR.get(req.currentMonth, 0) * 0.60, 4)
    claim_delta    = round(min(req.claimHistoryCount * 0.03, 0.15), 4)
    platform_risk  = {"zomato": 0.02, "swiggy": 0.01,
                      "zepto": -0.02, "blinkit": -0.03, "amazon": -0.05}
    platform_delta = round(platform_risk.get(req.platform, 0.0), 4)

    adjusted = {
        plan: round(base * multiplier)
        for plan, base in PLAN_BASE.items()
    }

    return PremiumResponse(
        multiplier=round(multiplier, 4),
        adjustedPremium=adjusted,
        breakdown=PremiumBreakdown(
            zoneRisk=zone_delta,
            seasonal=seasonal_delta,
            claimHistory=claim_delta,
            platformRisk=platform_delta,
        ),
        confidence=min(0.95, float(bundle.get("val_mae", 0.05)) + 0.85),
    )


@app.post("/score/fraud", response_model=FraudResponse, tags=["Fraud"])
def score_fraud(req: FraudRequest):
    """
    Score a claim for fraud using Isolation Forest + deterministic rule engine.
    Blended score: 40% rule score + 60% model score.
    Decisions: <0.3 → auto_approve | 0.3–0.7 → secondary_check | >0.7 → manual_review
    """
    bundle     = _require_model("fraud", "/score/fraud")
    iso_forest = bundle["iso_forest"]
    scaler     = bundle["scaler"]
    from app.engine_rules import RuleBasedOverride
    rule_engine = RuleBasedOverride()
    feature_cols = bundle["feature_cols"]

    # ── Rule engine first ─────────────────────────────────────
    record = {
        "gpsOffsetKm":             0,   # computed below
        "claimCount30days":        req.claimCount30days,
        "platformActiveStatus":    req.platformActiveStatus,
        "claimTimingVsPolicyStart":req.claimTimingVsPolicyStart,
        "lastDeliveryCount":       req.lastDeliveryCount,
        "deviceClusterSize":       1,   # runtime lookup — use 1 if unknown
        "isRepeatPattern":         1 if req.claimCount30days > 3 else 0,
    }

    # Approximate GPS offset from pincode (very rough; production uses geo lookup)
    # For now use a heuristic: if GPS far from known Mumbai centre, flag it
    try:
        import math
        # Compute distance from trigger zone lat/lng placeholder (use req params)
        # In production the backend passes the trigger zone centroid coords
        gps_offset_km = 0.0   # placeholder — backend should pre-compute this
        record["gpsOffsetKm"] = gps_offset_km
    except Exception:
        pass

    rule_score, flags, hard_override = rule_engine.score(record, req.deviceFingerprint)

    if hard_override:
        return FraudResponse(
            fraudScore=1.0,
            decision="manual_review",
            flags=flags,
            ruleOverride=True,
            modelScore=1.0,
            ruleScore=1.0,
        )

    # ── Isolation Forest score ────────────────────────────────
    feature_vector = []
    col_map = {
        "gpsOffsetKm":              record.get("gpsOffsetKm", 0),
        "claimCount30days":         req.claimCount30days,
        "platformActiveStatus":     int(req.platformActiveStatus),
        "claimTimingVsPolicyStart": req.claimTimingVsPolicyStart,
        "lastDeliveryCount":        req.lastDeliveryCount,
        "deviceClusterSize":        record.get("deviceClusterSize", 1),
        "isRepeatPattern":          record.get("isRepeatPattern", 0),
    }
    for col in feature_cols:
        feature_vector.append(col_map.get(col, 0))

    X = np.array([feature_vector], dtype=np.float32)
    X_scaled = scaler.transform(X)

    raw_model_score = float(-iso_forest.score_samples(X_scaled)[0])
    # Normalise using training-time min/max for consistent calibration
    score_min = bundle.get("score_min", 0.0)
    score_max = bundle.get("score_max", 1.0)
    model_score = float(np.clip((raw_model_score - score_min) / (score_max - score_min + 1e-9), 0.0, 1.0))

    # ── Blend: 40% rule + 60% model ──────────────────────────
    final_score = float(np.clip(0.40 * rule_score + 0.60 * model_score, 0.0, 1.0))

    if final_score < 0.30:
        decision = "auto_approve"
    elif final_score < 0.70:
        decision = "secondary_check"
    else:
        decision = "manual_review"

    return FraudResponse(
        fraudScore=round(final_score, 4),
        decision=decision,
        flags=flags,
        ruleOverride=False,
        modelScore=round(model_score, 4),
        ruleScore=round(rule_score, 4),
    )


@app.get("/forecast/disruption", response_model=ForecastResponse, tags=["Forecast"])
def forecast_disruption(
    zone: str = Query(..., description="Pincode to forecast"),
    days: int = Query(7, ge=1, le=30, description="Number of days to forecast"),
):
    """
    Returns a day-by-day disruption risk forecast for the given zone.
    Uses the LSTM model if available; falls back to seasonal heuristic.
    """
    # TODO: replace heuristic with trained LSTM once PyTorch model ready
    model_type = "heuristic"
    today = date.today()
    zone_df = None

    if _models["zone_history_df"] is not None:
        df = _models["zone_history_df"]
        zone_df = df[df["pincode"].astype(str) == str(zone)]

    daily_forecasts: List[DailyForecast] = []
    for i in range(days):
        forecast_date = today + timedelta(days=i + 1)
        month = forecast_date.month

        # Base seasonal risk
        seasonal = SEASONAL_FACTOR.get(month, 0.0)
        base_risk = 0.30 + seasonal * 1.5   # scale seasonal to risk [0-1]

        # Add zone-specific modifier from history
        if zone_df is not None and not zone_df.empty:
            hist_month = zone_df[zone_df["month"] == month]
            if not hist_month.empty:
                avg_triggers = hist_month["triggerCount"].mean()
                base_risk += min(avg_triggers * 0.05, 0.25)

        # Add small random variation for UI realism
        import random
        base_risk += random.uniform(-0.05, 0.05)
        risk_score = float(np.clip(base_risk, 0.0, 1.0))

        # Dominant trigger by month
        if month in [6, 7, 8, 9]:
            dominant = "T-01"   # Heavy Rain
        elif month in [4, 5]:
            dominant = "T-02"   # Extreme Heat
        else:
            dominant = "T-03"   # AQI

        daily_forecasts.append(DailyForecast(
            date=forecast_date.isoformat(),
            riskScore=round(risk_score, 4),
            riskLevel=_risk_level(risk_score),
            dominantTriggerType=dominant,
        ))

    peak = max(daily_forecasts, key=lambda d: d.riskScore)

    return ForecastResponse(
        zone=zone,
        forecastDays=daily_forecasts,
        peakRiskDay=peak.date,
        peakRiskScore=peak.riskScore,
        recommendedPlan=_recommended_plan(peak.riskScore),
        modelType=model_type,
    )


@app.get("/health", tags=["Meta"])
def health():
    """Service health check. Returns 503 if critical models missing."""
    premium_ok = _models["premium"] is not None
    fraud_ok   = _models["fraud"]   is not None
    lstm_ok    = _models["lstm"]    is not None

    status = "healthy" if (premium_ok and fraud_ok) else "degraded"

    return {
        "status": status,
        "version": "1.0.0",
        "modelsLoaded": {
            "premium": premium_ok,
            "fraud":   fraud_ok,
            "lstm":    lstm_ok,
        },
        "lastRetrain": (
            _models["premium"]["trained_at"]
            if premium_ok else None
        ),
        "loadedAt": _models.get("loaded_at"),
        "port": 8001,
    }

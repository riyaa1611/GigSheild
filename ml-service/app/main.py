import math
import os
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.schemas.forecast import ForecastDay, ForecastResponse
from app.schemas.fraud import FraudRequest, FraudResponse
from app.schemas.premium import PlanAdjustment, PremiumRequest, PremiumResponse
from app.train.synthetic_generator import (
    generate_fraud_data,
    generate_synthetic_workers,
    generate_zone_history,
)
from app.train.train_fraud import train as train_fraud_model
from app.train.train_forecast import train as train_forecast_model
from app.train.train_premium import train as train_premium_model

models = {}
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

PREMIUM_MODEL_FILE = "premium_model.pkl"
PREMIUM_ENCODER_FILE = "premium_encoder.pkl"
FRAUD_MODEL_FILE = "fraud_model.pkl"
FORECAST_MODEL_FILE = "forecast_model.pkl"

PREMIUM_MODEL_VERSION = "xgboost_v1"
PREMIUM_FALLBACK_VERSION = "heuristic_v1"
FRAUD_MODEL_VERSION = "isolation_forest_v1"
FRAUD_FALLBACK_VERSION = "rule_based_v1"
FORECAST_MODEL_VERSION = "tier1_forecast_xgboost_v1"
FORECAST_FALLBACK_VERSION = "seasonal_heuristic_v1"

BASE_PREMIUMS = {"basic": 29, "pro": 49, "ultra": 79}
ZONE_RISK = {
    "400": 0.85,
    "110": 0.72,
    "160": 0.57,
    "380": 0.60,
    "411": 0.50,
    "500": 0.52,
    "560": 0.55,
    "600": 0.65,
    "700": 0.58,
}
PLATFORM_RISK = {
    "zomato": 1.00,
    "swiggy": 0.98,
    "zepto": 1.06,
    "blinkit": 1.03,
    "amazon": 0.94,
}
ZONE_COORDS = {
    "110": (28.704, 77.102),
    "160": (30.733, 76.779),
    "380": (23.022, 72.571),
    "400": (19.076, 72.877),
    "411": (18.520, 73.856),
    "500": (17.385, 78.486),
    "560": (12.971, 77.594),
    "600": (13.082, 80.270),
    "700": (22.572, 88.363),
}

TIER1_CITY_ZONES = [
    {"city": "Mumbai", "cluster": "mumbai", "pincode": "400070", "lat": 19.076, "lng": 72.877},
    {"city": "Mumbai South", "cluster": "mumbai south", "pincode": "400001", "lat": 18.938, "lng": 72.835},
    {"city": "Delhi", "cluster": "delhi", "pincode": "110001", "lat": 28.704, "lng": 77.102},
    {"city": "Ahmedabad", "cluster": "ahmedabad", "pincode": "380015", "lat": 23.022, "lng": 72.571},
    {"city": "Bangalore", "cluster": "bangalore", "pincode": "560001", "lat": 12.971, "lng": 77.594},
    {"city": "Chennai", "cluster": "chennai", "pincode": "600001", "lat": 13.082, "lng": 80.270},
    {"city": "Pune", "cluster": "pune", "pincode": "411001", "lat": 18.520, "lng": 73.856},
    {"city": "Kolkata", "cluster": "kolkata", "pincode": "700001", "lat": 22.572, "lng": 88.363},
    {"city": "Hyderabad", "cluster": "hyderabad", "pincode": "500001", "lat": 17.385, "lng": 78.486},
]

CITY_CLUSTER_ALIASES = {
    "bengaluru": "bangalore",
    "new delhi": "delhi",
}


def _env_flag(name: str, default: bool = True) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _model_path(file_name: str) -> str:
    return os.path.join(MODEL_DIR, file_name)


def _ensure_training_datasets() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)

    synthetic_workers_path = os.path.join(DATA_DIR, "synthetic_workers.csv")
    if not os.path.isfile(synthetic_workers_path):
        generate_synthetic_workers(800).to_csv(synthetic_workers_path, index=False)

    fraud_training_path = os.path.join(DATA_DIR, "fraud_training.csv")
    if not os.path.isfile(fraud_training_path):
        generate_fraud_data(1200).to_csv(fraud_training_path, index=False)

    zone_history_path = os.path.join(DATA_DIR, "zone_history.csv")
    if not os.path.isfile(zone_history_path):
        generate_zone_history().to_csv(zone_history_path, index=False)


def ensure_model_artifacts() -> None:
    os.makedirs(MODEL_DIR, exist_ok=True)
    auto_train_models = _env_flag("AUTO_TRAIN_MODELS", True)

    premium_missing = not os.path.isfile(_model_path(PREMIUM_MODEL_FILE)) or not os.path.isfile(_model_path(PREMIUM_ENCODER_FILE))
    fraud_missing = not os.path.isfile(_model_path(FRAUD_MODEL_FILE))
    forecast_missing = not os.path.isfile(_model_path(FORECAST_MODEL_FILE))

    if not auto_train_models or (not premium_missing and not fraud_missing and not forecast_missing):
        return

    _ensure_training_datasets()

    if premium_missing:
        try:
            train_premium_model()
            print("Premium model trained during startup")
        except Exception as exc:
            print(f"Premium model auto-train failed: {exc}")

    if fraud_missing:
        try:
            train_fraud_model()
            print("Fraud model trained during startup")
        except Exception as exc:
            print(f"Fraud model auto-train failed: {exc}")

    if forecast_missing:
        try:
            train_forecast_model()
            print("Forecast model trained during startup")
        except Exception as exc:
            print(f"Forecast model auto-train failed: {exc}")


def normalize_platform(platform: str | None) -> str:
    value = (platform or "zomato").strip().lower()
    return value if value else "zomato"


def encode_platform(platform: str) -> tuple[int, str]:
    encoder = models["premium_enc"]

    if platform in encoder.classes_:
        return int(encoder.transform([platform])[0]), platform

    fallback = str(encoder.classes_[0]) if len(encoder.classes_) else "zomato"
    return int(encoder.transform([fallback])[0]), fallback


def resolve_zone_risk(req: PremiumRequest, zone_prefix: str, month: int) -> float:
    if req.zoneRiskScore and req.zoneRiskScore > 0:
        base = float(req.zoneRiskScore)
    else:
        base = float(ZONE_RISK.get(zone_prefix, 0.55))

    zone_history = models.get("zone_history")
    if zone_history is None or not isinstance(zone_history, pd.DataFrame):
        return base

    try:
        month_rows = zone_history[
            zone_history["pincode"].astype(str).str.startswith(zone_prefix)
            & (zone_history["month"] == month)
        ]
        if month_rows.empty:
            return base

        historical = float(month_rows["avgSeverity"].mean())
        return float(np.clip(0.6 * base + 0.4 * historical, 0.3, 1.6))
    except Exception:
        return base


def fallback_premium_multiplier(zone_risk: float, month: int, claim_count: int, avg_weekly_hours: float, platform: str) -> float:
    seasonal = 0.12 if 6 <= month <= 9 else (-0.08 if month in [12, 1, 2] else 0)
    loyalty = -0.05 if claim_count == 0 else (0.05 if claim_count > 5 else 0)
    hours_factor = 0.05 if avg_weekly_hours > 60 else (-0.05 if avg_weekly_hours < 40 else 0)
    platform_factor = (PLATFORM_RISK.get(platform, 1.0) - 1.0) * 0.2

    raw = 0.85 + zone_risk * 0.3 + seasonal + loyalty + hours_factor + platform_factor
    return float(np.clip(raw, 0.7, 1.35))


def decision_from_score(score: float) -> str:
    if score < 0.3:
        return "auto_approve"
    if score < 0.7:
        return "secondary_check"
    return "manual_review"


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


def compute_gps_offset_km(req: FraudRequest) -> float:
    if req.gpsOffsetKm is not None and req.gpsOffsetKm >= 0:
        return float(req.gpsOffsetKm)

    zone_prefix = (req.triggerZonePincode or "")[:3]
    zone_coords = ZONE_COORDS.get(zone_prefix)
    if not zone_coords:
        return 0.0

    if req.gpsLat is None or req.gpsLng is None:
        return 0.0

    return float(max(0.0, haversine_km(req.gpsLat, req.gpsLng, zone_coords[0], zone_coords[1])))


def score_fraud_rules(features: dict) -> tuple[float, list[str]]:
    score = 0.05
    flags = []

    gps_offset = float(features.get("gpsOffsetKm", 0))
    deliveries = int(features.get("lastDeliveryCount", 0))
    timing = int(features.get("claimTimingMinutes", 0))
    claim_count = int(features.get("claimCount30d", 0))
    platform_active = bool(features.get("platformActive", 1))

    if gps_offset > 8:
        score += 0.18
        flags.append("zone_offset")
    if gps_offset > 20:
        score += 0.24
        flags.append("gps_mismatch")
    if deliveries == 0:
        score += 0.08
        flags.append("zero_deliveries")
    if not platform_active and deliveries <= 1:
        score += 0.30
        flags.append("platform_inactive")
    if timing < 90:
        score += 0.28
        flags.append("new_policy_claim")
    if claim_count >= 6:
        score += 0.20
        flags.append("repeat_pattern")

    return float(np.clip(round(score, 3), 0.0, 1.0)), flags


def resolve_city_cluster(city: str | None) -> str | None:
    if not city:
        return None
    normalized = city.strip().lower()
    if not normalized:
        return None
    return CITY_CLUSTER_ALIASES.get(normalized, normalized)


def zone_meta_for(zone: str) -> dict:
    prefix = (zone or "")[:3]

    for z in TIER1_CITY_ZONES:
        if z["pincode"] == zone or z["pincode"].startswith(prefix):
            return z

    fallback_coords = ZONE_COORDS.get(prefix, (20.5937, 78.9629))
    return {
        "city": f"Zone {prefix}",
        "cluster": None,
        "pincode": zone,
        "lat": fallback_coords[0],
        "lng": fallback_coords[1],
    }


def risk_level_from_score(score: float) -> str:
    if score < 0.3:
        return "low"
    if score < 0.6:
        return "medium"
    if score < 0.8:
        return "high"
    return "critical"


def recommended_plan_from_score(score: float) -> str:
    if score > 0.72:
        return "ultra"
    if score > 0.46:
        return "pro"
    return "basic"


def default_forecast_profile(prefix: str) -> dict:
    zone_base = float(ZONE_RISK.get(prefix, 0.55))
    return {
        "baseRiskScore": zone_base,
        "lag_trigger_1": 2.2,
        "lag_trigger_2": 2.0,
        "lag_severity_1": float(np.clip(zone_base * 0.95, 0.25, 0.95)),
        "lag_severity_2": float(np.clip(zone_base * 0.90, 0.25, 0.95)),
        "lag_risk_1": float(np.clip(zone_base * 0.92, 0.2, 0.98)),
        "trigger_trend": 0.0,
        "severity_trend": 0.0,
    }


def normalize_forecast_profile(profile: dict | None, prefix: str) -> dict:
    defaults = default_forecast_profile(prefix)

    if not isinstance(profile, dict):
        return defaults

    normalized = defaults.copy()
    for key in normalized:
        try:
            normalized[key] = float(profile.get(key, normalized[key]))
        except Exception:
            normalized[key] = float(normalized[key])

    return normalized


def profile_from_zone_history(prefix: str, cluster: str | None) -> dict | None:
    zone_history = models.get("zone_history")
    if zone_history is None or not isinstance(zone_history, pd.DataFrame):
        return None

    rows = zone_history.copy()
    rows["pincode"] = rows["pincode"].astype(str)

    # Keep runtime forecast compatible with generated and curated history schemas.
    if "cityCluster" not in rows.columns:
        if "city" in rows.columns:
            rows["cityCluster"] = rows["city"]
        elif "city_cluster" in rows.columns:
            rows["cityCluster"] = rows["city_cluster"]
        else:
            rows["cityCluster"] = ""

    if "triggerCount" not in rows.columns and "trigger_count" in rows.columns:
        rows["triggerCount"] = rows["trigger_count"]

    if "avgSeverity" not in rows.columns and "avg_severity" in rows.columns:
        rows["avgSeverity"] = rows["avg_severity"]

    if "baseRiskScore" not in rows.columns:
        if "base_risk" in rows.columns:
            rows["baseRiskScore"] = rows["base_risk"]
        elif "zoneRiskScore" in rows.columns:
            rows["baseRiskScore"] = rows["zoneRiskScore"]
        elif "avgSeverity" in rows.columns:
            rows["baseRiskScore"] = rows.groupby("pincode")["avgSeverity"].transform("mean")
        else:
            rows["baseRiskScore"] = 0.55

    rows["cityCluster"] = rows["cityCluster"].astype(str).str.lower().str.strip()

    if cluster:
        rows = rows[rows["cityCluster"] == cluster]
    if rows.empty:
        rows = rows[rows["pincode"].astype(str).str.startswith(prefix)]

    if rows.empty:
        return None

    rows = rows.sort_values(["year", "month"]).tail(3)
    latest = rows.iloc[-1]
    prev = rows.iloc[-2] if len(rows) > 1 else latest

    trigger_norm = float(np.clip(float(latest["triggerCount"]) / 8.0, 0.0, 1.0))
    base_norm = float(np.clip(float(latest["baseRiskScore"]) / 1.3, 0.0, 1.0))
    lag_risk = float(np.clip(0.60 * float(latest["avgSeverity"]) + 0.30 * trigger_norm + 0.10 * base_norm, 0.0, 1.0))

    return {
        "baseRiskScore": float(latest["baseRiskScore"]),
        "lag_trigger_1": float(latest["triggerCount"]),
        "lag_trigger_2": float(prev["triggerCount"]),
        "lag_severity_1": float(latest["avgSeverity"]),
        "lag_severity_2": float(prev["avgSeverity"]),
        "lag_risk_1": lag_risk,
        "trigger_trend": float(latest["triggerCount"] - prev["triggerCount"]),
        "severity_trend": float(latest["avgSeverity"] - prev["avgSeverity"]),
    }


def resolve_forecast_profile(zone: str, cluster: str | None) -> dict:
    prefix = (zone or "")[:3]
    artifact = models.get("forecast")

    if isinstance(artifact, dict):
        city_profiles = artifact.get("city_profiles") or {}
        prefix_profiles = artifact.get("prefix_profiles") or {}

        if cluster and cluster in city_profiles:
            return normalize_forecast_profile(city_profiles.get(cluster), prefix)

        if prefix in prefix_profiles:
            return normalize_forecast_profile(prefix_profiles.get(prefix), prefix)

    historical_profile = profile_from_zone_history(prefix, cluster)
    return normalize_forecast_profile(historical_profile, prefix)


def predict_monthly_risk(zone: str, forecast_date: date, cluster: str | None) -> tuple[float, dict, bool]:
    prefix = (zone or "")[:3]
    profile = resolve_forecast_profile(zone, cluster)

    features = {
        "month": float(forecast_date.month),
        "month_sin": float(np.sin(2 * np.pi * forecast_date.month / 12.0)),
        "month_cos": float(np.cos(2 * np.pi * forecast_date.month / 12.0)),
        "baseRiskScore": float(profile["baseRiskScore"]),
        "lag_trigger_1": float(profile["lag_trigger_1"]),
        "lag_trigger_2": float(profile["lag_trigger_2"]),
        "lag_severity_1": float(profile["lag_severity_1"]),
        "lag_severity_2": float(profile["lag_severity_2"]),
        "lag_risk_1": float(profile["lag_risk_1"]),
        "trigger_trend": float(profile["trigger_trend"]),
        "severity_trend": float(profile["severity_trend"]),
    }

    artifact = models.get("forecast")
    if isinstance(artifact, dict) and "model" in artifact:
        try:
            feature_columns = artifact.get("feature_columns") or []
            x = np.array([[features[col] for col in feature_columns]], dtype=float)
            prediction = float(np.clip(artifact["model"].predict(x)[0], 0.0, 1.0))
            return prediction, profile, True
        except Exception:
            pass

    seasonal = 0.18 if 6 <= forecast_date.month <= 9 else (0.07 if forecast_date.month in [10, 11] else -0.04 if forecast_date.month in [12, 1, 2] else 0.0)
    zone_base = float(np.clip(ZONE_RISK.get(prefix, 0.55), 0.25, 1.0))
    trigger_signal = float(np.clip(profile["lag_trigger_1"] / 8.0, 0.0, 1.0))
    severity_signal = float(np.clip(profile["lag_severity_1"], 0.0, 1.0))
    base_signal = float(np.clip(profile["baseRiskScore"] / 1.3, 0.0, 1.0))

    fallback = float(np.clip(0.30 * zone_base + 0.25 * base_signal + 0.25 * severity_signal + 0.20 * trigger_signal + seasonal, 0.0, 1.0))
    return fallback, profile, False


def build_zone_forecast(zone: str = "400070", days: int = 7) -> ForecastResponse:
    resolved_days = int(np.clip(days, 1, 14))
    zone = (zone or "400070").strip()
    zone_info = zone_meta_for(zone)

    cluster = resolve_city_cluster(zone_info.get("cluster") or zone_info.get("city"))
    today = date.today()
    prefix_seed_text = "".join(ch for ch in zone[:3] if ch.isdigit())
    prefix_seed = int(prefix_seed_text) if prefix_seed_text else 0

    forecast_days = []
    peak_score = 0.0
    peak_day = today.isoformat()
    model_hits = 0

    for idx in range(resolved_days):
        current_day = today + timedelta(days=idx)
        base_risk, profile, used_model = predict_monthly_risk(zone, current_day, cluster)
        if used_model:
            model_hits += 1

        weekend_factor = 0.05 if current_day.weekday() in [5, 6] else 0.0
        daily_seasonal = 0.03 if 6 <= current_day.month <= 9 else (0.01 if current_day.month in [10, 11] else -0.01 if current_day.month in [12, 1, 2] else 0.0)
        trend_factor = float(np.clip(profile["trigger_trend"], -3, 3)) * 0.008 + float(np.clip(profile["severity_trend"], -0.4, 0.4)) * 0.06
        oscillation = 0.02 * math.sin((idx + 1) * (1.3 + (prefix_seed % 5)))

        score = float(np.clip(base_risk + weekend_factor + daily_seasonal + trend_factor + oscillation, 0.0, 1.0))
        rounded_score = round(score, 3)
        risk_level = risk_level_from_score(rounded_score)

        forecast_days.append(
            ForecastDay(
                date=current_day.isoformat(),
                riskScore=rounded_score,
                riskLevel=risk_level,
            )
        )

        if rounded_score > peak_score:
            peak_score = rounded_score
            peak_day = current_day.isoformat()

    forecast_version = models.get("forecast_version", FORECAST_FALLBACK_VERSION)
    model_coverage = model_hits / resolved_days if resolved_days else 0.0
    confidence_base = 0.84 if model_coverage > 0.5 else 0.71
    trend_noise = min(0.08, abs(profile["trigger_trend"]) * 0.01 + abs(profile["severity_trend"]) * 0.05)
    confidence = float(np.clip(confidence_base - trend_noise, 0.62, 0.92))

    return ForecastResponse(
        zone=zone,
        city=zone_info.get("city"),
        forecastDays=forecast_days,
        peakRiskDay=peak_day,
        recommendedPlan=recommended_plan_from_score(peak_score),
        confidence=round(confidence, 3),
        modelVersion=forecast_version,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_model_artifacts()

    try:
        models["premium"] = joblib.load(_model_path(PREMIUM_MODEL_FILE))
        models["premium_enc"] = joblib.load(_model_path(PREMIUM_ENCODER_FILE))
        print("Premium model loaded")
    except FileNotFoundError:
        print("Premium model not found - using heuristic fallback")
    except Exception as exc:
        print(f"Premium model load failed ({exc}) - attempting auto-retrain")
        if _env_flag("AUTO_TRAIN_MODELS", True):
            try:
                train_premium_model()
                models["premium"] = joblib.load(_model_path(PREMIUM_MODEL_FILE))
                models["premium_enc"] = joblib.load(_model_path(PREMIUM_ENCODER_FILE))
                print("Premium model recovered after retrain")
            except Exception as retrain_exc:
                print(f"Premium model recovery failed: {retrain_exc}")

    try:
        models["fraud"] = joblib.load(_model_path(FRAUD_MODEL_FILE))
        print("Fraud model loaded")
    except FileNotFoundError:
        print("Fraud model not found - using rule-based fallback")
    except Exception as exc:
        print(f"Fraud model load failed ({exc}) - attempting auto-retrain")
        if _env_flag("AUTO_TRAIN_MODELS", True):
            try:
                train_fraud_model()
                models["fraud"] = joblib.load(_model_path(FRAUD_MODEL_FILE))
                print("Fraud model recovered after retrain")
            except Exception as retrain_exc:
                print(f"Fraud model recovery failed: {retrain_exc}")

    try:
        models["forecast"] = joblib.load(_model_path(FORECAST_MODEL_FILE))
        print("Forecast model loaded")
    except FileNotFoundError:
        print("Forecast model not found - using seasonal fallback")
    except Exception as exc:
        print(f"Forecast model load failed ({exc}) - attempting auto-retrain")
        if _env_flag("AUTO_TRAIN_MODELS", True):
            try:
                train_forecast_model()
                models["forecast"] = joblib.load(_model_path(FORECAST_MODEL_FILE))
                print("Forecast model recovered after retrain")
            except Exception as retrain_exc:
                print(f"Forecast model recovery failed: {retrain_exc}")

    try:
        models["zone_history"] = pd.read_csv(os.path.join(DATA_DIR, "zone_history.csv"))
        print("Zone history loaded")
    except FileNotFoundError:
        print("Zone history not found - using mock forecast")

    models["premium_version"] = PREMIUM_MODEL_VERSION if "premium" in models and "premium_enc" in models else PREMIUM_FALLBACK_VERSION
    models["fraud_version"] = FRAUD_MODEL_VERSION if "fraud" in models else FRAUD_FALLBACK_VERSION
    if isinstance(models.get("forecast"), dict):
        models["forecast_version"] = models["forecast"].get("model_version", FORECAST_MODEL_VERSION)
    else:
        models["forecast_version"] = FORECAST_FALLBACK_VERSION
    models["loaded_at"] = datetime.utcnow().isoformat()
    yield


app = FastAPI(title="GigShield ML Service", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "modelsLoaded": {
            "premium": "premium" in models,
            "fraud": "fraud" in models,
            "forecast": "forecast" in models,
            "zoneHistory": "zone_history" in models,
        },
        "modelVersions": {
            "premium": models.get("premium_version", PREMIUM_FALLBACK_VERSION),
            "fraud": models.get("fraud_version", FRAUD_FALLBACK_VERSION),
            "forecast": models.get("forecast_version", FORECAST_FALLBACK_VERSION),
        },
        "autoTrainModels": _env_flag("AUTO_TRAIN_MODELS", True),
        "loadedAt": models.get("loaded_at"),
        "version": "1.0.0",
    }


@app.post("/predict/premium", response_model=PremiumResponse)
def predict_premium(req: PremiumRequest):
    pincode = (req.zonePincode or "400070").strip()
    prefix = pincode[:3]
    month = req.currentMonth or datetime.utcnow().month
    claim_count = int(req.claimHistoryCount or 0)
    avg_weekly_hours = float(req.avgWeeklyHours or 56.0)
    platform = normalize_platform(req.platform)
    zone_risk = resolve_zone_risk(req, prefix, month)

    multiplier = None
    resolved_platform = platform
    model_version = PREMIUM_FALLBACK_VERSION

    if "premium" in models and "premium_enc" in models:
        try:
            platform_encoded, resolved_platform = encode_platform(platform)
            x = np.array([[zone_risk, month, platform_encoded, avg_weekly_hours, claim_count]], dtype=float)
            multiplier = float(np.clip(models["premium"].predict(x)[0], 0.7, 1.35))
            model_version = PREMIUM_MODEL_VERSION
        except Exception:
            multiplier = fallback_premium_multiplier(zone_risk, month, claim_count, avg_weekly_hours, platform)

    if multiplier is None:
        multiplier = fallback_premium_multiplier(zone_risk, month, claim_count, avg_weekly_hours, platform)

    multiplier = round(float(multiplier), 3)

    adjusted_plans = [
        PlanAdjustment(
            planId=plan_id,
            basePremium=base,
            adjustedPremium=round(base * multiplier),
            multiplier=multiplier,
        )
        for plan_id, base in BASE_PREMIUMS.items()
    ]

    seasonal = "Monsoon surcharge" if 6 <= month <= 9 else ("Winter discount" if month in [12, 1, 2] else "Neutral season")
    claims_text = "Clean history discount" if claim_count == 0 else ("Claim-frequency loading" if claim_count > 5 else "Neutral history")
    hours_text = "High-exposure loading" if avg_weekly_hours > 60 else ("Part-time discount" if avg_weekly_hours < 40 else "Standard weekly hours")

    breakdown = {
        "model": "XGBoost premium model" if model_version == PREMIUM_MODEL_VERSION else "Heuristic fallback",
        "zoneRisk": f"Zone risk signal {zone_risk:.3f}",
        "seasonal": seasonal,
        "history": claims_text,
        "hours": hours_text,
        "platform": f"Platform calibrated as {resolved_platform}",
    }

    return PremiumResponse(
        multiplier=multiplier,
        adjustedPlans=adjusted_plans,
        breakdown=breakdown,
        zone=pincode,
        modelVersion=model_version,
    )


@app.post("/score/fraud", response_model=FraudResponse)
def score_fraud(req: FraudRequest):
    features = {
        "gpsOffsetKm": compute_gps_offset_km(req),
        "lastDeliveryCount": max(0, int(req.lastDeliveryCount or 0)),
        "claimTimingMinutes": max(0, int(req.claimTimingVsPolicyStart or 0)),
        "claimCount30d": max(0, int(req.claimCount30days or 0)),
        "platformActive": int(bool(req.platformActiveStatus)),
    }

    if "fraud" in models:
        try:
            model_output = models["fraud"].predict(features)
            score = float(np.clip(model_output.get("fraudScore", 0.0), 0.0, 1.0))
            flags = list(dict.fromkeys(model_output.get("flags", [])))
            if features["gpsOffsetKm"] > 20 and "gps_mismatch" not in flags:
                flags.append("gps_mismatch")

            return FraudResponse(
                fraudScore=round(score, 3),
                decision=decision_from_score(score),
                flags=flags,
                ruleOverride=bool(model_output.get("ruleOverride", score >= 0.7)),
                modelVersion=FRAUD_MODEL_VERSION,
            )
        except Exception:
            pass

    score, flags = score_fraud_rules(features)
    return FraudResponse(
        fraudScore=score,
        decision=decision_from_score(score),
        flags=flags,
        ruleOverride=score >= 0.7,
        modelVersion=FRAUD_FALLBACK_VERSION,
    )


@app.get("/forecast/disruption")
def forecast_disruption(zone: str = "400070", days: int = 7):
    return build_zone_forecast(zone=zone, days=days)


@app.get("/forecast/disruption/tier1")
def forecast_disruption_tier1(days: int = 7):
    forecasts = []
    for zone in TIER1_CITY_ZONES:
        forecast = build_zone_forecast(zone=zone["pincode"], days=days)
        forecast_dict = forecast.model_dump() if hasattr(forecast, "model_dump") else forecast.dict()
        forecast_dict.update(
            {
                "lat": zone["lat"],
                "lng": zone["lng"],
            }
        )
        forecasts.append(forecast_dict)

    return {
        "days": int(np.clip(days, 1, 14)),
        "modelVersion": models.get("forecast_version", FORECAST_FALLBACK_VERSION),
        "generatedAt": datetime.utcnow().isoformat(),
        "cities": forecasts,
    }


@app.get("/zones/risk")
def get_zone_risks():
    zones = []

    for zone in TIER1_CITY_ZONES:
        forecast = build_zone_forecast(zone=zone["pincode"], days=7)
        average_risk = float(np.mean([day.riskScore for day in forecast.forecastDays])) if forecast.forecastDays else 0.0
        zones.append(
            {
                "pincode": zone["pincode"],
                "city": zone["city"],
                "lat": zone["lat"],
                "lng": zone["lng"],
                "riskScore": round(average_risk, 3),
                "riskLevel": risk_level_from_score(average_risk),
                "recommendedPlan": forecast.recommendedPlan,
                "modelVersion": forecast.modelVersion,
            }
        )

    return zones

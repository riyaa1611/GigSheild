"""
GigShield ML Service — Fraud Model Trainer (Isolation Forest + Rule Engine)
Trains on fraud_training.csv and wraps model with deterministic rule overrides.

Outputs:
    app/models/fraud_model.pkl  (joblib bundle: IsoForest + RuleBasedOverride)

Run:
    python app/train/train_fraud.py
    # or via Makefile:
    make ml-train-fraud
"""

from __future__ import annotations

import joblib
import warnings
from datetime import datetime
from pathlib import Path
from typing import List, Tuple

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import (
    classification_report, roc_auc_score,
    precision_recall_curve,
)
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore")

ROOT = Path(__file__).parent.parent
DATA_FILE = ROOT / "data" / "fraud_training.csv"
MODEL_FILE = ROOT / "models" / "fraud_model.pkl"
MODEL_FILE.parent.mkdir(exist_ok=True)

SEED = 42
CONTAMINATION = 0.20   # matches our synthetic fraud rate

from app.engine_rules import RuleBasedOverride, BLACKLISTED_DEVICES

FEATURE_COLS = [
    "gpsOffsetKm",
    "claimCount30days",
    "platformActiveStatus",
    "claimTimingVsPolicyStart",
    "lastDeliveryCount",
    "deviceClusterSize",
    "isRepeatPattern",
]


# ─────────────────────────────────────────────────────────────
# Training
# ─────────────────────────────────────────────────────────────

def train():
    print("=" * 60)
    print(" GigShield — Fraud Model Training (Isolation Forest)")
    print("=" * 60)

    if not DATA_FILE.exists():
        print(f"\n⚠  Data file not found: {DATA_FILE}")
        print("   Running synthetic_generator first…\n")
        from app.data.synthetic_generator import main as gen
        gen()

    df = pd.read_csv(DATA_FILE)
    print(f"\n📄 Loaded {len(df)} rows — "
          f"fraud rate: {df.isFraud.mean()*100:.1f}%")

    # ── Feature matrix ────────────────────────────────────────
    present_cols = [c for c in FEATURE_COLS if c in df.columns]
    X = df[present_cols].fillna(0).values.astype(np.float32)
    y_true = df["isFraud"].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # ── Train Isolation Forest ────────────────────────────────
    print("\n🚀 Training Isolation Forest (contamination=0.20)…")
    iso = IsolationForest(
        n_estimators=200,
        max_samples="auto",
        contamination=CONTAMINATION,
        random_state=SEED,
        n_jobs=-1,
    )
    iso.fit(X_scaled)

    # Raw anomaly scores: lower = more anomalous; map to [0,1]
    raw_scores = -iso.score_samples(X_scaled)   # negate: higher = more anomalous
    # Normalise to [0, 1]
    model_scores = (raw_scores - raw_scores.min()) / (raw_scores.max() - raw_scores.min() + 1e-9)

    # ── Evaluation ────────────────────────────────────────────
    # Convert to binary with threshold = 0.5
    preds_binary = (model_scores > 0.5).astype(int)
    auc = roc_auc_score(y_true, model_scores)
    print(f"\n📊 Isolation Forest Metrics (model only, no rules):")
    print(f"   AUC-ROC: {auc:.4f}")
    print("\n" + classification_report(y_true, preds_binary,
                                       target_names=["clean", "fraud"]))

    # ── MLflow (optional) ─────────────────────────────────────
    try:
        import mlflow
        with mlflow.start_run(run_name="fraud_isolation_forest"):
            mlflow.log_param("contamination", CONTAMINATION)
            mlflow.log_param("n_estimators", 200)
            mlflow.log_metric("auc_roc", auc)
        print("📈 Metrics logged to MLflow.")
    except Exception:
        print("⚠  MLflow not configured — skipping logging.")

    # ── Save bundle ───────────────────────────────────────────
    bundle = {
        "iso_forest": iso,
        "scaler": scaler,
        "feature_cols": present_cols,
        "blacklisted_devices": BLACKLISTED_DEVICES,
        "trained_at": datetime.utcnow().isoformat(),
        "auc_roc": float(auc),
        "version": "1.0.0",
    }
    joblib.dump(bundle, MODEL_FILE)
    size_kb = MODEL_FILE.stat().st_size / 1024
    print(f"\n✅ Model saved → {MODEL_FILE}  ({size_kb:.1f} KB)")


if __name__ == "__main__":
    train()

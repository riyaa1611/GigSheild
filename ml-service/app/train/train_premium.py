"""
GigShield ML Service — Premium Model Trainer (XGBoost)
Trains an XGBoost regressor on synthetic_workers.csv.

Outputs:
    app/models/premium_model.pkl  (joblib bundle with model + scaler + encoder)

Run:
    python app/train/train_premium.py
    # or from ML container:
    make ml-train-premium
"""

from __future__ import annotations

import os
import json
import joblib
import warnings
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error
from xgboost import XGBRegressor

warnings.filterwarnings("ignore")

# ── Paths ─────────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
DATA_FILE = ROOT / "data" / "synthetic_workers.csv"
MODEL_FILE = ROOT / "models" / "premium_model.pkl"
MODEL_FILE.parent.mkdir(exist_ok=True)

# ── Config ────────────────────────────────────────────────────
SEED = 42
N_CLUSTERS = 6   # KMeans clusters for lat/lng zone encoding
TARGET_COL = "truePremiumMultiplier"


# ─────────────────────────────────────────────────────────────
# Feature Engineering
# ─────────────────────────────────────────────────────────────

def build_features(df: pd.DataFrame, kmeans: KMeans | None = None,
                   le: LabelEncoder | None = None,
                   scaler: StandardScaler | None = None,
                   fit: bool = True):
    """
    Returns (X_array, kmeans, le, scaler).
    When fit=True, fits all encoders; when fit=False, applies existing ones.
    """
    df = df.copy()

    # 1. Zone cluster from lat/lng
    coords = df[["zoneLat", "zoneLng"]].values
    if fit:
        kmeans = KMeans(n_clusters=N_CLUSTERS, random_state=SEED, n_init="auto")
        kmeans.fit(coords)
    df["zone_cluster"] = kmeans.predict(coords)

    # 2. Platform label encode
    if fit:
        le = LabelEncoder()
        le.fit(df["platform"])
    df["platform_enc"] = le.transform(df["platform"])

    # 3. Monsoon flag
    df["is_monsoon"] = df["currentMonth"].isin([6, 7, 8, 9]).astype(int)

    # 4. Seasonal sin/cos cycle (captures periodic nature)
    df["month_sin"] = np.sin(2 * np.pi * df["currentMonth"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["currentMonth"] / 12)

    # 5. Claim history bucketed
    df["claim_bucket"] = pd.cut(
        df["claimHistoryCount"], bins=[-1, 0, 2, 4, 100],
        labels=[0, 1, 2, 3]
    ).astype(int)

    feature_cols = [
        "zone_cluster", "platform_enc", "avgWeeklyHours",
        "claimHistoryCount", "claim_bucket",
        "zoneRiskScore", "is_monsoon", "month_sin", "month_cos",
    ]
    X = df[feature_cols].values.astype(np.float32)

    if fit:
        scaler = StandardScaler()
        X = scaler.fit_transform(X)
    else:
        X = scaler.transform(X)

    return X, kmeans, le, scaler, feature_cols


# ─────────────────────────────────────────────────────────────
# Training
# ─────────────────────────────────────────────────────────────

def train():
    print("=" * 60)
    print(" GigShield — Premium Model Training (XGBoost)")
    print("=" * 60)

    # Generate data if missing
    if not DATA_FILE.exists():
        print(f"\n⚠  Data file not found: {DATA_FILE}")
        print("   Running synthetic_generator first…\n")
        from app.data.synthetic_generator import main as gen
        gen()

    df = pd.read_csv(DATA_FILE)
    print(f"\n📄 Loaded {len(df)} rows — "
          f"target range [{df[TARGET_COL].min():.3f}, {df[TARGET_COL].max():.3f}]")

    X, kmeans, le, scaler, feature_cols = build_features(df, fit=True)
    y = df[TARGET_COL].values.astype(np.float32)

    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.15, random_state=SEED
    )

    model = XGBRegressor(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=SEED,
        tree_method="hist",
        eval_metric="rmse",
        early_stopping_rounds=20,
        verbosity=0,
    )

    print("\n🚀 Training XGBoost regressor…")
    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        verbose=False,
    )

    # ── Metrics ───────────────────────────────────────────────
    preds_val = np.clip(model.predict(X_val), 0.70, 1.30)
    mae  = mean_absolute_error(y_val, preds_val)
    rmse = mean_squared_error(y_val, preds_val, squared=False)

    print(f"\n📊 Validation Metrics:")
    print(f"   MAE:  {mae:.4f}")
    print(f"   RMSE: {rmse:.4f}")

    # ── Feature importance ────────────────────────────────────
    importances = model.feature_importances_
    print("\n🔍 Feature Importances:")
    for name, score in sorted(zip(feature_cols, importances),
                               key=lambda x: -x[1]):
        bar = "█" * int(score * 40)
        print(f"   {name:<30} {bar} {score:.4f}")

    # ── MLflow logging (optional) ─────────────────────────────
    try:
        import mlflow
        with mlflow.start_run(run_name="premium_xgb"):
            mlflow.log_param("n_estimators", 300)
            mlflow.log_param("max_depth", 5)
            mlflow.log_param("n_clusters", N_CLUSTERS)
            mlflow.log_metric("val_mae", mae)
            mlflow.log_metric("val_rmse", rmse)
        print("\n📈 Metrics logged to MLflow.")
    except Exception:
        print("\n⚠  MLflow not configured — skipping logging.")

    # ── Save bundle ───────────────────────────────────────────
    bundle = {
        "model": model,
        "kmeans": kmeans,
        "label_encoder": le,
        "scaler": scaler,
        "feature_cols": feature_cols,
        "trained_at": datetime.utcnow().isoformat(),
        "val_mae": float(mae),
        "val_rmse": float(rmse),
        "version": "1.0.0",
    }
    joblib.dump(bundle, MODEL_FILE)
    size_kb = MODEL_FILE.stat().st_size / 1024
    print(f"\n✅ Model saved → {MODEL_FILE}  ({size_kb:.1f} KB)")


if __name__ == "__main__":
    train()

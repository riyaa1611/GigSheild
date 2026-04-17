from __future__ import annotations

import os
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error
from xgboost import XGBRegressor

ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT_DIR / "data" / "zone_history.csv"
MODEL_PATH = ROOT_DIR / "models" / "forecast_model.pkl"

FEATURE_COLUMNS = [
    "month",
    "month_sin",
    "month_cos",
    "baseRiskScore",
    "lag_trigger_1",
    "lag_trigger_2",
    "lag_severity_1",
    "lag_severity_2",
    "lag_risk_1",
    "trigger_trend",
    "severity_trend",
]


def _prepare_training_frame(df: pd.DataFrame) -> pd.DataFrame:
    data = df.copy()

    # Support both generated and curated dataset schemas.
    if "cityCluster" not in data.columns:
        if "city" in data.columns:
            data["cityCluster"] = data["city"]
        elif "city_cluster" in data.columns:
            data["cityCluster"] = data["city_cluster"]
        else:
            raise KeyError("Missing required city column (cityCluster/city/city_cluster)")

    if "triggerCount" not in data.columns and "trigger_count" in data.columns:
        data["triggerCount"] = data["trigger_count"]

    if "avgSeverity" not in data.columns and "avg_severity" in data.columns:
        data["avgSeverity"] = data["avg_severity"]

    if "baseRiskScore" not in data.columns:
        if "base_risk" in data.columns:
            data["baseRiskScore"] = data["base_risk"]
        elif "zoneRiskScore" in data.columns:
            data["baseRiskScore"] = data["zoneRiskScore"]
        else:
            data["baseRiskScore"] = data.groupby("pincode")["avgSeverity"].transform("mean")

    data["pincode"] = data["pincode"].astype(str)
    data["cityCluster"] = data["cityCluster"].astype(str).str.lower().str.strip()
    data["month"] = data["month"].astype(int)
    data["year"] = data["year"].astype(int)

    data = data.sort_values(["pincode", "year", "month"]).reset_index(drop=True)

    trigger_norm = np.clip(data["triggerCount"].astype(float) / 8.0, 0.0, 1.0)
    base_norm = np.clip(data["baseRiskScore"].astype(float) / 1.3, 0.0, 1.0)
    severity = np.clip(data["avgSeverity"].astype(float), 0.0, 1.0)

    data["riskTarget"] = np.clip(0.60 * severity + 0.30 * trigger_norm + 0.10 * base_norm, 0.0, 1.0)

    grouped = data.groupby("pincode", sort=False)
    data["lag_trigger_1"] = grouped["triggerCount"].shift(1)
    data["lag_trigger_2"] = grouped["triggerCount"].shift(2)
    data["lag_severity_1"] = grouped["avgSeverity"].shift(1)
    data["lag_severity_2"] = grouped["avgSeverity"].shift(2)
    data["lag_risk_1"] = grouped["riskTarget"].shift(1)

    data["month_sin"] = np.sin(2 * np.pi * data["month"] / 12.0)
    data["month_cos"] = np.cos(2 * np.pi * data["month"] / 12.0)

    data["trigger_trend"] = data["lag_trigger_1"] - data["lag_trigger_2"]
    data["severity_trend"] = data["lag_severity_1"] - data["lag_severity_2"]

    fill_cols = [
        "lag_trigger_1",
        "lag_trigger_2",
        "lag_severity_1",
        "lag_severity_2",
        "lag_risk_1",
        "trigger_trend",
        "severity_trend",
    ]

    for col in fill_cols:
        data[col] = data[col].astype(float)
        data[col] = data[col].fillna(data.groupby("pincode")[col].transform("median"))
        data[col] = data[col].fillna(data[col].median())

    return data


def _build_profiles(data: pd.DataFrame) -> tuple[dict, dict]:
    latest_rows = (
        data.sort_values(["year", "month"])  # already grouped/sorted, this keeps latest at the bottom
        .groupby("pincode", as_index=False)
        .tail(1)
        .reset_index(drop=True)
    )

    city_profiles: dict[str, dict] = {}
    for city, city_rows in latest_rows.groupby("cityCluster"):
        city_profiles[city] = {
            "baseRiskScore": float(city_rows["baseRiskScore"].mean()),
            "lag_trigger_1": float(city_rows["lag_trigger_1"].mean()),
            "lag_trigger_2": float(city_rows["lag_trigger_2"].mean()),
            "lag_severity_1": float(city_rows["lag_severity_1"].mean()),
            "lag_severity_2": float(city_rows["lag_severity_2"].mean()),
            "lag_risk_1": float(city_rows["lag_risk_1"].mean()),
            "trigger_trend": float(city_rows["trigger_trend"].mean()),
            "severity_trend": float(city_rows["severity_trend"].mean()),
        }

    latest_rows["prefix"] = latest_rows["pincode"].str[:3]
    prefix_profiles: dict[str, dict] = {}
    for prefix, prefix_rows in latest_rows.groupby("prefix"):
        prefix_profiles[prefix] = {
            "baseRiskScore": float(prefix_rows["baseRiskScore"].mean()),
            "lag_trigger_1": float(prefix_rows["lag_trigger_1"].mean()),
            "lag_trigger_2": float(prefix_rows["lag_trigger_2"].mean()),
            "lag_severity_1": float(prefix_rows["lag_severity_1"].mean()),
            "lag_severity_2": float(prefix_rows["lag_severity_2"].mean()),
            "lag_risk_1": float(prefix_rows["lag_risk_1"].mean()),
            "trigger_trend": float(prefix_rows["trigger_trend"].mean()),
            "severity_trend": float(prefix_rows["severity_trend"].mean()),
        }

    return city_profiles, prefix_profiles


def train() -> dict:
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Forecast training data not found: {DATA_PATH}")

    raw = pd.read_csv(DATA_PATH)
    data = _prepare_training_frame(raw)

    X = data[FEATURE_COLUMNS].astype(float)
    y = data["riskTarget"].astype(float)

    if len(data) < 40:
        raise ValueError("Forecast training dataset too small to train reliably")

    split_idx = max(1, int(len(data) * 0.8))
    X_train, X_valid = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_valid = y.iloc[:split_idx], y.iloc[split_idx:]

    model = XGBRegressor(
        n_estimators=240,
        max_depth=4,
        learning_rate=0.06,
        subsample=0.9,
        colsample_bytree=0.9,
        reg_alpha=0.1,
        reg_lambda=1.0,
        objective="reg:squarederror",
        random_state=42,
    )
    model.fit(X_train, y_train)

    if len(X_valid) > 0:
        valid_pred = np.clip(model.predict(X_valid), 0.0, 1.0)
        mae = float(mean_absolute_error(y_valid, valid_pred))
    else:
        mae = float("nan")

    city_profiles, prefix_profiles = _build_profiles(data)

    artifact = {
        "model": model,
        "feature_columns": FEATURE_COLUMNS,
        "city_profiles": city_profiles,
        "prefix_profiles": prefix_profiles,
        "model_version": "tier1_forecast_xgboost_v1",
        "metrics": {"mae": None if np.isnan(mae) else round(mae, 4)},
    }

    os.makedirs(MODEL_PATH.parent, exist_ok=True)
    joblib.dump(artifact, MODEL_PATH)

    return artifact


if __name__ == "__main__":
    artifact = train()
    print(
        "Forecast model trained:",
        artifact.get("model_version"),
        "MAE=",
        artifact.get("metrics", {}).get("mae"),
    )

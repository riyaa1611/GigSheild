import pandas as pd
import numpy as np
import joblib
import os
from pathlib import Path
from app.train.fraud_model import FraudModelWithRules


def train():
    app_dir = Path(__file__).resolve().parents[1]
    data_path = app_dir / "data" / "fraud_training.csv"
    model_path = app_dir / "models" / "fraud_model.pkl"

    os.makedirs(model_path.parent, exist_ok=True)
    df = pd.read_csv(data_path)

    # Support both legacy and generated dataset column names.
    alias_map = {
        "claimCount30days": "claimCount30d",
        "platformActiveStatus": "platformActive",
        "claimTimingVsPolicyStart": "claimTimingMinutes",
    }
    for source, target in alias_map.items():
        if source in df.columns and target not in df.columns:
            df[target] = df[source]

    features = ["gpsOffsetKm", "lastDeliveryCount", "claimTimingMinutes", "claimCount30d", "platformActive"]
    missing = [col for col in features if col not in df.columns]
    if missing:
        raise ValueError(f"Missing fraud training columns: {missing}")

    df["platformActive"] = df["platformActive"].astype(int)
    X = df[features]

    model = FraudModelWithRules()
    model.fit(X.values)

    tp = 0
    for _, row in df.iterrows():
        result = model.score_sample({
            "gpsOffsetKm": row["gpsOffsetKm"],
            "lastDeliveryCount": row["lastDeliveryCount"],
            "claimTimingMinutes": row["claimTimingMinutes"],
            "claimCount30d": row["claimCount30d"],
            "platformActive": row["platformActive"],
        })
        predicted_fraud = result[0] >= 0.5
        if predicted_fraud == bool(row["isFraud"]):
            tp += 1
    accuracy = tp / len(df)
    print(f"Fraud model accuracy: {accuracy:.4f}")

    joblib.dump(model, model_path)
    print(f"Saved: {model_path}")
    return accuracy


if __name__ == "__main__":
    train()

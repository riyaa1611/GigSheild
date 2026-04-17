import pandas as pd
import numpy as np
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error
import joblib
import os
from pathlib import Path


def train():
    app_dir = Path(__file__).resolve().parents[1]
    data_path = app_dir / "data" / "synthetic_workers.csv"
    model_dir = app_dir / "models"
    premium_model_path = model_dir / "premium_model.pkl"
    premium_encoder_path = model_dir / "premium_encoder.pkl"

    os.makedirs(model_dir, exist_ok=True)
    df = pd.read_csv(data_path)

    le_platform = LabelEncoder()
    df["platform_enc"] = le_platform.fit_transform(df["platform"])

    features = [
        "zoneRiskScore", "currentMonth", "platform_enc",
        "avgWeeklyHours", "claimHistoryCount",
    ]
    X = df[features]
    y = df["truePremiumMultiplier"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = XGBRegressor(
        n_estimators=200, max_depth=4, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8, random_state=42
    )
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    print(f"Premium model MAE: {mae:.4f}")

    joblib.dump(model, premium_model_path)
    joblib.dump(le_platform, premium_encoder_path)
    print(f"Saved: {premium_model_path}")
    return mae


if __name__ == "__main__":
    train()

"""
GigShield ML Service — Synthetic Dataset Generator
Generates three CSV files used for training the Premium, Fraud, and LSTM models.

Run:
    python -m app.data.synthetic_generator
    # or
    python app/data/synthetic_generator.py

Outputs (relative to this file's directory):
    synthetic_workers.csv  — 500 rows  (premium model training)
    zone_history.csv       — 1200 rows (50 pincodes × 24 months)
    fraud_training.csv     — 1000 rows (20% labeled fraud)
"""

from __future__ import annotations

import os
import random
import uuid
from datetime import date, timedelta
from pathlib import Path
import numpy as np
import pandas as pd

# ── reproducibility ───────────────────────────────────────────
SEED = 42
np.random.seed(SEED)
random.seed(SEED)

DATA_DIR = Path(__file__).parent


# ─────────────────────────────────────────────────────────────
# Zone catalogue — real Indian pincodes with risk profiles
# ─────────────────────────────────────────────────────────────
ZONES = [
    # (pincode, lat, lng,  base_risk, city_cluster)
    # Mumbai coastal — highest rain risk
    ("400001", 18.9388, 72.8354, 1.20, "mumbai"),
    ("400050", 19.0596, 72.8295, 1.18, "mumbai"),
    ("400070", 19.1364, 72.8266, 1.22, "mumbai"),
    ("400072", 19.1723, 72.8474, 1.15, "mumbai"),
    ("400601", 19.2183, 72.9780, 1.10, "mumbai"),
    # Delhi — AQI + curfew risk
    ("110001", 28.6329, 77.2197, 1.10, "delhi"),
    ("110020", 28.5274, 77.1914, 1.08, "delhi"),
    ("110044", 28.5081, 77.3089, 1.05, "delhi"),
    ("110092", 28.6618, 77.3064, 1.07, "delhi"),
    ("110085", 28.7041, 77.1025, 1.09, "delhi"),
    # Ahmedabad — curfew / heat
    ("380001", 23.0225, 72.5714, 0.88, "ahmedabad"),
    ("380005", 23.0352, 72.5622, 0.85, "ahmedabad"),
    ("380015", 23.0338, 72.5850, 0.90, "ahmedabad"),
    ("380052", 23.0734, 72.5168, 0.87, "ahmedabad"),
    # Bangalore — platform outage risk
    ("560001", 12.9716, 77.5946, 0.95, "bangalore"),
    ("560034", 12.9346, 77.6267, 0.92, "bangalore"),
    ("560100", 13.0358, 77.5970, 0.90, "bangalore"),
    # Chennai — cyclone + rain
    ("600001", 13.0827, 80.2707, 1.05, "chennai"),
    ("600017", 13.0435, 80.2462, 1.08, "chennai"),
    ("600040", 13.0012, 80.2565, 1.03, "chennai"),
]

PLATFORMS = ["zomato", "swiggy", "zepto", "blinkit", "amazon"]

# Platform risk deltas (industry claim data proxies)
PLATFORM_RISK = {
    "zomato": 0.02,
    "swiggy": 0.01,
    "zepto": -0.02,
    "blinkit": -0.03,
    "amazon": -0.05,
}

# Seasonal factors (Indian climate)
SEASONAL_FACTOR = {
    1: -0.10,   # Jan — dry winter
    2: -0.10,   # Feb — dry
    3: -0.05,   # Mar — pre-summer
    4:  0.00,   # Apr
    5:  0.05,   # May — start of heat
    6:  0.15,   # Jun — monsoon onset
    7:  0.18,   # Jul — peak monsoon
    8:  0.15,   # Aug — monsoon
    9:  0.10,   # Sep — tail monsoon
    10: -0.02,  # Oct — post-monsoon
    11: -0.08,  # Nov
    12: -0.10,  # Dec
}


# ─────────────────────────────────────────────────────────────
# 1. synthetic_workers.csv  (500 rows)
# ─────────────────────────────────────────────────────────────

def make_true_multiplier(
    zone_risk: float,
    month: int,
    claim_count: int,
    platform: str,
    avg_hours: float,
) -> float:
    base = 1.0
    base += (zone_risk - 1.0) * 0.40          # zone contribution (40% weight)
    base += SEASONAL_FACTOR[month] * 0.60     # seasonal (60% weight)
    base += min(claim_count * 0.03, 0.15)     # claim penalty: +0.03 per claim, cap 0.15
    base += PLATFORM_RISK[platform]
    base += (avg_hours - 40) / 500            # more hours → tiny uplift
    base += np.random.normal(0, 0.03)         # label noise
    return float(np.clip(base, 0.70, 1.30))


def generate_synthetic_workers(n: int = 500) -> pd.DataFrame:
    records = []
    for _ in range(n):
        zone = random.choice(ZONES)
        pincode, lat, lng, zone_risk, city = zone
        platform = random.choice(PLATFORMS)
        month = random.randint(1, 12)
        avg_hours = round(np.random.normal(50, 12), 1)
        avg_hours = float(np.clip(avg_hours, 10, 90))
        claim_count = int(np.random.poisson(1.2))
        claim_count = min(claim_count, 8)

        true_multiplier = make_true_multiplier(
            zone_risk, month, claim_count, platform, avg_hours
        )

        records.append({
            "userId": str(uuid.uuid4()),
            "zonePincode": pincode,
            "zoneLat": lat + np.random.uniform(-0.01, 0.01),
            "zoneLng": lng + np.random.uniform(-0.01, 0.01),
            "cityCluster": city,
            "platform": platform,
            "avgWeeklyHours": avg_hours,
            "claimHistoryCount": claim_count,
            "currentMonth": month,
            "zoneRiskScore": round(zone_risk + np.random.normal(0, 0.05), 4),
            "truePremiumMultiplier": round(true_multiplier, 4),
        })
    return pd.DataFrame(records)


# ─────────────────────────────────────────────────────────────
# 2. zone_history.csv  (50 zones × 24 months)
# ─────────────────────────────────────────────────────────────

def generate_zone_history() -> pd.DataFrame:
    records = []
    today = date.today()
    for zone in ZONES:
        pincode, lat, lng, zone_risk, city = zone
        # Also add 30 extra synthetic pincodes to get to ~50
    all_pincodes = list(ZONES) + [
        (str(600000 + i), 13.0 + i * 0.01, 80.2 + i * 0.01, 1.0, "other")
        for i in range(30)
    ]

    for pincode_entry in all_pincodes[:50]:
        pincode, lat, lng, base_risk, city = pincode_entry
        for months_back in range(24):
            ref = today - timedelta(days=months_back * 30)
            month = ref.month
            year = ref.year
            seasonal = SEASONAL_FACTOR[month]
            base_triggers = int(base_risk * 3 + seasonal * 4)
            trigger_count = max(0, int(np.random.poisson(max(base_triggers, 0))))
            avg_severity = float(np.clip(
                base_risk * 0.5 + seasonal * 0.3 + np.random.normal(0, 0.1),
                0.0, 1.0
            ))
            records.append({
                "pincode": pincode,
                "month": month,
                "year": year,
                "cityCluster": city,
                "zoneLat": lat,
                "zoneLng": lng,
                "triggerCount": trigger_count,
                "avgSeverity": round(avg_severity, 4),
                "baseRiskScore": zone_risk if pincode_entry in ZONES else 1.0,
            })
    return pd.DataFrame(records)


# ─────────────────────────────────────────────────────────────
# 3. fraud_training.csv  (1000 rows, ~20% fraud)
# ─────────────────────────────────────────────────────────────

BLACKLISTED_DEVICES = {"fp_fraud_001", "fp_fraud_002", "fp_fraud_003"}


def generate_fraud_training(n: int = 1000, fraud_rate: float = 0.20) -> pd.DataFrame:
    records = []
    n_fraud = int(n * fraud_rate)
    n_clean = n - n_fraud

    # ── Clean samples ─────────────────────────────────────────
    for _ in range(n_clean):
        zone = random.choice(ZONES)
        pincode = zone[0]
        records.append({
            "userId": str(uuid.uuid4()),
            "triggerId": str(uuid.uuid4()),
            # GPS within 5 km of trigger zone
            "gpsOffsetKm": round(abs(np.random.normal(1.5, 1.0)), 2),
            "deviceFingerprint": f"fp_{uuid.uuid4().hex[:8]}",
            "claimCount30days": int(np.random.poisson(0.8)),
            "platformActiveStatus": int(random.random() > 0.1),   # 90% active
            "claimTimingVsPolicyStart": int(np.random.uniform(500, 10000)),
            "lastDeliveryCount": int(np.random.poisson(3) + 1),    # always > 0
            "deviceClusterSize": 1,    # one account per device
            "isRepeatPattern": 0,
            "isFraud": 0,
        })

    # ── Fraud samples ─────────────────────────────────────────
    fraud_patterns = [
        # Pattern A: GPS far off (> 50km from trigger zone)
        lambda: {
            "gpsOffsetKm": round(np.random.uniform(55, 150), 2),
            "platformActiveStatus": random.randint(0, 1),
            "claimCount30days": random.randint(0, 2),
            "lastDeliveryCount": random.randint(0, 5),
            "claimTimingVsPolicyStart": int(np.random.uniform(2000, 8000)),
            "deviceClusterSize": 1, "isRepeatPattern": 0,
        },
        # Pattern B: Zero deliveries + claim
        lambda: {
            "gpsOffsetKm": round(abs(np.random.normal(2.0, 1.5)), 2),
            "platformActiveStatus": 0,
            "claimCount30days": random.randint(4, 8),
            "lastDeliveryCount": 0,
            "claimTimingVsPolicyStart": int(np.random.uniform(100, 300)),
            "deviceClusterSize": 1, "isRepeatPattern": 1,
        },
        # Pattern C: Same device for 3+ accounts
        lambda: {
            "gpsOffsetKm": round(abs(np.random.normal(3.0, 2.0)), 2),
            "platformActiveStatus": random.randint(0, 1),
            "claimCount30days": random.randint(2, 6),
            "lastDeliveryCount": random.randint(0, 3),
            "claimTimingVsPolicyStart": int(np.random.uniform(300, 5000)),
            "deviceClusterSize": random.randint(3, 6),
            "isRepeatPattern": 1,
        },
        # Pattern D: Claim within 60 min of policy start
        lambda: {
            "gpsOffsetKm": round(abs(np.random.normal(2.0, 2.0)), 2),
            "platformActiveStatus": random.randint(0, 1),
            "claimCount30days": random.randint(0, 3),
            "lastDeliveryCount": random.randint(0, 2),
            "claimTimingVsPolicyStart": random.randint(10, 59),
            "deviceClusterSize": 1, "isRepeatPattern": 0,
        },
    ]
    for i in range(n_fraud):
        pattern_fn = random.choice(fraud_patterns)
        pattern = pattern_fn()
        fp_key = random.choice(list(BLACKLISTED_DEVICES)) if i < 5 else f"fp_{uuid.uuid4().hex[:8]}"
        records.append({
            "userId": str(uuid.uuid4()),
            "triggerId": str(uuid.uuid4()),
            "deviceFingerprint": fp_key,
            "isFraud": 1,
            **pattern,
        })

    df = pd.DataFrame(records).sample(frac=1, random_state=SEED).reset_index(drop=True)
    return df


# ─────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────

def main():
    print("📊 Generating synthetic datasets for GigShield ML models…\n")

    print("  [1/3] synthetic_workers.csv (500 rows)…")
    df_workers = generate_synthetic_workers(500)
    df_workers.to_csv(DATA_DIR / "synthetic_workers.csv", index=False)
    print(f"       Saved — multiplier range: "
          f"[{df_workers.truePremiumMultiplier.min():.3f}, "
          f"{df_workers.truePremiumMultiplier.max():.3f}]")

    print("  [2/3] zone_history.csv (50 zones × 24 months)…")
    df_zones = generate_zone_history()
    df_zones.to_csv(DATA_DIR / "zone_history.csv", index=False)
    print(f"       Saved — {len(df_zones)} rows")

    print("  [3/3] fraud_training.csv (1000 rows, ~20% fraud)…")
    df_fraud = generate_fraud_training(1000)
    df_fraud.to_csv(DATA_DIR / "fraud_training.csv", index=False)
    fraud_pct = df_fraud.isFraud.mean() * 100
    print(f"       Saved — fraud rate: {fraud_pct:.1f}%")

    print("\n✅ All datasets generated successfully in:", DATA_DIR)


if __name__ == "__main__":
    main()

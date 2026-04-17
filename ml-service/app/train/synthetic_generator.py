import pandas as pd
import numpy as np
import os
from pathlib import Path

np.random.seed(42)

ZONES = [
    {"pincode": "400070", "city": "Mumbai", "lat": 19.076, "lng": 72.877, "base_risk": 0.85},
    {"pincode": "400001", "city": "Mumbai South", "lat": 18.938, "lng": 72.835, "base_risk": 0.80},
    {"pincode": "110001", "city": "Delhi", "lat": 28.704, "lng": 77.102, "base_risk": 0.72},
    {"pincode": "380015", "city": "Ahmedabad", "lat": 23.022, "lng": 72.571, "base_risk": 0.60},
    {"pincode": "560001", "city": "Bangalore", "lat": 12.971, "lng": 77.594, "base_risk": 0.55},
    {"pincode": "600001", "city": "Chennai", "lat": 13.082, "lng": 80.270, "base_risk": 0.65},
    {"pincode": "411001", "city": "Pune", "lat": 18.520, "lng": 73.856, "base_risk": 0.50},
    {"pincode": "700001", "city": "Kolkata", "lat": 22.572, "lng": 88.363, "base_risk": 0.58},
    {"pincode": "500001", "city": "Hyderabad", "lat": 17.385, "lng": 78.486, "base_risk": 0.52},
]

PLATFORMS = ["zomato", "swiggy", "zepto", "blinkit", "amazon"]

def generate_synthetic_workers(n=500):
    rows = []
    for i in range(n):
        zone = ZONES[i % len(ZONES)]
        month = np.random.randint(1, 13)
        seasonal = 0.15 if 6 <= month <= 9 else (-0.08 if month in [12, 1, 2] else 0)
        claims = np.random.randint(0, 8)
        loyalty = -0.05 if claims == 0 else (0.05 if claims > 5 else 0)
        hours = np.random.uniform(35, 75)
        hours_factor = 0.05 if hours > 60 else (-0.05 if hours < 40 else 0)
        raw = 0.85 + zone["base_risk"] * 0.3 + seasonal + loyalty + hours_factor
        multiplier = max(0.7, min(1.3, raw + np.random.normal(0, 0.03)))
        rows.append({
            "userId": f"user_{i:04d}",
            "zonePincode": zone["pincode"],
            "zoneCity": zone["city"],
            "zoneLat": zone["lat"] + np.random.normal(0, 0.01),
            "zoneLng": zone["lng"] + np.random.normal(0, 0.01),
            "zoneRiskScore": zone["base_risk"],
            "platform": np.random.choice(PLATFORMS),
            "avgWeeklyHours": round(hours, 1),
            "claimHistoryCount": claims,
            "currentMonth": month,
            "truePremiumMultiplier": round(multiplier, 3),
        })
    return pd.DataFrame(rows)

def generate_fraud_data(n=1000):
    rows = []
    for i in range(n):
        is_fraud = np.random.random() < 0.20
        if is_fraud:
            pattern = np.random.choice(["gps_spoof", "zero_delivery", "cluster", "temporal", "repeat"])
            gps_off = 60 + np.random.exponential(30) if pattern == "gps_spoof" else np.random.uniform(0, 3)
            deliveries = 0 if pattern in ["zero_delivery", "cluster"] else np.random.randint(1, 10)
            claim_timing = np.random.randint(5, 50) if pattern == "temporal" else np.random.randint(200, 5000)
            claim_count = np.random.randint(6, 15) if pattern == "repeat" else np.random.randint(0, 4)
            platform_active = False if pattern in ["zero_delivery", "cluster"] else True
            fraud_score = 0.75 + np.random.uniform(0, 0.25)
        else:
            gps_off = np.random.uniform(0, 2)
            deliveries = np.random.randint(1, 15)
            claim_timing = np.random.randint(500, 10000)
            claim_count = np.random.randint(0, 3)
            platform_active = True
            fraud_score = np.random.uniform(0, 0.25)
            pattern = "none"

        rows.append({
            "gpsOffsetKm": round(gps_off, 2),
            "lastDeliveryCount": deliveries,
            "claimTimingMinutes": claim_timing,
            "claimCount30d": claim_count,
            "platformActive": int(platform_active),
            "isFraud": int(is_fraud),
            "fraudPattern": pattern,
            "fraudScore": round(fraud_score, 3),
        })
    return pd.DataFrame(rows)

def generate_zone_history():
    rows = []
    for zone in ZONES:
        for year in [2023, 2024]:
            for month in range(1, 13):
                base = zone["base_risk"]
                seasonal = 0.3 if 6 <= month <= 9 else (0.1 if month in [10, 11] else 0)
                count = int(np.random.poisson(max(0, (base + seasonal) * 8)))
                rows.append({
                    "pincode": zone["pincode"],
                    "city": zone["city"],
                    "year": year,
                    "month": month,
                    "triggerCount": count,
                    "avgSeverity": round(base + seasonal + np.random.normal(0, 0.05), 3),
                })
    return pd.DataFrame(rows)

if __name__ == "__main__":
    app_dir = Path(__file__).resolve().parents[1]
    data_dir = app_dir / "data"
    os.makedirs(data_dir, exist_ok=True)

    workers = generate_synthetic_workers(500)
    workers.to_csv(data_dir / "synthetic_workers.csv", index=False)
    print(f"Generated {len(workers)} worker records")

    fraud = generate_fraud_data(1000)
    fraud.to_csv(data_dir / "fraud_training.csv", index=False)
    print(f"Generated {len(fraud)} fraud records")

    history = generate_zone_history()
    history.to_csv(data_dir / "zone_history.csv", index=False)
    print(f"Generated {len(history)} zone history records")

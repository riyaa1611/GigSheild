from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.schemas.schemas import PremiumRequest, PremiumResponse, FraudCheckRequest, FraudCheckResponse
from app.models.premium_model import PremiumCalculator
from app.models.fraud_detector import FraudDetector
import json
import os

app = FastAPI(
    title="GigShield ML Service",
    description="Dynamic premium calculation and fraud detection for parametric income insurance",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

premium_calc = PremiumCalculator()
fraud_detector = FraudDetector()


@app.get("/health")
def health():
    return {"status": "ok", "service": "gigshield-ml"}


@app.post("/premium/calculate", response_model=PremiumResponse)
def calculate_premium(req: PremiumRequest):
    try:
        result = premium_calc.calculate(
            zone_id=req.zone_id,
            zone_name=req.zone_name,
            weekly_income=req.weekly_income,
            platform=req.platform,
            calculation_date=req.calculation_date
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/fraud/check", response_model=FraudCheckResponse)
def check_fraud(req: FraudCheckRequest):
    try:
        result = fraud_detector.run_full_check(
            zone_name=req.zone_name,
            declared_income=req.declared_income,
            claim_dates=req.claim_dates,
            registered_zone_id=req.registered_zone_id,
            disruption_zone_id=req.disruption_zone_id
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/risk/zones")
def get_zone_risks():
    data_path = os.path.join(os.path.dirname(__file__), 'data/zone_risk_data.json')
    with open(data_path) as f:
        data = json.load(f)
    return data

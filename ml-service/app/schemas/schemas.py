from pydantic import BaseModel
from typing import List, Optional
from datetime import date


class PremiumRequest(BaseModel):
    zone_id: int
    zone_name: str
    weekly_income: float
    platform: str  # zomato/swiggy/both
    calculation_date: Optional[date] = None


class PremiumResponse(BaseModel):
    weekly_premium_inr: int
    coverage_amount_inr: float
    breakdown: dict
    explanation: str


class FraudCheckRequest(BaseModel):
    zone_name: str
    declared_income: float
    claim_dates: List[str]  # ISO format dates
    registered_zone_id: int
    disruption_zone_id: int


class FraudCheckResponse(BaseModel):
    is_flagged: bool
    flags: List[str]
    income_check: dict
    velocity_check: dict
    zone_check: dict


class ZoneRiskResponse(BaseModel):
    zones: List[dict]

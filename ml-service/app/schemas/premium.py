from pydantic import BaseModel
from typing import Optional, List, Dict


class PremiumRequest(BaseModel):
    userId: str
    zonePincode: str
    zoneLat: Optional[float] = 19.0760
    zoneLng: Optional[float] = 72.8777
    platform: Optional[str] = "zomato"
    avgWeeklyHours: Optional[float] = 56.0
    claimHistoryCount: Optional[int] = 0
    currentMonth: Optional[int] = None
    zoneRiskScore: Optional[float] = 0.5


class PlanAdjustment(BaseModel):
    planId: str
    basePremium: int
    adjustedPremium: int
    multiplier: float


class PremiumResponse(BaseModel):
    multiplier: float
    adjustedPlans: List[PlanAdjustment]
    breakdown: Dict[str, str]
    zone: str
    modelVersion: Optional[str] = None

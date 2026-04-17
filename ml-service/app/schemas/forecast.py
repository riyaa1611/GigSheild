from pydantic import BaseModel
from typing import List, Optional


class ForecastDay(BaseModel):
    date: str
    riskScore: float
    riskLevel: str


class ForecastResponse(BaseModel):
    zone: str
    city: Optional[str] = None
    forecastDays: List[ForecastDay]
    peakRiskDay: str
    recommendedPlan: str
    confidence: float
    modelVersion: Optional[str] = None

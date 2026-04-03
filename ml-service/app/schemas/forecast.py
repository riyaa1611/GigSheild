"""
GigShield ML Service — Disruption Forecast Schemas
"""

from __future__ import annotations
from typing import List, Literal
from pydantic import BaseModel, Field


class DailyForecast(BaseModel):
    date: str = Field(..., description="ISO date string YYYY-MM-DD")
    riskScore: float = Field(..., ge=0.0, le=1.0)
    riskLevel: Literal["low", "moderate", "high", "critical"]
    dominantTriggerType: str = Field(
        default="unknown",
        description="Most likely trigger type for this day (T-01 … T-07)"
    )


class ForecastResponse(BaseModel):
    zone: str = Field(..., description="Pincode for which forecast was generated")
    forecastDays: List[DailyForecast]
    peakRiskDay: str = Field(..., description="ISO date of highest predicted risk")
    peakRiskScore: float = Field(..., ge=0.0, le=1.0)
    recommendedPlan: Literal["basic", "pro", "ultra"] = Field(
        ...,
        description="Plan upgrade recommendation based on risk level"
    )
    modelType: Literal["lstm", "heuristic"] = Field(
        default="heuristic",
        description="'lstm' if PyTorch model loaded, else 'heuristic' fallback"
    )

    model_config = {"json_schema_extra": {
        "example": {
            "zone": "400070",
            "forecastDays": [
                {"date": "2026-04-04", "riskScore": 0.72, "riskLevel": "high",
                 "dominantTriggerType": "T-01"},
                {"date": "2026-04-05", "riskScore": 0.55, "riskLevel": "moderate",
                 "dominantTriggerType": "T-01"},
            ],
            "peakRiskDay": "2026-04-04",
            "peakRiskScore": 0.72,
            "recommendedPlan": "ultra",
            "modelType": "heuristic",
        }
    }}

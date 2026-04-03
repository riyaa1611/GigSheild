"""
GigShield ML Service — Premium Pricing Schemas
"""

from __future__ import annotations
from typing import Literal
from pydantic import BaseModel, Field, field_validator


class PremiumRequest(BaseModel):
    userId: str = Field(..., description="Worker UUID")
    zonePincode: str = Field(..., min_length=5, max_length=10)
    zoneLat: float = Field(..., ge=-90.0, le=90.0)
    zoneLng: float = Field(..., ge=-180.0, le=180.0)
    platform: Literal["zomato", "swiggy", "zepto", "blinkit", "amazon"]
    avgWeeklyHours: float = Field(..., ge=0, le=120)
    claimHistoryCount: int = Field(..., ge=0)
    currentMonth: int = Field(..., ge=1, le=12, description="1=Jan … 12=Dec")
    zoneRiskScore: float = Field(
        ..., ge=0.0, le=5.0,
        description="Historical disruption frequency index for this pincode"
    )

    model_config = {"json_schema_extra": {
        "example": {
            "userId": "a1000000-0000-0000-0000-000000000001",
            "zonePincode": "400070",
            "zoneLat": 19.1364,
            "zoneLng": 72.8266,
            "platform": "zomato",
            "avgWeeklyHours": 56,
            "claimHistoryCount": 2,
            "currentMonth": 7,
            "zoneRiskScore": 1.2,
        }
    }}


class PremiumBreakdown(BaseModel):
    zoneRisk: float = Field(..., description="Zone-driven multiplier delta")
    seasonal: float = Field(..., description="Seasonal factor delta")
    claimHistory: float = Field(..., description="Claim-history penalty/bonus delta")
    platformRisk: float = Field(..., description="Platform-specific risk delta")


class PremiumResponse(BaseModel):
    multiplier: float = Field(
        ..., ge=0.7, le=1.3,
        description="Final ML multiplier clamped to [0.7, 1.3]"
    )
    adjustedPremium: dict = Field(
        ...,
        description="Adjusted weekly premiums: {basic, pro, ultra} in INR"
    )
    breakdown: PremiumBreakdown
    confidence: float = Field(
        default=0.85, ge=0.0, le=1.0,
        description="Model confidence score"
    )

    model_config = {"json_schema_extra": {
        "example": {
            "multiplier": 1.15,
            "adjustedPremium": {"basic": 33, "pro": 56, "ultra": 91},
            "breakdown": {
                "zoneRisk": 0.20, "seasonal": 0.10,
                "claimHistory": 0.05, "platformRisk": -0.05
            },
            "confidence": 0.88
        }
    }}

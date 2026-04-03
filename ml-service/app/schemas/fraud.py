"""
GigShield ML Service — Fraud Detection Schemas
"""

from __future__ import annotations
from typing import List, Literal
from pydantic import BaseModel, Field


class FraudRequest(BaseModel):
    userId: str = Field(..., description="Worker UUID")
    triggerId: str = Field(..., description="Trigger UUID that spawned the claim")
    gpsLat: float = Field(..., ge=-90.0, le=90.0, description="GPS lat at claim time")
    gpsLng: float = Field(..., ge=-180.0, le=180.0, description="GPS lng at claim time")
    triggerZonePincode: str = Field(..., min_length=5, max_length=10)
    deviceFingerprint: str = Field(..., description="Hashed device ID")
    claimCount30days: int = Field(
        ..., ge=0,
        description="Number of claims the worker has filed in the past 30 days"
    )
    platformActiveStatus: bool = Field(
        ...,
        description="Whether the platform API shows the worker as active/online"
    )
    claimTimingVsPolicyStart: int = Field(
        ..., ge=0,
        description="Minutes elapsed since this policy was first activated"
    )
    lastDeliveryCount: int = Field(
        ..., ge=0,
        description="Number of deliveries completed in the last 2 hours per platform API"
    )

    model_config = {"json_schema_extra": {
        "example": {
            "userId": "a1000000-0000-0000-0000-000000000001",
            "triggerId": "c1000000-0000-0000-0000-000000000001",
            "gpsLat": 19.1364,
            "gpsLng": 72.8266,
            "triggerZonePincode": "400070",
            "deviceFingerprint": "fp_abc123",
            "claimCount30days": 1,
            "platformActiveStatus": True,
            "claimTimingVsPolicyStart": 2880,
            "lastDeliveryCount": 4,
        }
    }}


class FraudResponse(BaseModel):
    fraudScore: float = Field(
        ..., ge=0.0, le=1.0,
        description="Final blended fraud score: 0 = clean, 1 = definite fraud"
    )
    decision: Literal["auto_approve", "secondary_check", "manual_review"] = Field(
        ...,
        description=(
            "auto_approve: score<0.3 | "
            "secondary_check: 0.3–0.7 | "
            "manual_review: >0.7"
        )
    )
    flags: List[str] = Field(
        default_factory=list,
        description="Human-readable list of triggered fraud signals"
    )
    ruleOverride: bool = Field(
        default=False,
        description="True when a hard rule (blacklisted device etc.) forces score=1.0"
    )
    modelScore: float = Field(
        ..., ge=0.0, le=1.0,
        description="Raw Isolation Forest model output before blending"
    )
    ruleScore: float = Field(
        ..., ge=0.0, le=1.0,
        description="Rule-engine score before blending"
    )

    model_config = {"json_schema_extra": {
        "example": {
            "fraudScore": 0.08,
            "decision": "auto_approve",
            "flags": [],
            "ruleOverride": False,
            "modelScore": 0.10,
            "ruleScore": 0.05,
        }
    }}

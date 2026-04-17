from pydantic import BaseModel
from typing import List, Optional, Literal


class FraudRequest(BaseModel):
    userId: str
    triggerId: str
    gpsOffsetKm: Optional[float] = None
    gpsLat: Optional[float] = 0.0
    gpsLng: Optional[float] = 0.0
    triggerZonePincode: str
    deviceFingerprint: Optional[str] = "unknown"
    claimCount30days: Optional[int] = 0
    platformActiveStatus: Optional[bool] = True
    claimTimingVsPolicyStart: Optional[int] = 1440
    lastDeliveryCount: Optional[int] = 5


class FraudResponse(BaseModel):
    fraudScore: float
    decision: Literal["auto_approve", "secondary_check", "manual_review"]
    flags: List[str]
    ruleOverride: bool
    modelVersion: Optional[str] = None

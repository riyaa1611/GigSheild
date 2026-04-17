import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


class FraudModelWithRules:
    def __init__(self):
        self.iso = None
        self.scaler = None
        self.model_version = "isolation_forest_v1"

    def fit(self, x_values):
        self.scaler = StandardScaler()
        x_scaled = self.scaler.fit_transform(x_values)
        self.iso = IsolationForest(contamination=0.20, random_state=42, n_estimators=200)
        self.iso.fit(x_scaled)

    def score_sample(self, features: dict) -> tuple[float, list[str]]:
        rule_score = 0.0
        flags = []

        gps_offset = features.get("gpsOffsetKm", 0)
        deliveries = features.get("lastDeliveryCount", 5)
        timing = features.get("claimTimingMinutes", 5000)
        claim_count = features.get("claimCount30d", 0)
        platform_active = features.get("platformActive", True)

        if gps_offset > 10:
            rule_score += 0.4
            flags.append("gps_mismatch")
        if deliveries == 0 and not platform_active:
            rule_score += 0.35
            flags.append("zero_deliveries")
        if timing < 60:
            rule_score += 0.3
            flags.append("new_policy_claim")
        if claim_count > 5:
            rule_score += 0.2
            flags.append("repeat_pattern")

        x_values = np.array([[gps_offset, deliveries, timing, claim_count, int(platform_active)]])
        x_scaled = self.scaler.transform(x_values)
        iso_score = -self.iso.score_samples(x_scaled)[0]
        model_score = min(0.5, max(0, (iso_score - 0.1) * 2))

        final = 0.4 * rule_score + 0.6 * model_score
        return min(1.0, round(final, 3)), flags

    def predict(self, features: dict):
        score, flags = self.score_sample(features)
        if score < 0.3:
            decision = "auto_approve"
        elif score < 0.7:
            decision = "secondary_check"
        else:
            decision = "manual_review"
        return {
            "fraudScore": score,
            "decision": decision,
            "flags": flags,
            "ruleOverride": score >= 0.7,
            "modelVersion": self.model_version,
        }

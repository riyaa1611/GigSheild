"""
GigShield ML Service — Fraud Rules Engine
"""

from typing import List, Tuple
import numpy as np

# Hard-blacklisted device fingerprints (shared across training and inference)
BLACKLISTED_DEVICES = {"fp_fraud_001", "fp_fraud_002", "fp_fraud_003"}

class RuleBasedOverride:
    """
    Deterministic rule engine that runs BEFORE the Isolation Forest.
    Rules are additive: scores accumulate, then normalised to [0, 1].
    A hard-override (blacklisted device) sets score = 1.0 immediately.
    """

    RULES = [
        # (description, condition_fn, score_delta, is_hard_override)
        ("blacklisted_device",
         lambda r, _fp: _fp in BLACKLISTED_DEVICES,
         1.0, True),

        ("claim_within_60min_of_policy_start",
         lambda r, _fp: r.get("claimTimingVsPolicyStart", 9999) < 60,
         0.35, False),

        ("zero_deliveries_with_multiple_claims",
         lambda r, _fp: (r.get("lastDeliveryCount", 1) == 0
                         and r.get("claimCount30days", 0) > 3),
         0.40, False),

        ("gps_far_from_trigger_zone",
         lambda r, _fp: r.get("gpsOffsetKm", 0) > 50,
         0.35, False),

        ("high_claim_frequency",
         lambda r, _fp: r.get("claimCount30days", 0) > 5,
         0.20, False),

        ("device_used_by_multiple_accounts",
         lambda r, _fp: r.get("deviceClusterSize", 1) >= 3,
         0.30, False),

        ("platform_inactive_at_claim",
         lambda r, _fp: not r.get("platformActiveStatus", True),
         0.10, False),
    ]

    def score(self, record: dict, device_fp: str) -> Tuple[float, List[str], bool]:
        """
        Returns (rule_score [0-1], triggered_flags, hard_override_triggered).
        """
        total = 0.0
        flags: List[str] = []
        hard_override = False

        for name, condition, delta, is_hard in self.RULES:
            try:
                triggered = condition(record, device_fp)
            except Exception:
                triggered = False

            if triggered:
                flags.append(name)
                if is_hard:
                    hard_override = True
                    return 1.0, flags, True   # instant hard override
                total += delta

        rule_score = float(np.clip(total, 0.0, 1.0))
        return rule_score, flags, hard_override

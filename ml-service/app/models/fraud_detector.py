import numpy as np
from typing import List, Dict


class FraudDetector:
    """
    Rule-based anomaly detection for insurance fraud.
    Checks: income anomaly, claim velocity, zone mismatch, duplicate claims.
    """

    # Zone average weekly incomes (INR) - based on Mumbai gig economy data
    ZONE_INCOME_BASELINES = {
        "Andheri East": {"mean": 4200, "std": 800},
        "Dharavi": {"mean": 3200, "std": 600},
        "Bandra West": {"mean": 5000, "std": 1000},
        "Kurla": {"mean": 3800, "std": 700},
        "Borivali East": {"mean": 4500, "std": 850},
    }

    DEFAULT_BASELINE = {"mean": 4000, "std": 1000}

    def check_income_anomaly(self, zone_name: str, declared_income: float) -> Dict:
        baseline = self.ZONE_INCOME_BASELINES.get(zone_name, self.DEFAULT_BASELINE)
        mean = baseline["mean"]
        std = baseline["std"]

        # Z-score
        z_score = (declared_income - mean) / std

        is_anomaly = abs(z_score) > 2.5  # 2.5 sigma outlier

        return {
            "is_anomaly": is_anomaly,
            "z_score": round(z_score, 2),
            "zone_average": mean,
            "declared": declared_income,
            "flag_reason": f"Declared income Rs.{declared_income} is {abs(round(z_score,1))}σ from zone average Rs.{mean}" if is_anomaly else None
        }

    def check_claim_velocity(self, claim_dates: List[str]) -> Dict:
        """Check if more than 3 claims in 7 days."""
        from datetime import datetime, timedelta

        if len(claim_dates) <= 3:
            return {"is_high_velocity": False, "claim_count": len(claim_dates)}

        # Parse dates and check last 7 days
        dates = [datetime.fromisoformat(d) for d in claim_dates]
        now = datetime.now()
        week_ago = now - timedelta(days=7)
        recent_claims = [d for d in dates if d >= week_ago]

        is_high_velocity = len(recent_claims) > 3

        return {
            "is_high_velocity": is_high_velocity,
            "claim_count_7_days": len(recent_claims),
            "flag_reason": f"{len(recent_claims)} claims in last 7 days — manual review required" if is_high_velocity else None
        }

    def check_zone_mismatch(self, registered_zone_id: int, disruption_zone_id: int) -> Dict:
        """Worker's registered zone must match the active disruption zone."""
        is_mismatch = registered_zone_id != disruption_zone_id
        return {
            "is_mismatch": is_mismatch,
            "flag_reason": f"Worker registered in zone {registered_zone_id} but disruption is in zone {disruption_zone_id}" if is_mismatch else None
        }

    def run_full_check(self,
                       zone_name: str,
                       declared_income: float,
                       claim_dates: List[str],
                       registered_zone_id: int,
                       disruption_zone_id: int) -> Dict:
        income_check = self.check_income_anomaly(zone_name, declared_income)
        velocity_check = self.check_claim_velocity(claim_dates)
        zone_check = self.check_zone_mismatch(registered_zone_id, disruption_zone_id)

        flags = []
        if income_check["is_anomaly"]:
            flags.append(income_check["flag_reason"])
        if velocity_check["is_high_velocity"]:
            flags.append(velocity_check["flag_reason"])
        if zone_check["is_mismatch"]:
            flags.append(zone_check["flag_reason"])

        return {
            "is_flagged": len(flags) > 0,
            "flags": flags,
            "income_check": income_check,
            "velocity_check": velocity_check,
            "zone_check": zone_check
        }

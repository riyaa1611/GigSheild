from datetime import date
import json
import os


class PremiumCalculator:
    """
    Rule-based dynamic premium calculator.

    Premium = base_zone_premium
            x income_multiplier
            x seasonal_multiplier
            x platform_multiplier

    Range: Rs.25 - Rs.80/week
    """

    def __init__(self):
        # Load zone risk data
        data_path = os.path.join(os.path.dirname(__file__), '../data/zone_risk_data.json')
        with open(data_path) as f:
            data = json.load(f)
        self.zones = {z['id']: z for z in data['zones']}
        self.zone_by_name = {z['name']: z for z in data['zones']}

    def calculate(self, zone_id: int, zone_name: str, weekly_income: float,
                  platform: str, calculation_date: date = None) -> dict:
        if calculation_date is None:
            calculation_date = date.today()

        # Get zone data
        zone = self.zones.get(zone_id) or self.zone_by_name.get(zone_name)
        if not zone:
            zone = {"base_premium_inr": 45, "monsoon_multiplier": 1.3, "risk_level": "medium"}

        base_premium = zone['base_premium_inr']

        # Income multiplier: higher income = slightly higher premium (more to protect)
        # Normalized around Rs.4000/week baseline
        income_multiplier = 0.8 + (weekly_income / 4000) * 0.4
        income_multiplier = max(0.7, min(1.5, income_multiplier))

        # Seasonal multiplier: monsoon season June-October
        month = calculation_date.month
        is_monsoon = 6 <= month <= 10
        seasonal_multiplier = zone['monsoon_multiplier'] if is_monsoon else 1.0

        # Platform multiplier: both platforms = slightly higher (more hours worked = more exposure)
        platform_multiplier = 1.1 if platform == 'both' else 1.0

        raw_premium = base_premium * income_multiplier * seasonal_multiplier * platform_multiplier

        # Clamp to Rs.25-Rs.80 range
        final_premium = round(max(25, min(80, raw_premium)), 0)

        # Coverage amount = declared weekly income
        coverage_amount = weekly_income

        # Breakdown for transparency (to explain to worker)
        breakdown = {
            "base_zone_premium": base_premium,
            "zone_risk_level": zone.get('risk_level', 'medium'),
            "income_adjustment": round((income_multiplier - 1) * 100, 1),
            "seasonal_adjustment": round((seasonal_multiplier - 1) * 100, 1),
            "is_monsoon_season": is_monsoon,
            "platform_adjustment": round((platform_multiplier - 1) * 100, 1),
        }

        return {
            "weekly_premium_inr": int(final_premium),
            "coverage_amount_inr": coverage_amount,
            "breakdown": breakdown,
            "explanation": self._generate_explanation(zone, is_monsoon, final_premium, weekly_income)
        }

    def _generate_explanation(self, zone, is_monsoon, premium, income):
        risk = zone.get('risk_level', 'medium')
        season = "monsoon season (higher risk)" if is_monsoon else "off-season"
        return (f"Your zone has {risk} flood/weather risk. "
                f"It's currently {season}. "
                f"Weekly premium Rs.{int(premium)} covers Rs.{income} income.")

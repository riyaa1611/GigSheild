import { useState, useEffect } from "react";
import { computeRisk } from "../lib/riskEngine";

/**
 * usePremiumPreview  (v2 — local risk engine, no Supabase edge-function call)
 *
 * Replaces the previous version that called `predict-premium` via Supabase.
 * All computation is now done deterministically in the browser using the
 * 15-year historical dataset in /public/gigshield_risk_data.txt.
 *
 * The returned shape is identical to before so RiskProfilingScreen and
 * SelectPlanScreen need zero changes.
 */
export function usePremiumPreview(user, session) {
  const [multiplier, setMultiplier]       = useState(1.0);
  const [adjustedPlans, setAdjustedPlans] = useState(null);
  const [breakdown, setBreakdown]         = useState(null);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    // We no longer require a session token — the engine is fully local.
    // But we still wait for `user` to be available so we have city/platform data.
    fetchPreview();
  }, [user?.zone_city, user?.platform_type]);

  async function fetchPreview() {
    setLoading(true);
    try {
      const result = await computeRisk({
        city:              user?.zone_city            ?? "Mumbai",
        platform:          user?.platform_type        ?? "zomato",
        avgWeeklyHours:    user?.declared_weekly_hours ?? 56,
        claimHistoryCount: user?.claims_count          ?? 0,
        currentMonth:      new Date().getMonth() + 1,
      });

      setMultiplier(result.multiplier);
      setAdjustedPlans(result.adjustedPlans);
      setBreakdown(result.breakdown);
    } catch (err) {
      console.error("[usePremiumPreview] Local engine failed:", err);
      // Graceful fallback to flat base premiums
      setAdjustedPlans([
        { planId: "basic", basePremium: 29, adjustedPremium: 29, multiplier: 1.0 },
        { planId: "pro",   basePremium: 49, adjustedPremium: 49, multiplier: 1.0 },
        { planId: "ultra", basePremium: 79, adjustedPremium: 79, multiplier: 1.0 },
      ]);
      setBreakdown({
        summary: "Risk data temporarily unavailable — standard rates applied.",
      });
    }
    setLoading(false);
  }

  function getAdjustedPremium(planId) {
    if (!adjustedPlans) return null;
    return adjustedPlans.find((p) => p.planId === planId)?.adjustedPremium ?? null;
  }

  return { multiplier, adjustedPlans, breakdown, loading, getAdjustedPremium };
}

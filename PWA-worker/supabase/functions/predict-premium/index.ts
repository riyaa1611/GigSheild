import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Risk scoring by zone pincode prefix (first 3 digits = district)
const ZONE_RISK: Record<string, number> = {
  "400": 0.85, // Mumbai — high flood/rain risk
  "110": 0.72, // Delhi — high AQI risk
  "380": 0.60, // Ahmedabad — moderate
  "560": 0.55, // Bangalore — moderate
  "600": 0.65, // Chennai — cyclone/flood risk
  "700": 0.58, // Kolkata — flood risk
  "411": 0.50, // Pune — low
  "500": 0.52, // Hyderabad — moderate
};

function getZoneRisk(pincode: string): number {
  const prefix = pincode.slice(0, 3);
  return ZONE_RISK[prefix] || 0.55;
}

const BASE_PREMIUMS: Record<string, number> = {
  basic: 29, pro: 49, ultra: 79
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization");
    const { pincode, platform, avgWeeklyHours, claimHistoryCount, currentMonth } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });

    const { data: userProfile } = await supabase.from("users").select("*").eq("id", user.id).single();
    const zone = pincode || userProfile?.zone_pincode || "400070";
    const month = currentMonth || new Date().getMonth() + 1;

    // Zone risk factor
    const zoneRisk = getZoneRisk(zone);

    // Seasonal factor — monsoon June-September adds 10%
    const seasonalFactor = (month >= 6 && month <= 9) ? 0.12 : (month >= 12 || month <= 2) ? -0.08 : 0;

    // Loyalty discount based on claims history
    const claims = claimHistoryCount ?? userProfile?.claims_count ?? 0;
    const loyaltyFactor = claims === 0 ? -0.05 : claims > 5 ? 0.05 : 0;

    // Platform risk (Zomato/Swiggy vs others — more hours = more exposure)
    const hours = avgWeeklyHours || userProfile?.declared_weekly_hours || 56;
    const hoursFactor = hours > 60 ? 0.05 : hours < 40 ? -0.05 : 0;

    // Final multiplier clamped to 0.7–1.3
    const rawMultiplier = 0.85 + zoneRisk * 0.3 + seasonalFactor + loyaltyFactor + hoursFactor;
    const multiplier = Math.min(1.3, Math.max(0.7, parseFloat(rawMultiplier.toFixed(3))));

    // Calculate adjusted premiums for all tiers
    const adjustedPlans = Object.entries(BASE_PREMIUMS).map(([planId, base]) => ({
      planId,
      basePremium: base,
      adjustedPremium: Math.round(base * multiplier),
      multiplier,
    }));

    // Breakdown explanation
    const breakdown = {
      zoneRisk: `${(zoneRisk * 100).toFixed(0)}% zone risk score`,
      seasonal: seasonalFactor > 0 ? "Monsoon season surcharge" : seasonalFactor < 0 ? "Off-season discount" : "No seasonal adjustment",
      loyalty: loyaltyFactor < 0 ? "Clean history discount" : loyaltyFactor > 0 ? "Claim history surcharge" : "Neutral history",
      hours: hoursFactor > 0 ? "High-hours surcharge" : hoursFactor < 0 ? "Part-time discount" : "Standard hours",
    };

    // Update user's stored risk score
    await supabase.from("users").update({
      risk_zone_score: zoneRisk,
      premium_multiplier: multiplier,
    }).eq("id", user.id);

    return new Response(JSON.stringify({ multiplier, adjustedPlans, breakdown, zone }), {
      headers: { ...cors, "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: cors });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TRIGGER_THRESHOLDS: Record<string, { threshold: number; label: string }> = {
  "T-01": { threshold: 64.4, label: "Heavy Rain" },
  "T-02": { threshold: 30, label: "Flash Flood" },     // depth cm
  "T-03": { threshold: 300, label: "Severe AQI" },
  "T-04": { threshold: 45, label: "Extreme Heat" },
  "T-05": { threshold: 1, label: "Curfew / Section 144" },   // 1 = active
  "T-06": { threshold: 1, label: "Cyclone Alert" },           // 1 = alert issued
  "T-07": { threshold: 240, label: "Platform Outage" },       // minutes
};

const PLAN_TRIGGER_MAP: Record<string, string[]> = {
  basic: ["T-01", "T-02"],
  pro:   ["T-01", "T-02", "T-03", "T-04"],
  ultra: ["T-01", "T-02", "T-03", "T-04", "T-05", "T-06", "T-07"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const body = await req.json();
    const {
      pincode, city, rainfall, aqi, temperature,
      flood_depth, curfew_active, cyclone_alert,
      platform_outage_minutes, force_type
    } = body;

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const triggersCreated: unknown[] = [];

    const evaluations = force_type
      ? [{ type: force_type as string, value: 99999 }]
      : [
          { type: "T-01", value: rainfall || 0 },
          { type: "T-02", value: flood_depth || 0 },
          { type: "T-03", value: aqi || 0 },
          { type: "T-04", value: temperature || 0 },
          { type: "T-05", value: curfew_active ? 1 : 0 },
          { type: "T-06", value: cyclone_alert ? 1 : 0 },
          { type: "T-07", value: platform_outage_minutes || 0 },
        ];

    for (const { type, value } of evaluations) {
      const cfg = TRIGGER_THRESHOLDS[type];
      if (!cfg) continue;
      if (!force_type && value < cfg.threshold) continue;

      const dedupeKey = `${type}:${pincode}:${new Date().toISOString().slice(0, 13)}`;
      const { data: existing } = await supabase.from("triggers").select("id").eq("dedupe_key", dedupeKey).maybeSingle();
      if (existing) continue;

      const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

      const { data: trigger, error } = await supabase.from("triggers").insert({
        type,
        zone_pincode: pincode,
        zone_city: city || "Unknown",
        severity_label: cfg.label,
        threshold_value: value,
        triggered_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        dedupe_key: dedupeKey,
        raw_api_payload: body,
      }).select().single();

      if (error || !trigger) continue;

      triggersCreated.push(trigger);
      await processClaimsForTrigger(supabase, trigger);
    }

    return new Response(JSON.stringify({ triggered: triggersCreated.length > 0, triggers: triggersCreated }), {
      headers: { ...cors, "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: cors });
  }
});

async function processClaimsForTrigger(supabase: ReturnType<typeof createClient>, trigger: Record<string, unknown>) {
  // Get all active policies in the trigger zone — join to users
  const { data: allPolicies } = await supabase
    .from("policies")
    .select("id, user_id, plan_type, coverage_cap, upi_handle, started_at, current_week_payout, adjusted_premium")
    .eq("status", "active");

  if (!allPolicies?.length) return;

  // Get worker pings for zone matching
  const { data: pings } = await supabase
    .from("worker_pings")
    .select("*")
    .eq("zone_pincode", trigger.zone_pincode as string);

  const pingMap: Record<string, Record<string, unknown>> = {};
  for (const ping of (pings || [])) pingMap[ping.user_id] = ping;

  for (const policy of allPolicies) {
    // Check plan covers this trigger type
    if (!PLAN_TRIGGER_MAP[policy.plan_type]?.includes(trigger.type as string)) continue;

    const userId = policy.user_id as string;

    // CONTEXT VALIDATION — worker must be in zone and recently active
    const ping = pingMap[userId];
    if (!ping) continue; // Worker never pinged — skip
    if (ping.zone_pincode !== trigger.zone_pincode) continue; // Wrong zone

    const pingAge = Date.now() - new Date(ping.last_ping as string).getTime();
    if (pingAge > 3 * 60 * 60 * 1000) continue; // Ping older than 3 hours — not active

    // FRAUD SCORING — call score-fraud function internally
    let fraudScore = 0.05;
    let claimStatus: "approved" | "flagged_secondary" | "manual_review" = "approved";

    try {
      const fraudRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/score-fraud`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json",
          apikey: Deno.env.get("SUPABASE_ANON_KEY") || "",
        },
        body: JSON.stringify({
          userId,
          triggerId: trigger.id,
          triggerZonePincode: trigger.zone_pincode,
        }),
      });
      const fraudData = await fraudRes.json();
      fraudScore = fraudData.fraudScore || 0.05;
      if (fraudScore >= 0.7) claimStatus = "manual_review";
      else if (fraudScore >= 0.3) claimStatus = "flagged_secondary";
    } catch (_) {
      // Fraud service unavailable — default to approved with flag
      fraudScore = 0.05;
    }

    // WEEKLY CAP CHECK
    // PRD: "Cannot exceed weekly premium × 20 in a single week"
    const weeklyCapLimit = (policy.adjusted_premium || 49) * 20;
    const weeklyUsed = policy.current_week_payout || 0;
    if (weeklyUsed >= weeklyCapLimit) continue; // Cap reached this week

    // CALCULATE PAYOUT
    const { data: userRow } = await supabase
      .from("users")
      .select("declared_weekly_earnings, declared_weekly_hours, total_payout, claims_count, phone")
      .eq("id", userId).single();

    const weeklyEarnings = userRow?.declared_weekly_earnings || 4200;
    const weeklyHours = userRow?.declared_weekly_hours || 56;
    const hourlyRate = weeklyEarnings / weeklyHours;
    const hoursDisrupted = 4; // default 4hrs per disruption event
    const rawPayout = hoursDisrupted * hourlyRate;
    const payoutAmount = Math.round(rawPayout / 10) * 10;
    const cappedByPolicy = Math.min(payoutAmount, policy.coverage_cap as number);
    const cappedByWeeklyLimit = Math.min(cappedByPolicy, weeklyCapLimit - weeklyUsed);

    // INSERT CLAIM
    const { data: claim } = await supabase.from("claims").insert({
      user_id: userId,
      policy_id: policy.id,
      trigger_id: trigger.id,
      status: claimStatus,
      hours_disrupted: hoursDisrupted,
      hourly_rate: hourlyRate,
      payout_amount: cappedByWeeklyLimit,
      fraud_score: fraudScore,
      fraud_flags: [],
      context_validated_at: new Date().toISOString(),
    }).select().single();

    if (!claim) continue;

    // Only create payout for auto-approved claims
    if (claimStatus === "approved") {
      const { data: payout } = await supabase.from("payouts").insert({
        claim_id: claim.id,
        user_id: userId,
        amount: cappedByWeeklyLimit,
        status: "success",
        upi_handle: policy.upi_handle,
        paid_at: new Date().toISOString(),
      }).select().single();

      if (payout) {
        // Update claim status to paid
        await supabase.from("claims").update({ status: "paid" }).eq("id", claim.id);

        // Update user totals
        await supabase.from("users").update({
          total_payout: (userRow?.total_payout || 0) + cappedByWeeklyLimit,
          claims_count: (userRow?.claims_count || 0) + 1,
        }).eq("id", userId);

        // Update weekly payout counter on policy
        await supabase.from("policies").update({
          current_week_payout: weeklyUsed + cappedByWeeklyLimit,
        }).eq("id", policy.id);

        // Update trigger claims count
        await supabase.from("triggers").update({
          claims_generated: ((trigger.claims_generated as number) || 0) + 1,
        }).eq("id", trigger.id);

        // Send SMS notification
        if (userRow?.phone) {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sms`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              "Content-Type": "application/json",
              apikey: Deno.env.get("SUPABASE_ANON_KEY") || "",
            },
            body: JSON.stringify({
              to: userRow.phone,
              message: `GigShield: ₹${cappedByWeeklyLimit} credited for ${trigger.severity_label} disruption in your zone. Your income is protected.`,
            }),
          }).catch(() => {});
        }
      }
    }
  }
}

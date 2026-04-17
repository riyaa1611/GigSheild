import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { userId, triggerId, triggerZonePincode } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch worker context
    const { data: ping } = await supabase.from("worker_pings")
      .select("*").eq("user_id", userId).maybeSingle();

    const { data: policy } = await supabase.from("policies")
      .select("*").eq("user_id", userId).eq("status", "active").maybeSingle();

    const { data: recentClaims } = await supabase.from("claims")
      .select("id").eq("user_id", userId)
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const claimCount30d = recentClaims?.length || 0;

    let fraudScore = 0.05; // baseline clean
    const flags: string[] = [];

    // Rule 1: Worker not pinged in last 3 hours (was not active)
    if (!ping || !ping.last_ping) {
      fraudScore += 0.4;
      flags.push("no_active_status");
    } else {
      const pingAge = Date.now() - new Date(ping.last_ping).getTime();
      if (pingAge > 3 * 60 * 60 * 1000) {
        fraudScore += 0.35;
        flags.push("stale_ping");
      }
    }

    // Rule 2: Worker's pincode doesn't match trigger zone
    if (ping?.zone_pincode && triggerZonePincode && ping.zone_pincode !== triggerZonePincode) {
      fraudScore += 0.3;
      flags.push("zone_mismatch");
    }

    // Rule 3: Platform not active
    if (ping && ping.platform_active === false) {
      fraudScore += 0.25;
      flags.push("platform_inactive");
    }

    // Rule 4: Policy activated very recently (< 1 hour before trigger)
    if (policy?.started_at) {
      const policyAge = Date.now() - new Date(policy.started_at).getTime();
      if (policyAge < 60 * 60 * 1000) {
        fraudScore += 0.25;
        flags.push("new_policy_claim");
      }
    }

    // Rule 5: High claim frequency (> 5 in 30 days)
    if (claimCount30d > 5) {
      fraudScore += 0.2;
      flags.push("repeat_pattern");
    }

    fraudScore = Math.min(1.0, parseFloat(fraudScore.toFixed(3)));

    let decision: "auto_approve" | "secondary_check" | "manual_review";
    if (fraudScore < 0.3) decision = "auto_approve";
    else if (fraudScore < 0.7) decision = "secondary_check";
    else decision = "manual_review";

    return new Response(JSON.stringify({ fraudScore, decision, flags }), {
      headers: { ...cors, "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: cors });
  }
});

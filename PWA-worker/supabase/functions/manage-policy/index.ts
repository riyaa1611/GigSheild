import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLANS: Record<string, { weeklyPremium: number; coverageCap: number }> = {
  basic: { weeklyPremium: 29, coverageCap: 500 },
  pro: { weeklyPremium: 49, coverageCap: 900 },
  ultra: { weeklyPremium: 79, coverageCap: 1500 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    const { action, policyId, newPlanType, cancelReason } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader || "" } } }
    );

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });

    const { data: policy } = await supabase.from("policies").select("*").eq("id", policyId).eq("user_id", authUser.id).single();
    if (!policy) return new Response(JSON.stringify({ error: "Policy not found" }), { status: 404, headers: cors });

    if (action === "cancel") {
      const now = new Date();
      const endsAt = new Date(policy.ends_at);
      const totalDays = 7;
      const daysRemaining = Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const refundAmount = Math.round((Number(policy.adjusted_premium) / totalDays) * daysRemaining);

      await supabase.from("policies").update({
        status: "cancelled",
        cancelled_at: now.toISOString(),
        cancel_reason: cancelReason || "User requested",
        refund_amount: refundAmount,
      }).eq("id", policyId);

      return new Response(JSON.stringify({ success: true, action: "cancelled", refundAmount, daysRemaining }), {
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    if (action === "switch_immediate") {
      await supabase.from("policies").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", policyId);

      const newPlan = PLANS[newPlanType];
      const now = new Date();
      const dayOfWeek = now.getDay();
      const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
      const endsAt = new Date(now);
      endsAt.setDate(now.getDate() + daysUntilSunday);
      endsAt.setHours(23, 59, 59, 999);

      const multiplier = Number(policy.premium_multiplier || 1.0);
      const adjustedPremium = Math.round(newPlan.weeklyPremium * multiplier);

      const { data: newPolicy } = await supabase.from("policies").insert({
        user_id: authUser.id,
        plan_type: newPlanType,
        weekly_premium: newPlan.weeklyPremium,
        adjusted_premium: adjustedPremium,
        coverage_cap: newPlan.coverageCap,
        upi_handle: policy.upi_handle,
        premium_multiplier: multiplier,
        started_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
      }).select().single();

      return new Response(JSON.stringify({ success: true, action: "switched_immediate", newPolicy, adjustedPremium }), {
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    if (action === "switch_end_of_period") {
      await supabase.from("policies").update({ switch_requested_plan: newPlanType, switch_at: "end_of_period" }).eq("id", policyId);
      return new Response(JSON.stringify({ success: true, action: "switch_scheduled", switchDate: policy.ends_at }), {
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: cors });
  }
});
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const PLANS = {
  basic: { weeklyPremium: 29, coverageCap: 500 },
  pro: { weeklyPremium: 49, coverageCap: 900 },
  ultra: { weeklyPremium: 79, coverageCap: 1500 }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const { planType, upiHandle } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const {
      data: { user: authUser }
    } = await supabase.auth.getUser();

    if (!authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: userProfile } = await supabase.from("users").select("*").eq("id", authUser.id).single();
    const { data: existing } = await supabase
      .from("policies")
      .select("id")
      .eq("user_id", authUser.id)
      .eq("status", "active")
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Active policy already exists" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const plan = PLANS[planType as keyof typeof PLANS];
    if (!plan) {
      return new Response(JSON.stringify({ error: "Invalid plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let multiplier = 1.0;
    const pincode = userProfile?.zone_pincode || "400070";
    const highRiskPincodes = ["400070", "400001", "110001", "600001"];
    if (highRiskPincodes.includes(pincode)) multiplier = 1.05;

    const month = new Date().getMonth() + 1;
    if (month >= 6 && month <= 9) multiplier += 0.1;
    multiplier = Math.min(1.3, Math.max(0.7, multiplier));

    const adjustedPremium = Math.round(plan.weeklyPremium * multiplier);

    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
    const endsAt = new Date(now);
    endsAt.setDate(now.getDate() + daysUntilSunday);
    endsAt.setHours(23, 59, 59, 999);

    const { data: policy, error } = await supabase
      .from("policies")
      .insert({
        user_id: authUser.id,
        plan_type: planType,
        weekly_premium: plan.weeklyPremium,
        adjusted_premium: adjustedPremium,
        coverage_cap: plan.coverageCap,
        upi_handle: upiHandle,
        premium_multiplier: multiplier,
        started_at: new Date().toISOString(),
        ends_at: endsAt.toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    if (upiHandle) {
      await supabase.from("users").update({ upi_handle: upiHandle }).eq("id", authUser.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        policy,
        adjustedPremium,
        multiplier,
        nextBillingDate: endsAt.toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

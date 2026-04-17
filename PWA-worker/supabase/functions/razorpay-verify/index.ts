import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    const rzpSecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = createHmac("sha256", rzpSecret).update(body).digest("hex");
    if (expected !== razorpay_signature) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400, headers: cors });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader || "" } } }
    );

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });

    const { data: order } = await supabase
      .from("razorpay_orders")
      .update({ status: "paid", razorpay_payment_id, razorpay_signature, verified_at: new Date().toISOString() })
      .eq("razorpay_order_id", razorpay_order_id)
      .select().single();

    if (order?.purpose === "premium" && order?.plan_type) {
      const { data: userProfile } = await supabase.from("users").select("*").eq("id", authUser.id).single();
      const plan = PLANS[order.plan_type];
      const multiplier = 1.0;
      const adjustedPremium = Math.round(plan.weeklyPremium * multiplier);
      const now = new Date();
      const daysUntilSunday = now.getDay() === 0 ? 7 : 7 - now.getDay();
      const endsAt = new Date(now);
      endsAt.setDate(now.getDate() + daysUntilSunday);
      endsAt.setHours(23, 59, 59, 999);

      const { data: newPolicy } = await supabase.from("policies").insert({
        user_id: authUser.id,
        plan_type: order.plan_type,
        weekly_premium: plan.weeklyPremium,
        adjusted_premium: adjustedPremium,
        coverage_cap: plan.coverageCap,
        upi_handle: userProfile?.upi_handle,
        premium_multiplier: multiplier,
        started_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        razorpay_subscription_id: razorpay_payment_id,
      }).select().single();

      await supabase.from("razorpay_orders").update({ policy_id: newPolicy.id }).eq("id", order.id);

      return new Response(JSON.stringify({ success: true, policy: newPolicy, paymentId: razorpay_payment_id }), {
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true, paymentId: razorpay_payment_id }), {
      headers: { ...cors, "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: cors });
  }
});
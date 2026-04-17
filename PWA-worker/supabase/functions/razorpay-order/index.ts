import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    const { amount, purpose, planType, policyId } = await req.json();

    const rzpKey = Deno.env.get("RAZORPAY_KEY_ID")!;
    const rzpSecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader || "" } } }
    );

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });

    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${rzpKey}:${rzpSecret}`),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt: `gs_${Date.now()}`,
        notes: { purpose, planType, userId: authUser.id },
      }),
    });

    const order = await orderRes.json();
    if (!order.id) throw new Error(order.description || "Failed to create Razorpay order");

    await supabase.from("razorpay_orders").insert({
      user_id: authUser.id,
      policy_id: policyId || null,
      razorpay_order_id: order.id,
      amount: Math.round(amount * 100),
      purpose,
      plan_type: planType || null,
    });

    return new Response(JSON.stringify({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: rzpKey }), {
      headers: { ...cors, "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: cors });
  }
});
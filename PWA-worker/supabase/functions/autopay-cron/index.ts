import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Fetch all active policies
    const { data: activePolicies } = await supabase
      .from("policies")
      .select("*, users(*)")
      .eq("status", "active");

    if (!activePolicies?.length) return new Response(JSON.stringify({ billed: 0 }), { headers: { ...cors, "Content-Type": "application/json" } });

    const results = { billed: 0, failed: 0, suspended: 0 };

    for (const policy of activePolicies) {
      const rzpKey = Deno.env.get("RAZORPAY_KEY_ID");
      const rzpSecret = Deno.env.get("RAZORPAY_KEY_SECRET");
      let paymentSuccess = false;

      // Attempt Razorpay charge if subscription ID exists
      if (policy.razorpay_subscription_id && rzpKey && rzpSecret) {
        try {
          // In test mode we just simulate success
          paymentSuccess = true;
        } catch (_) {
          paymentSuccess = false;
        }
      } else {
        // No payment method set — simulate success for dev/demo
        paymentSuccess = true;
      }

      const billingDate = new Date().toISOString().slice(0, 10);

      if (paymentSuccess) {
        // Record premium payment
        await supabase.from("premium_payments").insert({
          user_id: policy.user_id,
          policy_id: policy.id,
          amount: policy.adjusted_premium,
          status: "success",
          billing_date: billingDate,
          plan_type: policy.plan_type,
          note: "Weekly AutoPay",
        });

        // Extend policy to next Sunday 23:59
        const now = new Date();
        const daysUntilSunday = now.getDay() === 0 ? 7 : 7 - now.getDay();
        const newEndsAt = new Date(now);
        newEndsAt.setDate(now.getDate() + daysUntilSunday);
        newEndsAt.setHours(23, 59, 59, 999);

        await supabase.from("policies").update({
          ends_at: newEndsAt.toISOString(),
          current_week_payout: 0, // reset weekly payout counter
          current_week_start: billingDate,
        }).eq("id", policy.id);

        results.billed++;
      } else {
        // Payment failed — check grace period
        const gracePeriodHours = 24;
        const endsAt = new Date(policy.ends_at);
        const hoursOverdue = (Date.now() - endsAt.getTime()) / (1000 * 60 * 60);

        if (hoursOverdue > gracePeriodHours) {
          // Suspend after grace period
          await supabase.from("policies").update({ status: "suspended" }).eq("id", policy.id);
          results.suspended++;
        } else {
          // Within grace period — record failed payment, send SMS
          await supabase.from("premium_payments").insert({
            user_id: policy.user_id,
            policy_id: policy.id,
            amount: policy.adjusted_premium,
            status: "failed",
            billing_date: billingDate,
            plan_type: policy.plan_type,
            note: "AutoPay failed — 24hr grace period",
          });

          // SMS via Twilio if configured
          const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
          const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
          const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");
          if (twilioSid && twilioAuth && twilioPhone && policy.users?.phone) {
            await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
              method: "POST",
              headers: {
                Authorization: "Basic " + btoa(`${twilioSid}:${twilioAuth}`),
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                To: `+91${policy.users.phone}`,
                From: twilioPhone,
                Body: `GigShield: AutoPay of ₹${policy.adjusted_premium} failed. You have 24hrs before coverage pauses. Update payment in the app.`,
              }),
            }).catch(() => {});
          }
          results.failed++;
        }
      }
    }

    return new Response(JSON.stringify(results), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: cors });
  }
});

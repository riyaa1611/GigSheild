import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { to, message } = await req.json();
    const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const auth = Deno.env.get("TWILIO_AUTH_TOKEN");
    const from = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!sid || !auth || !from) {
      // SMS not configured — log and continue silently
      console.log(`[SMS SKIPPED] To: +91${to} | Msg: ${message}`);
      return new Response(JSON.stringify({ sent: false, reason: "Twilio not configured" }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${sid}:${auth}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: `+91${to}`, From: from, Body: message }),
    });

    const data = await res.json();
    return new Response(JSON.stringify({ sent: !!data.sid, sid: data.sid }), {
      headers: { ...cors, "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: cors });
  }
});

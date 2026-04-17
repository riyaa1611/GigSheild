import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const OUT_OF_SCOPE_REPLY = "Ask about the platform related queries and question no other questions.";

function isPlatformQuery(input: string) {
  const text = (input || "").toLowerCase();
  const keywords = [
    "gigshield",
    "platform",
    "policy",
    "plan",
    "premium",
    "coverage",
    "claim",
    "payout",
    "trigger",
    "otp",
    "login",
    "kyc",
    "subscription",
    "support",
    "ticket",
    "zone",
    "delivery",
    "worker"
  ];

  return keywords.some((kw) => text.includes(kw));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const { ticketId, message } = await req.json();

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

    await supabase.from("support_messages").insert({
      ticket_id: ticketId,
      role: "user",
      text: message
    });

    const { data: userProfile } = await supabase.from("users").select("*, policies(*)").eq("id", authUser.id).single();
    const { data: recentPayouts } = await supabase
      .from("payouts")
      .select("*")
      .eq("user_id", authUser.id)
      .order("created_at", { ascending: false })
      .limit(3);

    let aiResponse = OUT_OF_SCOPE_REPLY;

    if (isPlatformQuery(message)) {
      const groqApiKey = Deno.env.get("GROQ_API_KEY") || "";
      const groqModel = Deno.env.get("GROQ_MODEL") || "llama-3.1-8b-instant";

      if (!groqApiKey) {
        throw new Error("GROQ_API_KEY is not configured");
      }

      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`
        },
        body: JSON.stringify({
          model: groqModel,
          temperature: 0.2,
          max_tokens: 300,
          messages: [
            {
              role: "system",
              content: `You are Sentinel, GigShield's support assistant for platform and service queries only.
If the question is not related to GigShield platform, plans, policies, payouts, claims, triggers, support process, onboarding, KYC, OTP, or worker account service, reply exactly with: ${OUT_OF_SCOPE_REPLY}
Use worker context when relevant.
Worker context: Plan=${userProfile?.policies?.[0]?.plan_type || "none"}, City=${userProfile?.zone_city}, Claims=${userProfile?.claims_count || 0}.
Recent payouts: ${recentPayouts?.length || 0} payouts totalling Rs ${recentPayouts?.reduce((s: number, p: any) => s + p.amount, 0) || 0}.`
            },
            {
              role: "user",
              content: message
            }
          ]
        })
      });

      const groqData = await groqRes.json();
      aiResponse = groqData?.choices?.[0]?.message?.content?.trim() || OUT_OF_SCOPE_REPLY;
    }

    const { data: aiMsg } = await supabase
      .from("support_messages")
      .insert({
        ticket_id: ticketId,
        role: "ai",
        text: aiResponse
      })
      .select()
      .single();

    return new Response(JSON.stringify({ reply: aiResponse, messageId: aiMsg?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

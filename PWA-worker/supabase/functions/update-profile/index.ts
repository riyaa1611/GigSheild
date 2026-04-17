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
    const body = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader || "" } } }
    );

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });

    const allowed = ["name", "zone_city", "zone_pincode", "zone_address", "declared_weekly_earnings", "declared_weekly_hours", "notification_prefs", "avatar_url", "upi_handle", "bank_account", "bank_name", "bank_ifsc", "bank_account_name"];
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    const { data: updatedUser } = await supabase.from("users").update(updates).eq("id", authUser.id).select().single();

    return new Response(JSON.stringify({ success: true, user: updatedUser }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: cors });
  }
});
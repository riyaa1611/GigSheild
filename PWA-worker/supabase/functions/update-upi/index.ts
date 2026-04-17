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
    const { upiHandle, bankAccount, bankName, bankIfsc, bankAccountName } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader || "" } } }
    );

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });

    const updates: Record<string, string> = {};
    if (upiHandle) updates.upi_handle = upiHandle;
    if (bankAccount) updates.bank_account = bankAccount;
    if (bankName) updates.bank_name = bankName;
    if (bankIfsc) updates.bank_ifsc = bankIfsc;
    if (bankAccountName) updates.bank_account_name = bankAccountName;

    await supabase.from("users").update(updates).eq("id", authUser.id);

    if (upiHandle) {
      await supabase.from("policies").update({ upi_handle: upiHandle }).eq("user_id", authUser.id).eq("status", "active");
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: cors });
  }
});
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing Supabase env vars. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } }
});

export async function callFunction(name, body = {}, session) {
  const res = await supabase.functions.invoke(name, {
    body,
    headers: session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}
  });
  if (res.error) {
    let message = res.error.message || "Function call failed";

    // Bubble up edge-function JSON errors (for example: "Active policy already exists").
    if (typeof res.error.context?.json === "function") {
      try {
        const payload = await res.error.context.json();
        if (payload?.error) {
          message = payload.error;
        }
      } catch (_e) {
        // Keep fallback message when context body is not JSON.
      }
    }

    throw new Error(message);
  }
  return res.data;
}

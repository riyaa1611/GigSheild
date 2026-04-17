import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function usePolicy(userId) {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    fetchPolicy();

    const channel = supabase
      .channel(`policy:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "policies", filter: `user_id=eq.${userId}` }, () => {
        fetchPolicy();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function fetchPolicy() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("policies")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setPolicy(data || null);
    } catch (_e) {
      setPolicy(null);
    } finally {
      setLoading(false);
    }
  }

  return { policy, loading, refetch: fetchPolicy };
}

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useClaimDetail(userId) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetchClaims();

    // Realtime claim status updates (pending → approved → paid)
    const channel = supabase
      .channel(`claims:${userId}`)
      .on("postgres_changes", {
        event: "*", schema: "public",
        table: "claims", filter: `user_id=eq.${userId}`
      }, () => fetchClaims())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  async function fetchClaims() {
    setLoading(true);
    const { data } = await supabase
      .from("claims")
      .select("*, triggers(type, severity_label, zone_city, triggered_at), policies(plan_type)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    setClaims(data || []);
    setLoading(false);
  }

  return { claims, loading, refetch: fetchClaims };
}

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function usePayouts(userId) {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveEvent, setLiveEvent] = useState(null);

  useEffect(() => {
    if (!userId) return undefined;

    fetchPayouts();

    const channel = supabase
      .channel(`payouts:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "payouts",
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const next = payload.new;
          if (next.status === "success") {
            setLiveEvent(next);
          }
          setPayouts((prev) => [next, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function fetchPayouts() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("payouts")
        .select("*, claims(trigger_id, triggers(type, zone_city, severity_label))")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      setPayouts(data || []);
    } finally {
      setLoading(false);
    }
  }

  return {
    payouts,
    loading,
    liveEvent,
    clearLiveEvent: () => setLiveEvent(null),
    refetch: fetchPayouts
  };
}

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function usePremiumHistory(userId) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetchPayments();

    const channel = supabase
      .channel(`premium:${userId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public",
        table: "premium_payments", filter: `user_id=eq.${userId}`
      }, (payload) => setPayments(prev => [payload.new, ...prev]))
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  async function fetchPayments() {
    setLoading(true);
    const { data } = await supabase
      .from("premium_payments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(12);
    setPayments(data || []);
    setLoading(false);
  }

  return { payments, loading };
}

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function usePolicyActions(userId, session) {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) {
      setPolicy(null);
      setLoading(false);
      return undefined;
    }

    fetchPolicy();

    const channel = supabase
      .channel(`policy-actions:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "policies", filter: `user_id=eq.${userId}` }, () => fetchPolicy())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function fetchPolicy() {
    if (!userId) {
      setPolicy(null);
      setLoading(false);
      return;
    }

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
    } catch (e) {
      setPolicy(null);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function cancelPolicy(cancelReason) {
    if (!policy) return null;
    setActing(true);
    setError("");
    try {
      // Directly update the policy status in Supabase (no edge function required)
      const { data, error: err } = await supabase
        .from("policies")
        .update({
          status: "cancelled",
          cancel_reason: cancelReason || "User requested cancellation",
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", policy.id)
        .select()
        .single();

      if (err) throw err;
      setPolicy(null);
      return data;
    } catch (e) {
      setError(e.message);
    } finally {
      setActing(false);
    }
  }

  async function switchPlan(newPlanType, timing) {
    if (!policy) return null;
    setActing(true);
    setError("");
    try {
      // Directly update the policy plan in Supabase (no edge function required)
      const { data, error: err } = await supabase
        .from("policies")
        .update({
          plan_type: newPlanType,
          updated_at: new Date().toISOString(),
        })
        .eq("id", policy.id)
        .select()
        .single();

      if (err) throw err;
      await fetchPolicy();
      return data;
    } catch (e) {
      setError(e.message);
    } finally {
      setActing(false);
    }
  }

  return { policy, loading, acting, error, cancelPolicy, switchPlan, refetch: fetchPolicy };
}
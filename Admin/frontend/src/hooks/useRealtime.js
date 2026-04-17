import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useRealtimeTriggers() {
  const [triggers, setTriggers] = useState([]);
  const [newTrigger, setNewTrigger] = useState(null);

  useEffect(() => {
    let channel = null;
    try {
      supabase
        .from("triggers")
        .select("*")
        .gte("triggered_at", new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString())
        .order("triggered_at", { ascending: false })
        .then(({ data }) => setTriggers(data || []))
        .catch(() => {});

      channel = supabase
        .channel("admin:triggers")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "triggers" }, (payload) => {
          setTriggers((prev) => [payload.new, ...prev]);
          setNewTrigger(payload.new);
          setTimeout(() => setNewTrigger(null), 5000);
        })
        .subscribe();
    } catch (_) {}

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return { triggers, newTrigger };
}

export function useRealtimeClaims() {
  const [flaggedCount, setFlaggedCount] = useState(0);
  const [newFlagged, setNewFlagged] = useState(null);

  useEffect(() => {
    let channel = null;
    try {
      supabase
        .from("claims")
        .select("id", { count: "exact" })
        .eq("status", "manual_review")
        .then(({ count }) => setFlaggedCount(count || 0))
        .catch(() => {});

      channel = supabase
        .channel("admin:claims")
        .on("postgres_changes", { event: "*", schema: "public", table: "claims" }, (payload) => {
          if (payload.new?.status === "manual_review") {
            setFlaggedCount((prev) => prev + 1);
            setNewFlagged(payload.new);
            setTimeout(() => setNewFlagged(null), 5000);
          }
        })
        .subscribe();
    } catch (_) {}

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return { flaggedCount, newFlagged };
}

export function useRealtimePayouts() {
  const [recentPayouts, setRecentPayouts] = useState([]);

  useEffect(() => {
    let channel = null;
    try {
      supabase
        .from("payouts")
        .select("*, users(name, phone)")
        .eq("status", "success")
        .order("created_at", { ascending: false })
        .limit(10)
        .then(({ data }) => setRecentPayouts(data || []))
        .catch(() => {});

      channel = supabase
        .channel("admin:payouts")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "payouts" }, (payload) => {
          if (payload.new?.status === "success") {
            setRecentPayouts((prev) => [payload.new, ...prev.slice(0, 9)]);
          }
        })
        .subscribe();
    } catch (_) {}

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return { recentPayouts };
}

export function useActiveUserCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let channel = null;
    const refresh = () => {
      supabase
        .from("policies")
        .select("id", { count: "exact" })
        .eq("status", "active")
        .then(({ count: c }) => setCount(c || 0))
        .catch(() => setCount(0));
    };

    try {
      refresh();
      channel = supabase
        .channel("admin:policies")
        .on("postgres_changes", { event: "*", schema: "public", table: "policies" }, refresh)
        .subscribe();
    } catch (_) {
      setCount(0);
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return count;
}

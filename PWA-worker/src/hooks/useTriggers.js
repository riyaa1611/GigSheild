import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useTriggers(userPincode) {
  const [activeTrigger, setActiveTrigger] = useState(null);
  const [allTriggers, setAllTriggers] = useState([]);

  useEffect(() => {
    fetchTriggers();

    const channel = supabase
      .channel("triggers:all")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "triggers"
        },
        (payload) => {
          const trigger = payload.new;
          setAllTriggers((prev) => [trigger, ...prev]);
          if (trigger.zone_pincode === userPincode) {
            setActiveTrigger(trigger);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userPincode]);

  async function fetchTriggers() {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    try {
      const { data } = await supabase
        .from("triggers")
        .select("*")
        .gt("triggered_at", twoHoursAgo)
        .order("triggered_at", { ascending: false });

      const list = data || [];
      setAllTriggers(list);
      setActiveTrigger(list.find((t) => t.zone_pincode === userPincode) || null);
    } catch (_e) {
      setAllTriggers([]);
      setActiveTrigger(null);
    }
  }

  return { activeTrigger, allTriggers, refetch: fetchTriggers };
}

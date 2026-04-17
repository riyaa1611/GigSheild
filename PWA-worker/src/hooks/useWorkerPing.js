import { useEffect } from "react";
import { callFunction } from "../lib/supabase";

export function useWorkerPing(user, session) {
  useEffect(() => {
    if (!user?.id || !session) return;

    // Send ping immediately on mount
    const sendPing = () => {
      callFunction("worker-ping", {
        pincode: user.zone_pincode || "400070",
        platformActive: true,
      }, session).catch(() => {}); // Silent — never block UI
    };

    sendPing();

    // Send every 10 minutes
    const interval = setInterval(sendPing, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.id, session]);
}

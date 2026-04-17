import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";

export function useAnalytics(token) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    apiGet("/admin/analytics", token)
      .then((d) => {
        if (!mounted) return;
        setData(d);
        setError(null);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e.message || "Failed to load analytics");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  return { data, loading, error };
}

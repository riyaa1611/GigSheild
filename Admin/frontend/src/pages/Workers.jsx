import React, { useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import { AS } from "../styles/adminStyles";

export default function Workers({ token }) {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    const cached = sessionStorage.getItem("admin.workers.cache");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setWorkers(parsed || []);
        setLoading(false);
      } catch (_) {}
    }

    apiGet("/admin/workers", token)
      .then((d) => {
        const list = d.workers || [];
        setWorkers(list);
        sessionStorage.setItem("admin.workers.cache", JSON.stringify(list));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handleSelect = async (worker) => {
    setSelected(worker);
    try {
      const d = await apiGet(`/admin/workers/${worker.id}`, token);
      setDetail(d);
    } catch (_) {
      setDetail(null);
    }
  };

  return (
    <div>
      <div style={AS.topBar}><div><h1 style={AS.h1}>Workers</h1><p style={AS.muted}>{workers.length} registered workers</p></div></div>
      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 380px" : "1fr", gap: "16px" }}>
        <div style={AS.card}>
          {loading ? <p style={AS.muted}>Loading...</p> : (
            <table style={AS.table}>
              <thead><tr>{["Name", "Phone", "Platform", "City", "Plan", "Payouts", "Status"].map((h) => <th key={h} style={AS.th}>{h}</th>)}</tr></thead>
              <tbody>
                {workers.map((w) => {
                  const policy = w.policies?.[0];
                  return (
                    <tr key={w.id} onClick={() => handleSelect(w)} style={{ cursor: "pointer" }}>
                      <td style={AS.td}>{w.name || "—"}</td>
                      <td style={AS.td}>{w.phone}</td>
                      <td style={AS.td}>{w.platform_type || "—"}</td>
                      <td style={AS.td}>{w.zone_city || "—"}</td>
                      <td style={AS.td}>{policy ? `${policy.plan_type}Shield` : "—"}</td>
                      <td style={AS.td}><span style={{ color: "#4ade80" }}>₹{Number(w.total_payout || 0).toLocaleString("en-IN")}</span></td>
                      <td style={AS.td}><span style={AS.badge(policy?.status === "active" ? "#4ade80" : "#f59e0b")}>{policy?.status || "no policy"}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {selected && detail && (
          <div style={{ ...AS.card, maxHeight: "600px", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <p style={AS.h3}>{selected.name || selected.phone}</p>
              <button style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: "18px" }} onClick={() => { setSelected(null); setDetail(null); }}>×</button>
            </div>
            {[ ["Phone", selected.phone], ["Platform", selected.platform_type], ["City", selected.zone_city], ["Pincode", selected.zone_pincode], ["Aadhaar", selected.aadhaar_status], ["Total Payout", `₹${Number(selected.total_payout || 0).toLocaleString("en-IN")}`], ["Claims", selected.claims_count || 0], ["Loyalty Score", selected.loyalty_score || 100] ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={AS.muted}>{k}</span>
                <span style={{ fontSize: "13px", color: "#fff" }}>{v}</span>
              </div>
            ))}
            {detail.claims?.length > 0 && (
              <>
                <p style={{ ...AS.label, margin: "14px 0 8px" }}>RECENT CLAIMS</p>
                {detail.claims.slice(0, 5).map((c) => (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                    <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>{c.triggers?.type || "—"} · {c.status}</span>
                    <span style={{ fontSize: "12px", color: "#4ade80" }}>₹{Number(c.payout_amount || 0).toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

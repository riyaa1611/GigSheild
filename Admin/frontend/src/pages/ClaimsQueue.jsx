import React, { useEffect, useState } from "react";
import { apiGet, apiPatch } from "../lib/api";
import TriggerBadge from "../components/TriggerBadge";
import { AS } from "../styles/adminStyles";
import { getFraudCriteria } from "../lib/fraudCriteria";

export default function ClaimsQueue({ token }) {
  const [tab, setTab] = useState("flagged");
  const [claims, setClaims] = useState([]);
  const [allClaims, setAllClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiGet("/admin/claims/flagged", token),
      apiGet("/admin/claims", token, { limit: 50 }),
    ]).then(([flagged, all]) => {
      setClaims(flagged || []);
      setAllClaims(all.claims || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token]);

  const handleReview = async (claimId, action) => {
    setActionLoading(claimId + action);
    try {
      await apiPatch(`/admin/claims/${claimId}/review`, { action, adminNote: `Admin ${action}d via console` }, token);
      setClaims((prev) => prev.filter((c) => c.id !== claimId));
      showToast(`Claim ${action}d successfully`);
    } catch (e) { showToast(e.message); }
    setActionLoading(null);
  };

  const shown = tab === "flagged" ? claims : allClaims;

  return (
    <div>
      {toast && <div style={{ position: "fixed", top: "16px", right: "16px", background: "#1a2e1a", border: "1px solid rgba(74,222,128,0.3)", borderRadius: "10px", padding: "10px 16px", fontSize: "13px", color: "#4ade80", zIndex: 999 }}>{toast}</div>}
      <div style={AS.topBar}>
        <div><h1 style={AS.h1}>Claims Queue</h1><p style={AS.muted}>Review and process insurance claims</p></div>
        <div style={{ ...AS.badge("#ef4444"), fontSize: "13px" }}>{claims.length} needs review</div>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {[{ key: "flagged", label: `Needs Review (${claims.length})` }, { key: "all", label: `All Claims (${allClaims.length})` }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ ...AS.btn(tab === t.key ? "primary" : "ghost"), padding: "8px 16px" }}>{t.label}</button>
        ))}
      </div>

      {loading ? <p style={AS.muted}>Loading claims...</p> : (
        <div style={AS.card}>
          <table style={AS.table}>
            <thead>
              <tr>{["Worker", "Zone", "Trigger", "Payout", "Fraud Score", "Status", tab === "flagged" ? "Actions" : "Date"].map((h) => <th key={h} style={AS.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {shown.map((c) => {
                const fs = c.fraud_score || 0;
                const fsColor = fs >= 0.7 ? "#ef4444" : fs >= 0.3 ? "#f59e0b" : "#4ade80";
                const route = getFraudCriteria(fs);
                return (
                  <tr key={c.id}>
                    <td style={AS.td}><div>{c.users?.name || "—"}</div><div style={AS.muted}>{c.users?.phone}</div></td>
                    <td style={AS.td}>{c.users?.zone_city || c.triggers?.zone_city || "—"}</td>
                    <td style={AS.td}><TriggerBadge code={c.triggers?.type || "T-01"} /></td>
                    <td style={AS.td}><span style={{ color: "#4ade80", fontWeight: "700" }}>₹{Number(c.payout_amount || 0).toLocaleString("en-IN")}</span></td>
                    <td style={AS.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "60px", height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px" }}>
                          <div style={{ width: `${fs * 100}%`, height: "100%", background: fsColor, borderRadius: "2px" }} />
                        </div>
                        <span style={{ fontSize: "11px", color: fsColor }}>{(fs * 100).toFixed(0)}%</span>
                      </div>
                      <span style={{ ...AS.badge(route.color), fontSize: "10px", marginTop: "4px" }}>{route.label}</span>
                      {(c.fraud_flags || []).map((f) => (
                        <span key={f} style={{ ...AS.badge("#f59e0b"), fontSize: "10px", marginRight: "4px", marginTop: "4px" }}>{f}</span>
                      ))}
                    </td>
                    <td style={AS.td}><span style={AS.badge(c.status === "paid" ? "#4ade80" : c.status === "manual_review" ? "#f59e0b" : c.status === "rejected" ? "#ef4444" : "#888")}>{c.status}</span></td>
                    <td style={AS.td}>
                      {tab === "flagged" ? (
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button style={{ ...AS.btn("primary"), padding: "6px 14px", fontSize: "12px" }} onClick={() => handleReview(c.id, "approve")} disabled={actionLoading === c.id + "approve"}>
                            {actionLoading === c.id + "approve" ? "..." : "Approve"}
                          </button>
                          <button style={{ ...AS.btn("danger"), padding: "6px 14px", fontSize: "12px" }} onClick={() => handleReview(c.id, "reject")} disabled={actionLoading === c.id + "reject"}>
                            {actionLoading === c.id + "reject" ? "..." : "Reject"}
                          </button>
                        </div>
                      ) : new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </td>
                  </tr>
                );
              })}
              {shown.length === 0 && <tr><td style={{ ...AS.td, textAlign: "center" }} colSpan={7}>No claims in this category</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AS } from "../styles/adminStyles";
import { FRAUD_CRITERIA } from "../lib/fraudCriteria";

export default function FraudMonitor({ token }) {
  const [metrics, setMetrics] = useState(null);
  const [mlHealth, setMlHealth] = useState(null);
  const [flaggedClaims, setFlaggedClaims] = useState([]);

  useEffect(() => {
    apiGet("/admin/analytics", token).then(setMetrics);
    apiGet("/admin/ml/health", token).then(setMlHealth).catch(() => setMlHealth({ status: "unavailable" }));
    apiGet("/admin/claims/flagged", token).then(setFlaggedClaims);
  }, [token]);

  const fraud = metrics?.fraudStats || {};
  const histData = [
    { bucket: FRAUD_CRITERIA[0].band, count: fraud.autoApproved || 0, color: FRAUD_CRITERIA[0].color },
    { bucket: FRAUD_CRITERIA[1].band, count: fraud.flagged || 0, color: FRAUD_CRITERIA[1].color },
    { bucket: FRAUD_CRITERIA[2].band, count: fraud.manualReview || 0, color: FRAUD_CRITERIA[2].color },
  ];

  return (
    <div>
      <div style={AS.topBar}>
        <div><h1 style={AS.h1}>Fraud Monitor</h1><p style={AS.muted}>AI fraud detection insights</p></div>
      </div>

      <div style={{ ...AS.grid2, marginBottom: "16px" }}>
        <div style={AS.card}>
          <p style={{ ...AS.label, marginBottom: "16px" }}>FRAUD SCORE DISTRIBUTION</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={histData}>
              <XAxis dataKey="bucket" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#13131e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {histData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={AS.card}>
          <p style={{ ...AS.label, marginBottom: "14px" }}>ML MODEL STATUS</p>
          {mlHealth && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: mlHealth.status === "ok" ? "#4ade80" : "#ef4444", animation: mlHealth.status === "ok" ? "pulse 2s infinite" : "none" }} />
                <span style={{ fontSize: "14px", fontWeight: "600", color: mlHealth.status === "ok" ? "#4ade80" : "#f87171" }}>
                  {mlHealth.status === "ok" ? "ML Service Online" : "ML Service Offline"}
                </span>
              </div>
              {mlHealth.modelsLoaded && Object.entries(mlHealth.modelsLoaded).map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", textTransform: "capitalize" }}>{k} Model</span>
                  <span style={{ fontSize: "12px", color: v ? "#4ade80" : "#f59e0b", fontWeight: "600" }}>{v ? "✓ XGBoost/IsoForest" : "⚠ Rule-based fallback"}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <div style={AS.card}>
        <p style={{ ...AS.label, marginBottom: "14px" }}>FLAGGED FOR MANUAL REVIEW ({flaggedClaims.length})</p>
        <table style={AS.table}>
          <thead><tr>{["Worker", "Fraud Score", "Flags", "Amount", "Trigger", "Time"].map((h) => <th key={h} style={AS.th}>{h}</th>)}</tr></thead>
          <tbody>
            {flaggedClaims.map((c) => {
              const fs = c.fraud_score || 0;
              return (
                <tr key={c.id}>
                  <td style={AS.td}>{c.users?.name || c.users?.phone || "—"}</td>
                  <td style={AS.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={{ width: "50px", height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "2px" }}>
                        <div style={{ width: `${fs * 100}%`, height: "100%", background: "#ef4444", borderRadius: "2px" }} />
                      </div>
                      <span style={{ fontSize: "11px", color: "#ef4444" }}>{(fs * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td style={AS.td}>{(c.fraud_flags || []).slice(0, 2).map((f) => <span key={f} style={{ ...AS.badge("#f59e0b"), fontSize: "10px", marginRight: "4px" }}>{f}</span>)}</td>
                  <td style={AS.td}><span style={{ color: "#4ade80", fontWeight: "700" }}>₹{Number(c.payout_amount || 0).toLocaleString("en-IN")}</span></td>
                  <td style={AS.td}>{c.triggers?.type || "—"}</td>
                  <td style={AS.td}>{new Date(c.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                </tr>
              );
            })}
            {flaggedClaims.length === 0 && <tr><td colSpan={6} style={{ ...AS.td, textAlign: "center" }}>No flagged claims</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

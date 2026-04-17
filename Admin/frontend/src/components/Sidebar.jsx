import React from "react";
import { AS } from "../styles/adminStyles";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", emoji: "📊" },
  { id: "trigger-map", label: "Trigger Map", emoji: "🗺️" },
  { id: "claims-queue", label: "Claims Queue", emoji: "⚡" },
  { id: "analytics", label: "Analytics", emoji: "📈" },
  { id: "fraud-monitor", label: "Fraud Monitor", emoji: "🛡️" },
  { id: "forecast", label: "Forecast", emoji: "🌦️" },
  { id: "workers", label: "Workers", emoji: "👥" },
  { id: "support", label: "Support Queue", emoji: "💬" },
];

export default function Sidebar({ activePage, onNavigate, admin, onLogout, liveCount }) {
  return (
    <div style={AS.sidebar}>
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "20px", fontWeight: "900", color: "#4ade80" }}>Gig</span>
          <span style={{ fontSize: "20px", fontWeight: "900", color: "#fff" }}>Shield</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80", animation: "pulse 1.5s infinite" }} />
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>Admin Console</span>
        </div>
      </div>

      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ ...AS.badge("#4ade80"), width: "fit-content" }}>
          {liveCount || 0} active workers
        </div>
      </div>

      <nav style={{ flex: 1, padding: "8px 0" }}>
        {NAV_ITEMS.map((item) => (
          <div key={item.id} style={AS.navItem(activePage === item.id)} onClick={() => onNavigate(item.id)}>
            <span style={{ fontSize: "16px" }}>{item.emoji}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>

      <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", margin: "0 0 8px" }}>
          +91 {admin?.phone}
        </p>
        <button style={{ ...AS.btn("ghost"), padding: "8px 12px", fontSize: "12px" }} onClick={onLogout}>
          Log Out
        </button>
      </div>
    </div>
  );
}

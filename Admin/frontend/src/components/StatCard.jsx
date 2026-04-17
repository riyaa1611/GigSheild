import React from "react";
import { AS } from "../styles/adminStyles";

export default function StatCard({ label, value, accent = "#4ade80", icon }) {
  return (
    <div style={AS.statCard}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={AS.label}>{label}</p>
          <p style={{ fontSize: "28px", fontWeight: "900", color: accent, margin: "4px 0 0" }}>{value}</p>
        </div>
        {icon ? <span style={{ fontSize: "24px" }}>{icon}</span> : null}
      </div>
    </div>
  );
}

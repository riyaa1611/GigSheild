import React from "react";
import { TRIGGER_COLORS } from "../styles/adminStyles";

const LABELS = {
  "T-01": "Heavy Rain", "T-02": "Flood", "T-03": "AQI",
  "T-04": "Heat", "T-05": "Curfew", "T-06": "Cyclone", "T-07": "Outage"
};

export default function TriggerBadge({ code }) {
  const c = TRIGGER_COLORS[code] || "#888";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", background: c + "20", color: c, border: `1px solid ${c}35` }}>
      {code} {LABELS[code] || ""}
    </span>
  );
}

import React from "react";
import { TRIGGER_COLORS } from "../constants/triggers";

const TRIGGER_LABELS = {
  "T-01": "Heavy Rain", "T-02": "Flood Risk", "T-03": "AQI Alert",
  "T-04": "Extreme Heat", "T-05": "Curfew", "T-06": "Cyclone", "T-07": "Platform Outage"
};

export default function TriggerBadge({ code = "T-01" }) {
  const c = TRIGGER_COLORS[code] || "#888";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700",
      background: c + "20", color: c, border: `1px solid ${c}35`,
    }}>
      {code} {TRIGGER_LABELS[code] || ""}
    </span>
  );
}

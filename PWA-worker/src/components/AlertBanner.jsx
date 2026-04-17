import React from "react";
import TriggerBadge from "./TriggerBadge";
import PulsingDot from "./PulsingDot";
import Icon from "./Icon";

export default function AlertBanner({ trigger, onClose }) {
  if (!trigger) return null;
  return (
    <div style={{ margin: "0 16px 12px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "14px", padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Icon name="warning" size={16} color="#f59e0b" />
          <span style={{ fontSize: "13px", fontWeight: "700", color: "#fbbf24" }}>Live Risk Alert</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <TriggerBadge code={trigger.type} />
          {onClose && (
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 0 }}>
              <Icon name="x" size={14} />
            </button>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
        <PulsingDot color="#f59e0b" />
        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
          {trigger.severity_label || "Disruption"} detected in {trigger.zone_city || "your zone"} — Monitoring your coverage
        </span>
      </div>
    </div>
  );
}

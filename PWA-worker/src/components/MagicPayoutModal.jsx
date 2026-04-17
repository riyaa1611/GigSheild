import React, { useEffect, useState } from "react";
import TriggerBadge from "./TriggerBadge";
import Icon from "./Icon";

const TRIGGER_EMOJIS = { "T-01": "🌧️", "T-02": "🌊", "T-03": "😷", "T-04": "🌡️", "T-05": "🚔", "T-06": "🌀", "T-07": "📵" };

export default function MagicPayoutModal({ data, onDismiss }) {
  const [displayed, setDisplayed] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => { setTimeout(() => setShow(true), 100); }, []);

  useEffect(() => {
    if (!data?.amount) return;
    let current = 0;
    const target = Number(data.amount) || 0;
    const t = setInterval(() => {
      current += Math.ceil(target / 30);
      if (current >= target) { setDisplayed(target); clearInterval(t); }
      else setDisplayed(current);
    }, 30);
    return () => clearInterval(t);
  }, [data?.amount]);

  useEffect(() => { const t = setTimeout(onDismiss, 8000); return () => clearTimeout(t); }, []);

  if (!data) return null;

  return (
    <div style={{
      position: "absolute", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 200,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "32px", opacity: show ? 1 : 0, transition: "opacity 0.4s", backdropFilter: "blur(20px)"
    }}>
      <div style={{ textAlign: "center", animation: "fadeIn 0.5s ease" }}>
        <div style={{
          width: "80px", height: "80px", background: "rgba(74,222,128,0.12)",
          border: "2px solid rgba(74,222,128,0.4)", borderRadius: "24px",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 24px", animation: "pulse 2s infinite"
        }}>
          <span style={{ fontSize: "36px" }}>{TRIGGER_EMOJIS[data.triggerCode] || "🌧️"}</span>
        </div>

        <TriggerBadge code={data.triggerCode || "T-01"} />

        <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.7)", marginTop: "16px", marginBottom: "4px" }}>
          {data.triggerType || "Weather Event"} Detected
        </p>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginBottom: "32px" }}>
          📍 {data.zone || "Your Zone"}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center", marginBottom: "16px" }}>
          <Icon name="check" size={20} color="#4ade80" />
          <span style={{ fontSize: "14px", color: "#4ade80", fontWeight: "600" }}>You were active and covered</span>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <span style={{ fontSize: "64px", fontWeight: "900", color: "#fff", fontFamily: "monospace" }}>₹{displayed}</span>
        </div>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: "5px",
          padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "600",
          background: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)",
          marginBottom: "8px"
        }}>
          <Icon name="check" size={12} color="#4ade80" /> Credited to your UPI
        </div>

        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginBottom: "40px" }}>{data.time || "Just now"}</p>

        <button
          style={{
            background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.7)", borderRadius: "14px", padding: "12px 32px",
            fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit"
          }}
          onClick={onDismiss}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

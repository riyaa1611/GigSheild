import React from "react";
import Icon from "../components/Icon";
import PulsingDot from "../components/PulsingDot";
import { S } from "../styles/styles";

export default function WelcomeScreen({ onNext }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", padding: "48px 24px 40px", background: "#0d0d14" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ marginBottom: "16px" }}>
          <div style={{ ...S.badge("#4ade80"), marginBottom: "20px" }}>
            <PulsingDot />&nbsp;PARAMETRIC INCOME PROTECTION
          </div>
        </div>
        <h1 style={{ ...S.h1, fontSize: "42px", marginBottom: "16px" }}>
          Gig<span style={{ color: "#4ade80" }}>Shield</span>
        </h1>
        <p style={{ ...S.body, fontSize: "16px", lineHeight: "1.6", marginBottom: "32px" }}>
          Automatic income protection for delivery workers. Get paid when weather, AQI, or platform disruptions stop your work.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {["🌧️ Heavy Rain & Floods", "😷 Severe AQI Pollution", "🚔 Curfew & Section 144", "📵 Platform Outages"].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "rgba(74,222,128,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="check" size={12} color="#4ade80" />
              </div>
              <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)" }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <button style={S.btn("primary")} onClick={() => onNext("auth_choice")}>
          Get Started
        </button>
      </div>
    </div>
  );
}

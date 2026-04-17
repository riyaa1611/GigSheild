import React, { useState } from "react";
import Icon from "../components/Icon";
import PulsingDot from "../components/PulsingDot";
import { S } from "../styles/styles";
import { PLANS } from "../constants/plans";

export default function UPIAutoPayScreen({ params, onNext }) {
  const [agreed, setAgreed] = useState(false);
  const plan = PLANS.find(p => p.id === params.planType) || PLANS[1];
  const adjustedPremium = params.adjustedPremium || plan.weeklyPremium;

  // Calculate next Monday
  const nextMonday = (() => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 1 ? 7 : (1 + 7 - day) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
  })();

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", padding: "48px 24px 40px", background: "#0d0d14" }}>
      <button style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", marginBottom: "32px", textAlign: "left", display: "flex", alignItems: "center", gap: "6px", fontFamily: "inherit" }} onClick={() => onNext("select_plan", params)}>
        <Icon name="chevronLeft" size={18} /> Back
      </button>

      <div style={{ flex: 1 }}>
        <span style={S.label}>UPI AUTOPAY MANDATE</span>
        <h2 style={{ ...S.h2, fontSize: "26px", marginBottom: "8px", marginTop: "8px" }}>Confirm Weekly<br />AutoPay</h2>
        <p style={{ ...S.body, marginBottom: "24px" }}>Review and confirm your weekly premium deduction mandate.</p>

        {/* Mandate card */}
        <div style={{ background: "linear-gradient(135deg, rgba(15,52,96,0.8), rgba(10,26,15,0.6))", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "20px", padding: "20px", marginBottom: "16px" }}>
          <div style={{ ...S.badge("#4ade80"), marginBottom: "16px" }}><PulsingDot />&nbsp;UPI AUTOPAY</div>

          <div style={{ display: "grid", gap: "12px" }}>
            {[
              ["Plan", plan.name],
              ["Weekly Amount", `₹${adjustedPremium}`],
              ["UPI Handle", params.user?.upi_handle || `${params.user?.phone}@upi`],
              ["Billing Day", "Every Monday 6:00 AM IST"],
              ["First Deduction", nextMonday],
              ["Coverage", `Monday–Sunday 23:59`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ ...S.muted, fontSize: "13px" }}>{k}</span>
                <span style={{ fontSize: "13px", color: "#fff", fontWeight: "500" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Terms */}
        <div style={{ ...S.card, background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.12)", marginBottom: "16px" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <Icon name="zap" size={14} color="#60a5fa" />
            <div>
              <p style={{ fontSize: "13px", color: "#93c5fd", fontWeight: "600", margin: "0 0 4px" }}>AutoPay Terms</p>
              <p style={{ ...S.muted, color: "#7cb4f8", fontSize: "12px", lineHeight: "1.6", margin: 0 }}>
                ₹{adjustedPremium} will be auto-deducted every Monday from your linked UPI. You can pause or cancel before Sunday midnight. UltraShield cancellations receive a pro-rated refund. Failed payments enter a 24-hour grace period before coverage pauses.
              </p>
            </div>
          </div>
        </div>

        {/* Agree checkbox */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer", marginBottom: "8px" }} onClick={() => setAgreed(a => !a)}>
          <div style={{ width: "20px", height: "20px", borderRadius: "6px", border: `2px solid ${agreed ? "#4ade80" : "rgba(255,255,255,0.2)"}`, background: agreed ? "#4ade80" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px", transition: "all 0.2s" }}>
            {agreed && <Icon name="check" size={12} color="#0a1a0f" />}
          </div>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", lineHeight: "1.5", margin: 0 }}>
            I authorise GigShield to debit ₹{adjustedPremium} weekly from my UPI until I cancel. I've read the AutoPay terms.
          </p>
        </div>
      </div>

      <button
        style={S.btn("primary", !agreed)}
        disabled={!agreed}
        onClick={() => onNext("signup_risk", params)}
      >
        Confirm AutoPay Mandate →
      </button>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import Icon from "../components/Icon";
import PulsingDot from "../components/PulsingDot";
import { usePremiumPreview } from "../hooks/usePremiumPreview";
import { S } from "../styles/styles";

const ZONE_LABELS = {
  "400": "Mumbai — High Rain/Flood Risk",
  "110": "Delhi — Severe AQI Risk",
  "380": "Ahmedabad — Extreme Heat Risk",
  "560": "Bangalore — Moderate Risk",
  "600": "Chennai — Cyclone & Flood Risk",
  "411": "Pune — Moderate Risk",
  "500": "Hyderabad — Flood & Heat Risk",
  "160": "Chandigarh — AQI & Heat Risk",
};

export default function RiskProfilingScreen({ params, onNext }) {
  const [analyzed, setAnalyzed] = useState(false);
  const { multiplier, adjustedPlans, breakdown, loading } = usePremiumPreview(params.user, params.session);

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setAnalyzed(true), 800);
      return () => clearTimeout(t);
    }
  }, [loading]);

  const pincode = params.user?.zone_pincode || "400070";
  const zoneLabel =
    ZONE_LABELS[pincode.slice(0, 3)] ||
    (params.user?.zone_city ? `${params.user.zone_city} Zone` : `Zone ${pincode}`);

  const riskColor = multiplier <= 0.9 ? "#4ade80" : multiplier <= 1.1 ? "#f59e0b" : "#ef4444";
  const riskLabel = multiplier <= 0.9 ? "Low Risk Zone" : multiplier <= 1.1 ? "Moderate Risk Zone" : "High Risk Zone";

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", padding: "48px 24px 40px", background: "#0d0d14" }}>
      <button style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", marginBottom: "32px", textAlign: "left", display: "flex", alignItems: "center", gap: "6px", fontFamily: "inherit" }} onClick={() => onNext("signup_bank", params)}>
        <Icon name="chevronLeft" size={18} /> Back
      </button>

      <div style={{ flex: 1 }}>
        <span style={S.label}>03 — AI RISK PROFILING</span>
        <h2 style={{ ...S.h2, fontSize: "26px", marginBottom: "8px", marginTop: "8px" }}>Your Risk<br />Profile</h2>
        <p style={{ ...S.body, marginBottom: "24px" }}>Our AI analyses your zone, season, and work history to personalise your premium.</p>

        {!analyzed ? (
          // Loading animation
          <div style={{ ...S.card, textAlign: "center", padding: "40px 20px" }}>
            <div style={{ width: "56px", height: "56px", background: "rgba(74,222,128,0.1)", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", animation: "pulse 1.5s infinite" }}>
              <Icon name="zap" size={28} color="#4ade80" />
            </div>
            <p style={{ ...S.body, marginBottom: "4px", fontWeight: "600" }}>Analysing your zone...</p>
            <p style={S.muted}>Checking disruption history, seasonal patterns, AQI data</p>
            <div style={{ marginTop: "20px", display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap" }}>
              {["Pincode risk", "Season", "Platform", "History"].map((step, i) => (
                <div key={i} style={{ padding: "4px 10px", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: "20px", fontSize: "11px", color: "#4ade80", animation: `fadeIn 0.3s ease ${i * 0.2}s both` }}>
                  {step}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Risk score card */}
            <div style={{ ...S.card, background: `rgba(${multiplier <= 0.9 ? "74,222,128" : multiplier <= 1.1 ? "245,158,11" : "239,68,68"},0.06)`, border: `1px solid rgba(${multiplier <= 0.9 ? "74,222,128" : multiplier <= 1.1 ? "245,158,11" : "239,68,68"},0.2)`, marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div>
                  <p style={{ ...S.label, marginBottom: "4px" }}>RISK ASSESSMENT COMPLETE</p>
                  <p style={{ fontSize: "20px", fontWeight: "800", color: riskColor, margin: 0 }}>{riskLabel}</p>
                  <p style={{ ...S.muted, marginTop: "4px" }}>{zoneLabel}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ ...S.label, marginBottom: "2px" }}>MULTIPLIER</p>
                  <p style={{ fontSize: "24px", fontWeight: "900", color: riskColor, margin: 0 }}>×{multiplier.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Breakdown */}
            {breakdown && (
              <div style={{ ...S.card, marginBottom: "12px" }}>
                <p style={{ ...S.label, marginBottom: "12px" }}>RISK FACTORS</p>
                {Object.entries(breakdown).map(([key, value], i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80", marginTop: "6px", flexShrink: 0 }} />
                    <p style={{ ...S.body, fontSize: "13px", margin: 0 }}>{String(value)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Adjusted premiums preview */}
            {adjustedPlans && (
              <div style={{ ...S.card, marginBottom: "12px" }}>
                <p style={{ ...S.label, marginBottom: "12px" }}>YOUR PERSONALISED PREMIUMS</p>
                {adjustedPlans.map(p => (
                  <div key={p.planId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", textTransform: "capitalize" }}>
                      {p.planId === "basic" ? "BasicShield" : p.planId === "pro" ? "ProShield" : "UltraShield"}
                    </span>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                      {p.adjustedPremium !== p.basePremium && (
                        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", textDecoration: "line-through" }}>₹{p.basePremium}</span>
                      )}
                      <span style={{ fontSize: "16px", fontWeight: "800", color: "#fff" }}>₹{p.adjustedPremium}/wk</span>
                    </div>
                  </div>
                ))}
                <p style={{ ...S.muted, fontSize: "11px", marginTop: "8px" }}>
                  {multiplier > 1 ? "Higher premium reflects your zone's elevated risk" : multiplier < 1 ? "Loyalty discount applied for your clean record" : "Standard rate for your zone"}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <button
        style={S.btn("primary", !analyzed)}
        disabled={!analyzed}
        onClick={() => onNext("select_plan", params)}
      >
        View My Protection Plans →
      </button>
    </div>
  );
}

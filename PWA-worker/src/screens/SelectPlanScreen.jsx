import React, { useState } from "react";
import { PLANS } from "../constants/plans";
import { supabase } from "../lib/supabase";
import { storage } from "../lib/storage";
import { useRazorpay } from "../hooks/useRazorpay";
import Icon from "../components/Icon";
import PulsingDot from "../components/PulsingDot";
import { S } from "../styles/styles";

const PLAN_FEATURES = {
  basic: {
    features: ["Rain Disturbance (T-01)", "Flood Risk (T-02)"],
    missing: ["Severe AQI", "Extreme Heat", "Curfew", "Platform Outage"],
  },
  pro: {
    features: ["Rain Disturbance (T-01)", "Flood Risk (T-02)", "Severe AQI (T-03)", "Extreme Heat (T-04)"],
    missing: ["Curfew Protection", "Platform Outage"],
    recommended: true,
  },
  ultra: {
    features: ["All ProShield Features", "Curfew & Section 144 (T-05)", "Cyclone Alert (T-06)", "Platform Outage 4h+ (T-07)", "Instant Payouts"],
    missing: [],
  },
};

export default function SelectPlanScreen({ params, onNext }) {
  const [selected, setSelected] = useState("pro");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentState, setPaymentState] = useState("");
  const plan = PLANS.find(p => p.id === selected);
  const planMeta = PLAN_FEATURES[selected];
  const { payPremium } = useRazorpay();

  const handleActivate = async () => {
    setLoading(true);
    setError("");

    const planMetaToPay = PLANS.find(p => p.id === selected);

    if (window.Razorpay) {
      payPremium({
        amount: planMetaToPay?.weeklyPremium || 49,
        planType: selected,
        policyId: null,
        userName: params.user?.name,
        userPhone: params.user?.phone,
        session: params.session,
        onSuccess: async (verifiedData) => {
          setPaymentState("Payment verified");
          const updatedUser = {
            ...params.user,
            plan: selected,
            policyId: verifiedData.policy?.id,
            adjustedPremium: verifiedData.policy?.adjusted_premium,
          };
          storage.set("user", updatedUser);
          onNext("app", { user: updatedUser, session: params.session, planType: selected });
          setLoading(false);
        },
        onFailure: (msg) => {
          setError(msg || "Payment failed. Please try again.");
          setLoading(false);
          setPaymentState("");
        },
        onStatusChange: (state) => {
          const labels = {
            order_created: "Payment order created",
            verifying: "Verifying payment",
            verified: "Payment verified",
            failed: "Payment failed",
            closed: "Checkout closed",
          };
          setPaymentState(labels[state] || "");
        },
      });
      return;
    }

    try {
      const adjustedPremium = planMetaToPay?.weeklyPremium;
      const now = new Date();
      const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Cancel any existing active policy first
      await supabase
        .from("policies")
        .update({ status: "cancelled", cancelled_at: now.toISOString() })
        .eq("user_id", params.user.id)
        .eq("status", "active");

      // Insert new policy
      const { data: newPolicy, error: insertErr } = await supabase
        .from("policies")
        .insert({
          user_id: params.user.id,
          plan_type: selected,
          status: "active",
          weekly_premium: planMetaToPay?.weeklyPremium,
          adjusted_premium: adjustedPremium,
          premium_multiplier: 1.0,
          coverage_cap: planMetaToPay?.coverageCap || 900,
          started_at: now.toISOString(),
          ends_at: weekLater.toISOString(),
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Update user record with plan
      await supabase
        .from("users")
        .update({ plan: selected })
        .eq("id", params.user.id);

      const updatedUser = {
        ...params.user,
        plan: selected,
        policyId: newPolicy?.id,
        adjustedPremium,
      };
      storage.set("user", updatedUser);
      setPaymentState("Plan activated");
      onNext("app", { user: updatedUser, session: params.session, planType: selected });
    } catch (e) {
      setError(String(e?.message || "Failed to activate plan. Try again."));
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "844px", background: "#0d0d14" }}>
      <div style={{ padding: "24px 20px 12px", position: "sticky", top: 0, background: "rgba(13,13,20,0.95)", backdropFilter: "blur(20px)", zIndex: 10 }}>
        <button style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", marginBottom: "16px", textAlign: "left", display: "flex", alignItems: "center", gap: "6px", fontFamily: "inherit", padding: 0, fontSize: "14px" }} onClick={() => onNext("signup_risk", params)}>
          <Icon name="chevronLeft" size={18} /> Back
        </button>
        <div style={{ ...S.badge("#4ade80"), marginBottom: "12px" }}><PulsingDot />&nbsp;COVERAGE ACTIVE</div>
        <h1 style={{ ...S.h1, fontSize: "26px" }}>Choose your<br /><span style={{ color: "#4ade80" }}>Weekly Protection</span></h1>
        <p style={{ ...S.body, fontSize: "13px", marginTop: "6px" }}>Tailored security for gig partners. Billed weekly via UPI AutoPay.</p>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px 120px" }}>
        {PLANS.map(p => {
          const meta = PLAN_FEATURES[p.id];
          const isSelected = selected === p.id;
          return (
            <div key={p.id} onClick={() => setSelected(p.id)} style={{
              ...S.card,
              border: `1.5px solid ${isSelected ? "#4ade80" : "rgba(255,255,255,0.07)"}`,
              background: isSelected ? "rgba(74,222,128,0.04)" : "rgba(255,255,255,0.03)",
              cursor: "pointer", position: "relative", transition: "all 0.2s"
            }}>
              {meta.recommended && (
                <div style={{ position: "absolute", top: "-1px", right: "16px", background: "#4ade80", color: "#0a1a0f", fontSize: "10px", fontWeight: "800", padding: "4px 10px", borderRadius: "0 0 8px 8px", letterSpacing: "0.5px" }}>
                  RECOMMENDED
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div>
                  <h3 style={{ ...S.h3, fontSize: isSelected ? "20px" : "17px", transition: "font-size 0.2s" }}>{p.name}</h3>
                  <p style={{ ...S.muted, marginTop: "2px" }}>
                    {p.id === "basic" ? "Essential Coverage" : p.id === "pro" ? "Professional Standard" : "Maximum Resilience"}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "22px", fontWeight: "800", color: isSelected ? "#4ade80" : "#fff" }}>₹{p.weeklyPremium}</span>
                  <span style={S.muted}>/wk</span>
                </div>
              </div>
              <div style={{ ...S.card, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)", padding: "12px", marginBottom: "12px" }}>
                <span style={S.label}>WEEKLY CAP</span>
                <p style={{ fontSize: "24px", fontWeight: "800", color: "#fff", margin: 0 }}>₹{p.coverageCap.toLocaleString("en-IN")}</p>
              </div>
              {meta.features.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "rgba(74,222,128,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name="check" size={10} color="#4ade80" />
                  </div>
                  <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)" }}>{f}</span>
                </div>
              ))}
              {meta.missing?.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", opacity: 0.35 }}>
                  <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>–</span>
                  </div>
                  <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", textDecoration: "line-through" }}>{f}</span>
                </div>
              ))}
            </div>
          );
        })}
        {error && <p style={{ color: "#f87171", fontSize: "13px", textAlign: "center" }}>{error}</p>}
        {!error && paymentState ? <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "12px", textAlign: "center", marginTop: "10px" }}>{paymentState}</p> : null}
      </div>

      <div style={{ position: "fixed", bottom: 0, width: "390px", padding: "16px 20px", background: "rgba(13,13,20,0.95)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button style={S.btn("primary", loading)} disabled={loading} onClick={handleActivate}>
          {loading ? "Processing payment..." : `Activate ${plan?.name} — ₹${plan?.weeklyPremium}/week`}
        </button>
      </div>
    </div>
  );
}

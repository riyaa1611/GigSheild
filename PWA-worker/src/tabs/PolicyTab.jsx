import React from "react";
import { usePolicyActions } from "../hooks/usePolicyActions";
import { PLANS } from "../constants/plans";
import PulsingDot from "../components/PulsingDot";
import Icon from "../components/Icon";
import ConfirmModal from "../components/ConfirmModal";
import { storage } from "../lib/storage";
import { S } from "../styles/styles";

export default function PolicyTab({ user, planData: planDataProp, session }) {
  const { policy, loading, acting, cancelPolicy, switchPlan } = usePolicyActions(user?.id, session);
  const planData = PLANS.find(p => p.id === (policy?.plan_type || user?.plan)) || planDataProp || PLANS[1];
  const [view, setView] = React.useState(() => storage.get("policy-view", "my-policy"));
  const [confirm, setConfirm] = React.useState(null);

  React.useEffect(() => {
    storage.set("policy-view", view);
  }, [view]);

  const activeSince = policy?.started_at
    ? new Date(policy.started_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";
  const nextRenewal = policy?.ends_at
    ? new Date(policy.ends_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";

  return (
    <div>
      <div style={S.topBar}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
            <Icon name="shield" size={16} color="#4ade80" />
            <span style={{ ...S.label, marginBottom: 0 }}>INCOME PROTECTION</span>
          </div>
          <h2 style={{ ...S.h2, fontSize: "17px" }}>My Policy</h2>
        </div>
        <div style={{ ...S.badge("#4ade80") }}><PulsingDot />&nbsp;Active</div>
      </div>

      <div style={{ padding: "0 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", margin: "4px 0 14px" }}>
          <button
            type="button"
            onClick={() => setView("my-policy")}
            style={{
              height: "52px",
              borderRadius: "14px",
              border: view === "my-policy" ? "1px solid rgba(74,222,128,0.5)" : "1px solid rgba(255,255,255,0.08)",
              background: view === "my-policy" ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.02)",
              color: view === "my-policy" ? "#4ade80" : "rgba(255,255,255,0.48)",
              fontSize: "15px",
              fontWeight: "700",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.2s ease",
            }}
          >
            My Policy
          </button>
          <button
            type="button"
            onClick={() => setView("change-plan")}
            style={{
              height: "52px",
              borderRadius: "14px",
              border: view === "change-plan" ? "1px solid rgba(74,222,128,0.5)" : "1px solid rgba(255,255,255,0.08)",
              background: view === "change-plan" ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.02)",
              color: view === "change-plan" ? "#4ade80" : "rgba(255,255,255,0.48)",
              fontSize: "15px",
              fontWeight: "700",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.2s ease",
            }}
          >
            Change Plan
          </button>
        </div>

        {loading ? (
          <div style={{ ...S.card, textAlign: "center", color: "rgba(255,255,255,0.4)", padding: "32px" }}>Loading policy...</div>
        ) : view === "change-plan" ? (
          <>
            <div style={{ ...S.badge("#4ade80"), marginBottom: "10px" }}><PulsingDot />&nbsp;COVERAGE ACTIVE</div>
            <h1 style={{ ...S.h1, fontSize: "22px" }}>Choose your<br /><span style={{ color: "#fff" }}>Weekly Protection</span></h1>
            <p style={{ ...S.body, marginTop: "10px", marginBottom: "16px" }}>Tailored security for gig partners.</p>
          {PLANS.map((plan) => {
              const currentPlanId = policy?.plan_type || user?.plan || planData?.id;
              const isCurrent = currentPlanId === plan.id;
              const PLAN_RANK = { basic: 0, pro: 1, ultra: 2 };
              const currentRank = PLAN_RANK[currentPlanId] ?? 1;
              const targetRank = PLAN_RANK[plan.id] ?? 1;
              const isUpgrade = targetRank > currentRank;
              const actionLabel = isCurrent ? "Current Plan" : isUpgrade ? `Upgrade to ${plan.name}` : `Downgrade to ${plan.name}`;
              const badgeText = isCurrent ? "CURRENT PLAN" : plan.recommended ? "RECOMMENDED" : null;
              return (
                <div
                  key={plan.id}
                  style={{
                    background: isCurrent ? "linear-gradient(180deg, rgba(10,26,15,0.95), rgba(8,12,12,0.95))" : "rgba(255,255,255,0.03)",
                    border: isCurrent ? "1px solid rgba(74,222,128,0.8)" : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "20px",
                    padding: badgeText ? "36px 16px 16px" : "18px 16px 16px",
                    marginBottom: "12px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {badgeText ? (
                    <div style={{ position: "absolute", top: "10px", left: "16px", background: "#4ade80", color: "#07130b", fontSize: "10px", fontWeight: "800", padding: "4px 8px", borderRadius: "999px", letterSpacing: "0.2px" }}>
                      {badgeText}
                    </div>
                  ) : null}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "14px" }}>
                    <div>
                      <div style={{ fontSize: "20px", fontWeight: "800", color: "#fff", lineHeight: 1.1 }}>{plan.name}</div>
                      <div style={{ marginTop: "4px", fontSize: "13px", color: "rgba(255,255,255,0.36)" }}>{plan.tagline}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: "22px", fontWeight: "800", color: isCurrent ? "#4ade80" : "#fff", lineHeight: 1 }}>
                        ₹{plan.weeklyPremium}
                        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", fontWeight: "700" }}>/wk</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "14px", padding: "14px 14px 12px", marginBottom: "14px" }}>
                    <div style={S.label}>WEEKLY CAP</div>
                    <div style={{ fontSize: "24px", fontWeight: "800", color: "#fff", marginTop: "2px" }}>₹{plan.coverageCap.toLocaleString("en-IN")}</div>
                  </div>

                  <button
                    type="button"
                    disabled={isCurrent || acting}
                    onClick={() => !isCurrent && setConfirm({ type: "switch", planType: plan.id })}
                    style={{
                      width: "100%",
                      height: "48px",
                      borderRadius: "16px",
                      border: isCurrent
                        ? "1px solid rgba(255,255,255,0.12)"
                        : isUpgrade
                        ? "1px solid rgba(74,222,128,0.4)"
                        : "1px solid rgba(245,158,11,0.4)",
                      background: isCurrent
                        ? "rgba(255,255,255,0.02)"
                        : isUpgrade
                        ? "rgba(74,222,128,0.08)"
                        : "rgba(245,158,11,0.08)",
                      color: isCurrent
                        ? "rgba(255,255,255,0.9)"
                        : isUpgrade
                        ? "#4ade80"
                        : "#f59e0b",
                      fontSize: "14px",
                      fontWeight: "700",
                      cursor: isCurrent ? "default" : "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.2s",
                    }}
                  >
                    {actionLabel}
                  </button>
                </div>
              );
            })}
          </>
        ) : policy ? (
          <>
            {/* Hero plan card */}
            <div style={{ background: "linear-gradient(135deg, rgba(15,52,96,0.9), rgba(10,26,15,0.9))", border: "1px solid rgba(74,222,128,0.25)", borderRadius: "20px", padding: "20px", marginBottom: "12px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", bottom: "-20px", right: "16px", opacity: 0.07 }}>
                <Icon name="shield" size={90} color="#4ade80" />
              </div>
              <div style={{ ...S.badge("#4ade80"), marginBottom: "12px" }}><PulsingDot />&nbsp;COVERAGE ACTIVE</div>
              <h2 style={{ fontSize: "26px", fontWeight: "800", color: "#fff", margin: "0 0 6px" }}>{planData?.name}</h2>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginBottom: "20px" }}>Parametric income protection · weekly renewal</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div><p style={S.label}>ACTIVE SINCE</p><p style={{ color: "#fff", fontWeight: "600" }}>{activeSince}</p></div>
                <div><p style={S.label}>NEXT RENEWAL</p><p style={{ color: "#fff", fontWeight: "600" }}>{nextRenewal}</p></div>
              </div>
            </div>

            {/* Coverage triggers */}
            <div style={S.card}>
              <h3 style={{ ...S.h3, fontSize: "13px", letterSpacing: "0.5px", marginBottom: "14px", color: "rgba(255,255,255,0.5)" }}>COVERAGE TRIGGERS</h3>
              {planData?.triggers?.map((t, i) => {
                const labels = { "T-01": "Heavy Rain > 64mm/hr", "T-02": "Flash Flood > 30cm", "T-03": "AQI > 300 (Severe)", "T-04": "Heat > 45°C (11am–4pm)", "T-05": "Curfew / Section 144", "T-06": "Cyclone Alert (IMD)", "T-07": "Platform Outage > 4hr" };
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <div style={{ width: "8px", height: "8px", background: "#4ade80", borderRadius: "50%", flexShrink: 0 }} />
                    <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)" }}>{t} — {labels[t] || t}</span>
                  </div>
                );
              })}
            </div>

            {/* Policy details */}
            <div style={S.card}>
              <h3 style={{ ...S.h3, fontSize: "13px", letterSpacing: "0.5px", marginBottom: "14px", color: "rgba(255,255,255,0.5)" }}>POLICY DETAILS</h3>
              {[
                ["Plan", planData?.name],
                ["Weekly Cap", `₹${Number(policy.coverage_cap).toLocaleString("en-IN")}`],
                ["Premium", `₹${policy.adjusted_premium}/week`],
                ["Multiplier", `×${policy.premium_multiplier}`],
                ["AutoPay", "Every Monday 6:00 AM"],
                ["Status", policy.status?.toUpperCase()],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                  <span style={{ ...S.muted, fontSize: "13px" }}>{k}</span>
                  <span style={{ fontSize: "13px", color: k === "Status" ? "#4ade80" : "#fff", fontWeight: "500" }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Cancel */}
            <div
              style={{ ...S.card, background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)" }}
              onClick={() => setConfirm({ type: "cancel" })}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", margin: 0 }}>Cancel Plan</p>
                  <p style={S.muted}>Pro-rated refund for unused days</p>
                </div>
                <Icon name="chevronRight" size={16} color="rgba(255,255,255,0.3)" />
              </div>
            </div>
          </>
        ) : (
          <div style={{ ...S.card, textAlign: "center", padding: "40px 20px" }}>
            <Icon name="shield" size={40} color="rgba(255,255,255,0.1)" />
            <p style={{ ...S.body, marginTop: "16px" }}>No active policy found.</p>
            <p style={S.muted}>Complete onboarding to get covered.</p>
          </div>
        )}
      </div>

      <ConfirmModal
        visible={!!confirm}
        title={confirm?.type === "cancel" ? "Cancel policy?" : `Switch to ${PLANS.find((plan) => plan.id === confirm?.planType)?.name || "new plan"}?`}
        body={confirm?.type === "cancel"
          ? "This will cancel your active coverage and calculate a pro-rated refund for the unused period."
          : "This will update your policy using the backend rules and persist the change in Supabase."}
        confirmLabel={confirm?.type === "cancel" ? "Cancel Policy" : "Switch Plan"}
        cancelLabel="Keep Policy"
        danger={confirm?.type === "cancel"}
        loading={acting}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (confirm?.type === "cancel") {
            await cancelPolicy("User requested cancellation from app");
          } else if (confirm?.planType) {
            await switchPlan(confirm.planType, "immediate");
          }
          setConfirm(null);
        }}
      />
    </div>
  );
}

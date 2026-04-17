import React from "react";
import AlertBanner from "../components/AlertBanner";
import TriggerBadge from "../components/TriggerBadge";
import PulsingDot from "../components/PulsingDot";
import Icon from "../components/Icon";
import { useClaimDetail } from "../hooks/useClaimDetail";
import { S } from "../styles/styles";

const MOCK_ACTIVITIES = [
  { icon: "zap", label: "Trigger Check", date: "Today, 4:15 PM", status: "PASSIVE" },
  { icon: "shield", label: "Coverage Active", date: "This week", status: "ACTIVE" },
];

export default function HomeTab({ user, policy, planData, activeTrigger, recentPayout, session }) {
  const earned = user?.declared_weekly_earnings || 4200;
  const totalPayout = Number(user?.total_payout || 0);

  const coverageCap = planData?.weeklyPremium ? planData.weeklyPremium * 20 : 4000;
  const protectedPct = Math.min(99, Math.round((coverageCap / earned) * 100));
  const protected_ = Math.round(earned * (protectedPct / 100));

  const { claims: allClaims } = useClaimDetail(user?.id);

  const activeSince = policy?.started_at
    ? new Date(policy.started_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  const nextRenewal = policy?.ends_at
    ? new Date(policy.ends_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <div>
      {/* Top bar */}
      <div style={S.topBar}>
        <div>
          <p style={{ ...S.muted, marginBottom: "2px" }}>
            Hey {user?.name?.split(" ")[0] || "there"} 👋
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <PulsingDot />
            <span style={{ fontSize: "13px", color: "#4ade80", fontWeight: "600" }}>
              Coverage Active
            </span>
          </div>
        </div>

        <div
          style={{
            width: "36px",
            height: "36px",
            background: "rgba(255,255,255,0.06)",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="bell" size={18} color="rgba(255,255,255,0.6)" />
        </div>
      </div>

      {/* Suspension banner */}
      {policy?.status === "suspended" && (
        <div
          style={{
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "12px",
            padding: "12px 16px",
            margin: "0 16px 12px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <Icon name="alert-circle" size={18} color="#ef4444" />
          <div>
            <p style={{ fontSize: "13px", fontWeight: "600", color: "#fca5a5", margin: 0 }}>
              Coverage Paused
            </p>
            <p style={{ fontSize: "12px", color: "#fca5a5", margin: "2px 0 0" }}>
              Update payment in the app to resume
            </p>
          </div>
        </div>
      )}

      {/* Alert banner */}
      <AlertBanner trigger={activeTrigger} />

      <div style={{ padding: "0 16px" }}>
        {/* Coverage card */}
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(15,52,96,0.8) 0%, rgba(22,101,52,0.4) 100%)",
            border: "1px solid rgba(74,222,128,0.2)",
            borderRadius: "20px",
            padding: "20px",
            marginBottom: "12px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-30px",
              right: "-30px",
              width: "120px",
              height: "120px",
              background: "rgba(74,222,128,0.06)",
              borderRadius: "50%",
            }}
          />

          <div style={{ ...S.badge("#4ade80"), marginBottom: "12px" }}>
            <PulsingDot /> PROTECTED
          </div>

          <h2 style={{ fontSize: "28px", fontWeight: "800", color: "#fff", margin: 0 }}>
            {planData?.name || "ProShield"}
          </h2>

          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", margin: "4px 0 18px", lineHeight: 1.5 }}>
            ₹{planData?.weeklyPremium}/week · income protection active
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <p style={{ ...S.label, marginBottom: "4px" }}>ACTIVE SINCE</p>
              <p style={{ color: "#fff", margin: 0, fontWeight: 600, fontSize: "14px" }}>{activeSince}</p>
            </div>
            <div>
              <p style={{ ...S.label, marginBottom: "4px" }}>NEXT RENEWAL</p>
              <p style={{ color: "#fff", margin: 0, fontWeight: 600, fontSize: "14px" }}>{nextRenewal}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div style={S.card}>
            <p style={S.label}>TOTAL PAID OUT</p>
            <p style={{ color: "#fff", fontWeight: "700" }}>₹{totalPayout.toLocaleString("en-IN")}</p>
          </div>

          <div style={S.card}>
            <p style={S.label}>CLAIMS</p>
            <p style={{ color: "#fff", fontWeight: "700" }}>{user?.claims_count || 0}</p>
          </div>
        </div>

        {/* Earnings protected */}
        <div style={S.card}>
          <p style={S.label}>EARNINGS PROTECTED THIS WEEK</p>
          <p style={{ color: "#fff", fontWeight: "700" }}>{protectedPct}%</p>
        </div>

        {/* Weekly payout cap */}
        {policy?.current_week_payout > 0 && (
          <div style={S.card}>
            <p style={S.label}>WEEKLY PAYOUT CAP</p>

            <div
              style={{
                height: "6px",
                background: "#222",
                borderRadius: "3px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.min(
                    100,
                    (policy.current_week_payout / coverageCap) * 100
                  )}%`,
                  height: "100%",
                  background: "#4ade80",
                }}
              />
            </div>
          </div>
        )}

        {/* Activity */}
        <div style={S.card}>
          {allClaims?.length > 0
            ? allClaims.map((claim) => (
                <div key={claim.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "30px", height: "30px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name={claim.status === "approved" ? "check-circle" : claim.status === "flagged" ? "alert-circle" : "clock"} size={14} color={claim.status === "approved" ? "#4ade80" : claim.status === "flagged" ? "#f97316" : "rgba(255,255,255,0.4)"} />
                    </div>
                    <div>
                      <TriggerBadge code={claim.triggers?.type} />
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>{new Date(claim.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, color: "#fff", fontWeight: 800 }}>₹{Number(claim.amount || 0).toLocaleString("en-IN")}</p>
                    <span style={S.statusPill(claim.status)}>{claim.status?.toUpperCase()}</span>
                  </div>
                </div>
              ))
            : MOCK_ACTIVITIES.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", borderBottom: i < MOCK_ACTIVITIES.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <div style={{ width: "30px", height: "30px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={a.icon} size={14} color="rgba(255,255,255,0.4)" />
                  </div>
                  <div>
                    <p style={{ fontSize: "13px", color: "#fff", fontWeight: "500", margin: 0 }}>{a.label}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>{a.date}</p>
                  </div>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}

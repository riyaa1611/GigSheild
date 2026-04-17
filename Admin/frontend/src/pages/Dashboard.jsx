import React, { useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api";
import { useRealtimeTriggers, useRealtimeClaims, useRealtimePayouts, useActiveUserCount } from "../hooks/useRealtime";
import TriggerBadge from "../components/TriggerBadge";
import { AS } from "../styles/adminStyles";
import { FRAUD_CRITERIA, getFraudCriteria } from "../lib/fraudCriteria";

export default function Dashboard({ token }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const { triggers, newTrigger } = useRealtimeTriggers();
  const { flaggedCount } = useRealtimeClaims();
  const { recentPayouts } = useRealtimePayouts();
  const activeUsers = useActiveUserCount();

  useEffect(() => {
    apiGet("/admin/analytics", token).then((d) => { setMetrics(d); setLoading(false); }).catch(() => setLoading(false));
  }, [token]);

  if (loading) return <div style={{ color: "rgba(255,255,255,0.4)", padding: "40px" }}>Loading dashboard...</div>;

  const fraudCounts = {
    auto_approve: metrics?.fraudStats?.autoApproved || 0,
    secondary_validation: metrics?.fraudStats?.flagged || 0,
    manual_review: metrics?.fraudStats?.manualReview || 0,
  };

  const fraudTotal = fraudCounts.auto_approve + fraudCounts.secondary_validation + fraudCounts.manual_review;

  const stats = [
    { label: "Active Workers", value: activeUsers, accent: "#4ade80", icon: "👥" },
    { label: "Claims This Week", value: metrics?.claimsThisWeek || 0, accent: "#3b82f6", icon: "⚡" },
    { label: "Total Paid Out", value: `₹${(metrics?.totalPaidOut || 0).toLocaleString("en-IN")}`, accent: "#f59e0b", icon: "💰" },
    { label: "Loss Ratio", value: `${metrics?.lossRatio || 0}%`, accent: metrics?.lossRatio > 80 ? "#ef4444" : "#4ade80", icon: "📉" },
    { label: "Avg Payout Time", value: `${metrics?.avgPayoutTimeMinutes || 0} min`, accent: "#a855f7", icon: "⏱️" },
    { label: "Flagged Claims", value: flaggedCount, accent: "#ef4444", icon: "🚨", alert: flaggedCount > 0 },
  ];

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={AS.topBar}>
        <div>
          <h1 style={AS.h1}>Dashboard</h1>
          <p style={AS.muted}>Real-time platform overview</p>
        </div>
        {newTrigger && (
          <div style={{ ...AS.badge("#ef4444"), fontSize: "12px", padding: "6px 14px", animation: "pulse 1s infinite" }}>
            🚨 New trigger: {newTrigger.type} in {newTrigger.zone_city}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {stats.map((s) => (
          <div key={s.label} style={{ ...AS.statCard, borderColor: s.alert ? "rgba(239,68,68,0.3)" : undefined }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={AS.label}>{s.label}</p>
                <p style={{ fontSize: "28px", fontWeight: "900", color: s.accent, margin: "4px 0 0" }}>{s.value}</p>
              </div>
              <span style={{ fontSize: "24px" }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div style={AS.card}>
          <p style={{ ...AS.label, marginBottom: "14px" }}>LIVE TRIGGERS (LAST 8H)</p>
          {triggers.slice(0, 6).map((t) => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <TriggerBadge code={t.type} />
                <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>{t.zone_city}</span>
              </div>
              <span style={AS.muted}>
                {new Date(t.triggered_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
          {triggers.length === 0 && <p style={AS.muted}>No triggers in last 8 hours</p>}
        </div>

        <div style={AS.card}>
          <p style={{ ...AS.label, marginBottom: "14px" }}>RECENT PAYOUTS (REALTIME)</p>
          {recentPayouts.slice(0, 6).map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div>
                <p style={{ fontSize: "13px", color: "#fff", fontWeight: "500", margin: 0 }}>{p.users?.name || p.users?.phone || "Worker"}</p>
                <p style={AS.muted}>{new Date(p.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <span style={{ fontSize: "15px", fontWeight: "700", color: "#4ade80" }}>₹{Number(p.amount).toLocaleString("en-IN")}</span>
            </div>
          ))}
          {recentPayouts.length === 0 && <p style={AS.muted}>No payouts yet today</p>}
        </div>

        <div style={AS.card}>
          <p style={{ ...AS.label, marginBottom: "14px" }}>FRAUD DETECTION SUMMARY</p>
          {FRAUD_CRITERIA.map((item) => {
            const pct = fraudTotal > 0 ? Math.round((fraudCounts[item.key] / fraudTotal) * 100) : 0;
            return (
              <div key={item.label} style={{ marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>{item.label} ({item.band})</span>
                  <span style={{ fontSize: "12px", color: item.color, fontWeight: "600" }}>{fraudCounts[item.key]} ({pct}%)</span>
                </div>
                <div style={{ height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: item.color, borderRadius: "2px", transition: "width 0.5s" }} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={AS.card}>
          <p style={{ ...AS.label, marginBottom: "14px" }}>ML SERVICE STATUS</p>
          <MLHealthWidget token={token} />
        </div>

        <MLFraudDetectorCard token={token} />
        <MLPremiumCalculatorCard token={token} />
      </div>
    </div>
  );
}

function MLHealthWidget({ token }) {
  const [health, setHealth] = useState(null);
  useEffect(() => {
    apiGet("/admin/ml/health", token).then(setHealth).catch(() => setHealth({ status: "unavailable" }));
  }, [token]);
  if (!health) return <p style={AS.muted}>Checking ML service...</p>;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: health.status === "ok" ? "#4ade80" : "#ef4444" }} />
        <span style={{ fontSize: "14px", color: health.status === "ok" ? "#4ade80" : "#f87171", fontWeight: "600" }}>
          {health.status === "ok" ? "ML Service Online" : "ML Service Offline"}
        </span>
      </div>
      {health.modelsLoaded && Object.entries(health.modelsLoaded).map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", textTransform: "capitalize" }}>{k} model</span>
          <span style={{ fontSize: "11px", color: v ? "#4ade80" : "#f59e0b" }}>
            {v ? "✓ Loaded" : "⚠ Fallback"}
            {health.modelVersions?.[k] ? ` (${health.modelVersions[k]})` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function MLFraudDetectorCard({ token }) {
  const [form, setForm] = useState({
    userId: "demo-worker-01",
    triggerId: "demo-trigger-01",
    triggerZonePincode: "400070",
    claimCount30days: 1,
    claimTimingVsPolicyStart: 240,
    lastDeliveryCount: 8,
    platformActiveStatus: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const runDetector = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        userId: form.userId,
        triggerId: form.triggerId,
        triggerZonePincode: form.triggerZonePincode,
        claimCount30days: Number(form.claimCount30days) || 0,
        claimTimingVsPolicyStart: Number(form.claimTimingVsPolicyStart) || 0,
        lastDeliveryCount: Number(form.lastDeliveryCount) || 0,
        platformActiveStatus: !!form.platformActiveStatus,
      };

      const data = await apiPost("/admin/ml/score-fraud", payload, token);
      const fraudScore = Number(data?.fraudScore) || 0;
      setResult({
        ...data,
        fraudScore,
        criteria: getFraudCriteria(fraudScore),
      });
    } catch (err) {
      setError(err.message || "Failed to run detector");
      setResult(null);
    }

    setLoading(false);
  };

  return (
    <div style={{ ...AS.card, gridColumn: "1 / -1" }}>
      <p style={{ ...AS.label, marginBottom: "14px" }}>ML FRAUD DETECTOR (RULE-BASED + ISOLATION FOREST V1)</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px", marginBottom: "14px" }}>
        <div style={{ ...AS.statCard, padding: "12px" }}>
          <p style={AS.muted}>Trigger Event</p>
          <p style={{ fontSize: "13px", fontWeight: "700", marginTop: "4px" }}>Weather / AQI / Curfew</p>
        </div>
        <div style={{ ...AS.statCard, padding: "12px" }}>
          <p style={AS.muted}>Worker Context Validator</p>
          <p style={{ fontSize: "13px", fontWeight: "700", marginTop: "4px" }}>Zone + Activity Checks</p>
        </div>
        <div style={{ ...AS.statCard, padding: "12px" }}>
          <p style={AS.muted}>Isolation Forest Fraud Detector</p>
          <p style={{ fontSize: "13px", fontWeight: "700", marginTop: "4px" }}>Risk Score Output</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px", marginBottom: "18px" }}>
        {FRAUD_CRITERIA.map((criterion) => {
          const isActive = result?.criteria?.key === criterion.key;
          return (
            <div
              key={criterion.key}
              style={{
                border: `1px solid ${isActive ? criterion.color + "80" : "rgba(255,255,255,0.08)"}`,
                borderRadius: "12px",
                padding: "12px",
                background: isActive ? criterion.color + "12" : "rgba(255,255,255,0.02)",
              }}
            >
              <p style={{ ...AS.muted, marginBottom: "4px" }}>{criterion.band}</p>
              <p style={{ fontSize: "13px", fontWeight: "700", color: criterion.color }}>{criterion.label}</p>
            </div>
          );
        })}
      </div>

      <form onSubmit={runDetector}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px", marginBottom: "10px" }}>
          <input style={AS.input} value={form.userId} onChange={(e) => updateField("userId", e.target.value)} placeholder="User ID" required />
          <input style={AS.input} value={form.triggerId} onChange={(e) => updateField("triggerId", e.target.value)} placeholder="Trigger ID" required />
          <input style={AS.input} value={form.triggerZonePincode} onChange={(e) => updateField("triggerZonePincode", e.target.value)} placeholder="Trigger Zone Pincode" required />
          <input style={AS.input} type="number" min="0" value={form.claimCount30days} onChange={(e) => updateField("claimCount30days", e.target.value)} placeholder="Claims in last 30 days" />
          <input style={AS.input} type="number" min="0" value={form.claimTimingVsPolicyStart} onChange={(e) => updateField("claimTimingVsPolicyStart", e.target.value)} placeholder="Claim timing vs policy start (minutes)" />
          <input style={AS.input} type="number" min="0" value={form.lastDeliveryCount} onChange={(e) => updateField("lastDeliveryCount", e.target.value)} placeholder="Last delivery count" />
        </div>

        <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "rgba(255,255,255,0.7)", marginBottom: "12px" }}>
          <input
            type="checkbox"
            checked={!!form.platformActiveStatus}
            onChange={(e) => updateField("platformActiveStatus", e.target.checked)}
          />
          Platform active status
        </label>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <button style={AS.btn("primary")} type="submit" disabled={loading}>
            {loading ? "Running Detector..." : "Run ML Fraud Detector"}
          </button>
          {error && <span style={{ color: "#f87171", fontSize: "12px" }}>{error}</span>}
        </div>
      </form>

      {result && (
        <div style={{ ...AS.statCard, marginTop: "8px", border: `1px solid ${result.criteria.color}50` }}>
          <p style={AS.label}>DETECTOR RESULT</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <p style={{ fontSize: "18px", fontWeight: "800", color: result.criteria.color, margin: 0 }}>
              Fraud Score: {(result.fraudScore * 100).toFixed(1)}%
            </p>
            <span style={AS.badge(result.criteria.color)}>{result.criteria.label}</span>
          </div>
          <p style={{ ...AS.muted, marginTop: "6px" }}>
            Criteria matched: {result.criteria.band} | Model decision: {result.decision || "n/a"}
            {result.modelVersion ? ` | ${result.modelVersion}` : ""}
          </p>
          {Array.isArray(result.flags) && result.flags.length > 0 && (
            <div style={{ marginTop: "8px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {result.flags.map((flag) => (
                <span key={flag} style={{ ...AS.badge("#f59e0b"), fontSize: "10px" }}>{flag}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MLPremiumCalculatorCard({ token }) {
  const [form, setForm] = useState({
    userId: "demo-worker-01",
    zonePincode: "400070",
    zoneRiskScore: 0.85,
    platform: "zomato",
    avgWeeklyHours: 56,
    claimHistoryCount: 1,
    currentMonth: new Date().getMonth() + 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const runCalculator = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        userId: form.userId,
        zonePincode: form.zonePincode,
        zoneRiskScore: Number(form.zoneRiskScore) || 0,
        platform: form.platform,
        avgWeeklyHours: Number(form.avgWeeklyHours) || 0,
        claimHistoryCount: Number(form.claimHistoryCount) || 0,
        currentMonth: Number(form.currentMonth) || 1,
      };

      const data = await apiPost("/admin/ml/predict-premium", payload, token);
      setResult(data);
    } catch (err) {
      setError(err.message || "Failed to calculate premium");
      setResult(null);
    }

    setLoading(false);
  };

  return (
    <div style={{ ...AS.card, gridColumn: "1 / -1" }}>
      <p style={{ ...AS.label, marginBottom: "14px" }}>DYNAMIC PREMIUM CALCULATION (XGBOOST V1)</p>

      <form onSubmit={runCalculator}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "10px", marginBottom: "10px" }}>
          <input style={AS.input} value={form.userId} onChange={(e) => updateField("userId", e.target.value)} placeholder="User ID" required />
          <input style={AS.input} value={form.zonePincode} onChange={(e) => updateField("zonePincode", e.target.value)} placeholder="Zone Pincode" required />
          <input style={AS.input} type="number" step="0.01" min="0" value={form.zoneRiskScore} onChange={(e) => updateField("zoneRiskScore", e.target.value)} placeholder="Zone Risk Score" />
          <input style={AS.input} value={form.platform} onChange={(e) => updateField("platform", e.target.value)} placeholder="Platform" />
          <input style={AS.input} type="number" min="0" step="0.1" value={form.avgWeeklyHours} onChange={(e) => updateField("avgWeeklyHours", e.target.value)} placeholder="Avg Weekly Hours" />
          <input style={AS.input} type="number" min="0" value={form.claimHistoryCount} onChange={(e) => updateField("claimHistoryCount", e.target.value)} placeholder="Claim History Count" />
          <input style={AS.input} type="number" min="1" max="12" value={form.currentMonth} onChange={(e) => updateField("currentMonth", e.target.value)} placeholder="Current Month" />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <button style={AS.btn("primary")} type="submit" disabled={loading}>
            {loading ? "Calculating..." : "Run Dynamic Premium Model"}
          </button>
          {error && <span style={{ color: "#f87171", fontSize: "12px" }}>{error}</span>}
        </div>
      </form>

      {result && (
        <div style={{ ...AS.statCard, marginTop: "8px", border: "1px solid rgba(74,222,128,0.35)" }}>
          <p style={AS.label}>PREMIUM RESULT</p>
          <p style={{ fontSize: "20px", fontWeight: "900", color: "#4ade80", margin: "0 0 10px" }}>
            Multiplier: x{Number(result.multiplier || 0).toFixed(3)}
          </p>
          <p style={{ ...AS.muted, marginBottom: "12px" }}>
            Zone: {result.zone || "n/a"}
            {result.modelVersion ? ` | ${result.modelVersion}` : ""}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px", marginBottom: "10px" }}>
            {(result.adjustedPlans || []).map((plan) => (
              <div key={plan.planId} style={{ ...AS.card, marginBottom: 0, padding: "12px" }}>
                <p style={AS.muted}>{plan.planId}</p>
                <p style={{ fontSize: "16px", fontWeight: "800", margin: "2px 0 0" }}>₹{plan.adjustedPremium}/wk</p>
                <p style={{ ...AS.muted, marginTop: "2px" }}>Base ₹{plan.basePremium}</p>
              </div>
            ))}
          </div>

          {result.breakdown && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" }}>
              {Object.entries(result.breakdown).map(([key, value]) => (
                <div key={key} style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>
                  <span style={{ color: "rgba(255,255,255,0.35)", textTransform: "capitalize" }}>{key}: </span>
                  <span>{String(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

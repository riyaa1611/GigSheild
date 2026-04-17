import React, { useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { AS, TRIGGER_COLORS } from "../styles/adminStyles";

export default function Analytics({ token }) {
  const [metrics, setMetrics] = useState(null);
  const [claimsData, setClaimsData] = useState([]);
  const [triggerData, setTriggerData] = useState([]);
  const [planData, setPlanData] = useState([]);

  useEffect(() => {
    const cached = sessionStorage.getItem("admin.analytics.cache");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setMetrics(parsed.metrics || null);
        setClaimsData(parsed.claimsData || []);
        setTriggerData(parsed.triggerData || []);
        setPlanData(parsed.planData || []);
      } catch (_) {}
    }

    Promise.allSettled([
      apiGet("/admin/analytics", token),
      apiGet("/admin/analytics/claims-vs-premiums", token, { days: 30 }),
      apiGet("/admin/analytics/triggers", token, { days: 30 }),
      apiGet("/admin/analytics/plans", token),
    ]).then(([m, c, t, p]) => {
      const nextMetrics = m.status === "fulfilled" ? m.value : metrics;
      const nextClaims = c.status === "fulfilled" ? c.value : claimsData;
      const nextTrigger = t.status === "fulfilled" ? t.value : triggerData;
      const nextPlans = p.status === "fulfilled" ? p.value : planData;

      setMetrics(nextMetrics || null);
      setClaimsData(nextClaims || []);
      setTriggerData(nextTrigger || []);
      setPlanData(nextPlans || []);

      sessionStorage.setItem(
        "admin.analytics.cache",
        JSON.stringify({
          metrics: nextMetrics || null,
          claimsData: nextClaims || [],
          triggerData: nextTrigger || [],
          planData: nextPlans || [],
        })
      );
    });
  }, [token]);

  const PIE_COLORS = ["#3b82f6", "#4ade80", "#a855f7"];

  return (
    <div>
      <div style={AS.topBar}>
        <div><h1 style={AS.h1}>Analytics</h1><p style={AS.muted}>Platform performance and loss ratios</p></div>
      </div>

      {metrics && (
        <div style={{ ...AS.grid4, marginBottom: "24px" }}>
          {[
            { label: "Total Paid Out", value: `₹${(metrics.totalPaidOut || 0).toLocaleString("en-IN")}`, accent: "#4ade80" },
            { label: "Loss Ratio", value: `${metrics.lossRatio}%`, accent: metrics.lossRatio > 80 ? "#ef4444" : "#4ade80" },
            { label: "Avg Payout Time", value: `${metrics.avgPayoutTimeMinutes} min`, accent: "#3b82f6" },
            { label: "Active Policies", value: metrics.totalActiveUsers, accent: "#a855f7" },
          ].map((s) => (
            <div key={s.label} style={AS.statCard}>
              <p style={AS.label}>{s.label}</p>
              <p style={{ fontSize: "26px", fontWeight: "800", color: s.accent, margin: "4px 0 0" }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ ...AS.card, marginBottom: "16px" }}>
        <p style={{ ...AS.label, marginBottom: "16px" }}>CLAIMS PAID vs PREMIUMS COLLECTED (30 days)</p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={claimsData}>
            <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
            <Tooltip contentStyle={{ background: "#13131e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }} />
            <Legend />
            <Line type="monotone" dataKey="claimsAmount" stroke="#ef4444" strokeWidth={2} dot={false} name="Claims Paid" />
            <Line type="monotone" dataKey="premiumsCollected" stroke="#4ade80" strokeWidth={2} dot={false} name="Premiums Collected" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={AS.grid2}>
        <div style={AS.card}>
          <p style={{ ...AS.label, marginBottom: "16px" }}>TRIGGER FREQUENCY (30 days)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={triggerData}>
              <XAxis dataKey="type" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#13131e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#3b82f6">
                {triggerData.map((entry, i) => <Cell key={i} fill={TRIGGER_COLORS[entry.type] || "#3b82f6"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={AS.card}>
          <p style={{ ...AS.label, marginBottom: "16px" }}>PLAN DISTRIBUTION</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={planData} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {planData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Legend />
              <Tooltip contentStyle={{ background: "#13131e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

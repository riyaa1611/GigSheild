import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import Icon from "../components/Icon";
import { S } from "../styles/styles";

const PLATFORMS = [
  { id: "zomato", label: "Zomato", color: "#ef4444" },
  { id: "swiggy", label: "Swiggy", color: "#f97316" },
  { id: "zepto", label: "Zepto", color: "#8b5cf6" },
  { id: "blinkit", label: "Blinkit", color: "#eab308" },
  { id: "amazon", label: "Amazon", color: "#3b82f6" },
];

export default function SignupCompanyScreen({ params, onNext }) {
  const [form, setForm] = useState({ company: "zomato", employeeId: "" });
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("users")
      .update({ platform_type: form.company, platform_id: form.employeeId })
      .eq("id", params.user.id)
      .select().single();
    onNext("signup_kyc", { ...params, user: data || params.user });
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", padding: "48px 24px 40px" }}>
      <button style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", marginBottom: "32px", textAlign: "left", display: "flex", alignItems: "center", gap: "6px", fontFamily: "inherit" }} onClick={() => onNext("otp", params)}>
        <Icon name="chevronLeft" size={18} /> Back
      </button>
      <div style={{ flex: 1 }}>
        <span style={S.label}>01 — PLATFORM</span>
        <h2 style={{ ...S.h2, fontSize: "26px", marginBottom: "8px", marginTop: "8px" }}>Which platform<br />do you work on?</h2>
        <p style={{ ...S.body, marginBottom: "24px" }}>We'll verify your gig partner status.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
          {PLATFORMS.map(p => (
            <div key={p.id} onClick={() => setForm(f => ({ ...f, company: p.id }))} style={{
              ...S.card,
              border: `1.5px solid ${form.company === p.id ? p.color : "rgba(255,255,255,0.07)"}`,
              background: form.company === p.id ? p.color + "12" : "rgba(255,255,255,0.03)",
              cursor: "pointer", textAlign: "center", padding: "14px", marginBottom: 0
            }}>
              <div style={{ fontSize: "20px", marginBottom: "4px" }}>
                {p.id === "zomato" ? "🍕" : p.id === "swiggy" ? "🛵" : p.id === "zepto" ? "⚡" : p.id === "blinkit" ? "🛒" : "📦"}
              </div>
              <p style={{ fontSize: "13px", fontWeight: "600", color: form.company === p.id ? p.color : "rgba(255,255,255,0.7)", margin: 0 }}>{p.label}</p>
            </div>
          ))}
        </div>
        <span style={S.label}>PARTNER / EMPLOYEE ID</span>
        <input style={S.input} value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} placeholder="e.g. ZMT-12345" />
      </div>
      <button style={S.btn("primary", loading)} disabled={loading} onClick={handleContinue}>
        {loading ? "Saving..." : "Continue →"}
      </button>
    </div>
  );
}

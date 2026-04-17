import React, { useState } from "react";

const dark = {
  bg: "#0d0d14", accent: "#4ade80",
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "20px" },
  input: { width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "14px 16px", color: "#fff", fontSize: "15px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
  btn: { width: "100%", padding: "15px", borderRadius: "14px", border: "none", fontSize: "15px", fontWeight: "600", cursor: "pointer", background: "linear-gradient(135deg, #4ade80, #22c55e)", color: "#0a1a0f", fontFamily: "inherit" },
  label: { fontSize: "11px", color: "rgba(255,255,255,0.4)", letterSpacing: "1px", textTransform: "uppercase", fontWeight: "600", marginBottom: "6px", display: "block" },
  muted: { fontSize: "12px", color: "rgba(255,255,255,0.35)" },
};

export default function AdminLoginScreen({ onSendOTP, loading, error }) {
  const [phone, setPhone] = useState("");

  return (
    <div style={{ minHeight: "100vh", background: dark.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ width: "390px", padding: "48px 32px" }}>
        <div style={{ marginBottom: "40px" }}>
          <p style={{ fontSize: "13px", color: dark.accent, fontWeight: "700", letterSpacing: "2px", marginBottom: "8px" }}>ADMIN CONSOLE</p>
          <h1 style={{ fontSize: "36px", fontWeight: "900", color: "#fff", margin: "0 0 8px" }}>
            Gig<span style={{ color: dark.accent }}>Shield</span>
          </h1>
          <p style={{ ...dark.muted }}>Enter your admin phone number to continue.</p>
        </div>
        <span style={dark.label}>ADMIN MOBILE NUMBER</span>
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
          <div style={{ ...dark.input, width: "64px", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.5)" }}>+91</div>
          <input style={{ ...dark.input, flex: 1 }} maxLength={10} value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
            placeholder="10-digit number" inputMode="numeric" />
        </div>
        {error && <p style={{ color: "#f87171", fontSize: "13px", marginBottom: "12px" }}>{error}</p>}
        <button style={{ ...dark.btn, opacity: (loading || phone.length !== 10) ? 0.5 : 1 }}
          disabled={loading || phone.length !== 10}
          onClick={() => onSendOTP(phone)}>
          {loading ? "Sending OTP..." : "Send OTP →"}
        </button>
        <p style={{ ...dark.muted, textAlign: "center", marginTop: "16px" }}>Demo OTP: 123456</p>
      </div>
    </div>
  );
}

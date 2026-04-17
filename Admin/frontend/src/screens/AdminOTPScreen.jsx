import React, { useState, useEffect } from "react";

const dark = {
  bg: "#0d0d14", accent: "#4ade80",
  input: { width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "14px 16px", color: "#fff", fontSize: "28px", outline: "none", letterSpacing: "12px", textAlign: "center", boxSizing: "border-box", fontFamily: "inherit" },
  btn: { width: "100%", padding: "15px", borderRadius: "14px", border: "none", fontSize: "15px", fontWeight: "600", cursor: "pointer", background: "linear-gradient(135deg, #4ade80, #22c55e)", color: "#0a1a0f", fontFamily: "inherit" },
  muted: { fontSize: "12px", color: "rgba(255,255,255,0.35)" },
};

export default function AdminOTPScreen({ phone, onVerify, onBack, loading, error }) {
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  return (
    <div style={{ minHeight: "100vh", background: dark.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ width: "390px", padding: "48px 32px" }}>
        <button style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", marginBottom: "32px", display: "flex", alignItems: "center", gap: "6px", fontFamily: "inherit" }} onClick={onBack}>
          ← Back
        </button>
        <h2 style={{ fontSize: "28px", fontWeight: "800", color: "#fff", margin: "0 0 8px" }}>Verify OTP</h2>
        <p style={{ ...dark.muted, marginBottom: "32px" }}>Sent to +91 {phone}. <span style={{ color: dark.accent }}>Demo: 123456</span></p>
        <input style={dark.input} maxLength={6} value={otp}
          onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
          placeholder="——————" inputMode="numeric" autoFocus />
        {error && <p style={{ color: "#f87171", fontSize: "13px", margin: "12px 0 0" }}>{error}</p>}
        <p style={{ ...dark.muted, margin: "12px 0 20px" }}>
          {countdown > 0 ? `Resend in ${countdown}s` : <span style={{ color: dark.accent, cursor: "pointer" }} onClick={() => setCountdown(30)}>Resend OTP</span>}
        </p>
        <button style={{ ...dark.btn, opacity: (loading || otp.length < 6) ? 0.5 : 1 }}
          disabled={loading || otp.length < 6}
          onClick={() => onVerify(otp)}>
          {loading ? "Verifying..." : "Access Admin Console →"}
        </button>
      </div>
    </div>
  );
}

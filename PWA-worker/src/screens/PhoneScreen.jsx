import React, { useMemo, useState } from "react";
import { callFunction } from "../lib/supabase";
import Icon from "../components/Icon";
import { S } from "../styles/styles";

export default function PhoneScreen({ onNext, params }) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const mode = params?.mode === "login" ? "login" : "signup";
  const title = useMemo(() => (mode === "login" ? "Login" : "Register"), [mode]);

  const handleSend = async () => {
    setLoading(true); setError("");
    try {
      const data = await callFunction("send-otp", { phone });
      if (data.success) onNext("otp", { phone, mode });
    } catch (e) {
      setError(e?.message || "Could not send OTP. Try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", padding: "48px 24px 40px" }}>
      <button style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", marginBottom: "32px", textAlign: "left", display: "flex", alignItems: "center", gap: "6px", fontFamily: "inherit" }} onClick={() => onNext("auth_choice", { mode })}>
        <Icon name="chevronLeft" size={18} /> Back
      </button>
      <div style={{ flex: 1 }}>
        <span style={S.label}>{mode === "login" ? "LOGIN" : "REGISTER"}</span>
        <h2 style={{ ...S.h2, fontSize: "28px", marginBottom: "8px", marginTop: "8px" }}>Enter your<br />Mobile Number</h2>
        <p style={{ ...S.body, marginBottom: "32px" }}>We'll send a one-time password to verify your identity and continue to {title}.</p>
        <span style={S.label}>MOBILE NUMBER</span>
        <div style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
          <div style={{ ...S.input, width: "64px", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.5)", flexShrink: 0 }}>+91</div>
          <input
            style={{ ...S.input, flex: 1 }}
            maxLength={10}
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
            placeholder="10-digit number"
            inputMode="numeric"
          />
        </div>
        {error && <p style={{ color: "#f87171", fontSize: "13px", marginBottom: "8px" }}>{error}</p>}
        <p style={{ ...S.muted, marginTop: "8px" }}>Enter a valid 10-digit mobile number.</p>
      </div>
      <button
        style={S.btn("primary", loading || phone.length !== 10)}
        disabled={loading || phone.length !== 10}
        onClick={handleSend}
      >
        {loading ? "Sending OTP..." : "Send OTP →"}
      </button>
    </div>
  );
}

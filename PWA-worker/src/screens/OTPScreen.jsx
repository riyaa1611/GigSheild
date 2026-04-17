import React, { useState, useEffect } from "react";
import { callFunction, supabase } from "../lib/supabase";
import Icon from "../components/Icon";
import { S } from "../styles/styles";

export default function OTPScreen({ params, onNext }) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(30);
  const mode = params?.mode === "login" ? "login" : "signup";

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleVerify = async () => {
    if (otp.length < 6) return;
    setLoading(true); setError("");
    try {
      const data = await callFunction("verify-otp", { phone: params.phone, otp, mode });
      const sessionData = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      };
      await supabase.auth.setSession(sessionData);

      // LOGIN mode: go to app if account exists, otherwise show error.
      if (mode === "login") {
        if (data.userExists) {
          onNext("app", { user: data.user, session: sessionData });
        } else {
          onNext("auth_choice", {
            authError: "No account found for this number. Please sign up first.",
          });
        }
        return;
      }

      // SIGNUP mode: always go through the full onboarding flow.
      onNext("worker_details", { phone: params.phone, user: data.user, session: sessionData });
    } catch (e) {
      const message = e?.message || "Invalid OTP. Try again.";
      if (mode === "login" && /no account|register|not fully registered/i.test(message)) {
        onNext("auth_choice", {
          authError: "No account found for this number. Please complete Sign up first.",
        });
      } else {
        setError(message);
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", padding: "48px 24px 40px" }}>
      <button style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", marginBottom: "32px", textAlign: "left", display: "flex", alignItems: "center", gap: "6px", fontFamily: "inherit" }} onClick={() => onNext("phone", { mode })}>
        <Icon name="chevronLeft" size={18} /> Back
      </button>
      <div style={{ flex: 1 }}>
        <span style={S.label}>{mode === "login" ? "LOGIN VERIFICATION" : "REGISTRATION VERIFICATION"}</span>
        <h2 style={{ ...S.h2, fontSize: "28px", marginBottom: "8px", marginTop: "8px" }}>Enter OTP</h2>
        <p style={{ ...S.body, marginBottom: "32px" }}>Sent to +91 {params?.phone}.</p>
        <span style={S.label}>6-DIGIT CODE</span>
        <input
          style={{ ...S.input, fontSize: "28px", letterSpacing: "12px", textAlign: "center", marginBottom: "16px" }}
          maxLength={6}
          value={otp}
          onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
          placeholder="——————"
          inputMode="numeric"
          autoFocus
        />
        {error && <p style={{ color: "#f87171", fontSize: "13px", marginBottom: "8px" }}>{error}</p>}
        <p style={S.muted}>
          {countdown > 0 ? `Resend in ${countdown}s` : (
            <span style={{ color: "#4ade80", cursor: "pointer" }} onClick={() => { callFunction("send-otp", { phone: params.phone }); setCountdown(30); }}>
              Resend OTP
            </span>
          )}
        </p>
      </div>
      <button
        style={S.btn("primary", loading || otp.length < 6)}
        disabled={loading || otp.length < 6}
        onClick={handleVerify}
      >
        {loading ? "Verifying..." : mode === "login" ? "Verify & Login →" : "Verify & Continue →"}
      </button>
    </div>
  );
}

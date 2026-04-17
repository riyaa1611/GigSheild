import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import Icon from "../components/Icon";
import { S } from "../styles/styles";

export default function SignupKYCScreen({ params, onNext }) {
  const [aadhaar, setAadhaar] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // null | "verified" | "failed"

  const handleVerify = async () => {
    setLoading(true);
    const verified = aadhaar.startsWith("9");
    await supabase
      .from("users")
      .update({ aadhaar_status: verified ? "verified" : "failed", aadhaar_number: aadhaar.slice(-4) })
      .eq("id", params.user.id);
    setStatus(verified ? "verified" : "failed");
    setTimeout(() => onNext("signup_bank", params), 800);
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", padding: "48px 24px 40px" }}>
      <button style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", marginBottom: "32px", textAlign: "left", display: "flex", alignItems: "center", gap: "6px", fontFamily: "inherit" }} onClick={() => onNext("signup_company", params)}>
        <Icon name="chevronLeft" size={18} /> Back
      </button>
      <div style={{ flex: 1 }}>
        <span style={S.label}>02 — KYC VERIFICATION</span>
        <h2 style={{ ...S.h2, fontSize: "26px", marginBottom: "8px", marginTop: "8px" }}>Aadhaar<br />Verification</h2>
        <p style={{ ...S.body, marginBottom: "24px" }}>Required for identity verification and payout processing.</p>

        <div style={{ ...S.card, background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)", marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "10px" }}>
            <Icon name="fingerprint" size={18} color="#60a5fa" />
            <p style={{ ...S.muted, color: "#93c5fd", fontSize: "12px", margin: 0 }}>
              Demo rule: Aadhaar starting with <strong style={{ color: "#60a5fa" }}>9</strong> = Verified. Your data is never stored.
            </p>
          </div>
        </div>

        <span style={S.label}>AADHAAR NUMBER</span>
        <input
          style={{ ...S.input, letterSpacing: "4px", fontSize: "18px" }}
          maxLength={12}
          value={aadhaar}
          onChange={e => setAadhaar(e.target.value.replace(/\D/g, ""))}
          placeholder="XXXX XXXX XXXX"
          inputMode="numeric"
        />
        <p style={{ ...S.muted, marginTop: "8px" }}>{aadhaar.length}/12 digits</p>

        {status === "verified" && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "16px", padding: "12px", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "10px" }}>
            <Icon name="check" size={16} color="#4ade80" />
            <span style={{ fontSize: "13px", color: "#4ade80", fontWeight: "600" }}>Aadhaar Verified Successfully</span>
          </div>
        )}
        {status === "failed" && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "16px", padding: "12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px" }}>
            <Icon name="x" size={16} color="#f87171" />
            <span style={{ fontSize: "13px", color: "#f87171" }}>Verification failed. Try a number starting with 9.</span>
          </div>
        )}
      </div>
      <button
        style={S.btn("primary", loading || aadhaar.length < 12)}
        disabled={loading || aadhaar.length < 12}
        onClick={handleVerify}
      >
        {loading ? "Verifying..." : "Verify Aadhaar →"}
      </button>
    </div>
  );
}

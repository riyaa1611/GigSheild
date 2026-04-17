import React, { useState } from "react";
import { callFunction, supabase } from "../lib/supabase";
import Icon from "../components/Icon";
import { S } from "../styles/styles";

export default function SignupBankScreen({ params, onNext }) {
  const [form, setForm] = useState({ upi: "", bankAcc: "", bankName: "", bankIfsc: "", accountName: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const valid = form.upi.includes("@") || form.bankAcc.length >= 9;

  const handleContinue = async () => {
    setLoading(true);
    setError("");
    try {
      const updates = {
        upiHandle: form.upi || undefined,
        bankAccount: form.bankAcc || undefined,
        bankName: form.bankName || undefined,
        bankIfsc: form.bankIfsc || undefined,
        bankAccountName: form.accountName || undefined,
      };

      const directUpdates = {
        ...(form.upi ? { upi_handle: form.upi } : {}),
        ...(form.bankAcc ? { bank_account: form.bankAcc } : {}),
        ...(form.bankName ? { bank_name: form.bankName } : {}),
        ...(form.bankIfsc ? { bank_ifsc: form.bankIfsc } : {}),
        ...(form.accountName ? { bank_account_name: form.accountName } : {}),
      };

      const { error: userUpdateError } = await supabase
        .from("users")
        .update(directUpdates)
        .eq("id", params.user.id);

      if (userUpdateError) throw userUpdateError;

      if (form.upi) {
        const { error: policyUpdateError } = await supabase
          .from("policies")
          .update({ upi_handle: form.upi })
          .eq("user_id", params.user.id)
          .eq("status", "active");

        if (policyUpdateError) throw policyUpdateError;
      }

      await callFunction("update-upi", updates, params.session).catch(() => null);
      onNext("signup_risk", params);
    } catch (e) {
      setError(e?.message || "Unable to save payout details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", padding: "48px 24px 40px" }}>
      <button style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", marginBottom: "32px", textAlign: "left", display: "flex", alignItems: "center", gap: "6px", fontFamily: "inherit" }} onClick={() => onNext("worker_details", params)}>
        <Icon name="chevronLeft" size={18} /> Back
      </button>
      <div style={{ flex: 1 }}>
        <span style={S.label}>02 — PAYOUT DETAILS</span>
        <h2 style={{ ...S.h2, fontSize: "26px", marginBottom: "8px", marginTop: "8px" }}>Bank & UPI<br />Setup</h2>
        <p style={{ ...S.body, marginBottom: "24px" }}>Payouts are credited instantly to your UPI handle.</p>

        <span style={S.label}>UPI HANDLE</span>
        <input
          style={S.input}
          placeholder="yourname@upi"
          value={form.upi}
          onChange={e => setForm(f => ({ ...f, upi: e.target.value }))}
        />
        <p style={{ ...S.muted, marginTop: "4px", marginBottom: "16px" }}>e.g. raju.mumbai@okaxis or phone@paytm</p>

        <span style={S.label}>BANK ACCOUNT (optional)</span>
        <input
          style={S.input}
          placeholder="Account number"
          value={form.bankAcc}
          onChange={e => setForm(f => ({ ...f, bankAcc: e.target.value.replace(/\D/g, "") }))}
        />

        <span style={{ ...S.label, marginTop: "16px" }}>BANK NAME</span>
        <input
          style={S.input}
          placeholder="State Bank of India"
          value={form.bankName}
          onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <span style={S.label}>IFSC</span>
            <input
              style={S.input}
              placeholder="SBIN0001234"
              value={form.bankIfsc}
              onChange={e => setForm(f => ({ ...f, bankIfsc: e.target.value.toUpperCase() }))}
              maxLength={11}
            />
          </div>
          <div>
            <span style={S.label}>ACCOUNT HOLDER</span>
            <input
              style={S.input}
              placeholder="Rakesh Kumar"
              value={form.accountName}
              onChange={e => setForm(f => ({ ...f, accountName: e.target.value }))}
            />
          </div>
        </div>

        <div style={{ ...S.card, background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.12)", marginTop: "16px" }}>
          <div style={{ display: "flex", gap: "10px" }}>
            <Icon name="zap" size={14} color="#60a5fa" />
            <p style={{ ...S.muted, color: "#93c5fd", fontSize: "12px", margin: 0 }}>
              AutoPay of ₹29–₹79/week is deducted every Monday at 6 AM. Cancel anytime before Sunday midnight.
            </p>
          </div>
        </div>
        {error ? <p style={{ color: "#f87171", fontSize: "13px", marginTop: "12px" }}>{error}</p> : null}
      </div>
      <button style={S.btn("primary", !valid || loading)} disabled={!valid || loading} onClick={handleContinue}>
        {loading ? "Saving..." : "Continue →"}
      </button>
    </div>
  );
}

import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import Icon from "../components/Icon";
import { S } from "../styles/styles";

const CITIES = ["Mumbai", "Delhi", "Ahmedabad", "Bangalore", "Chennai", "Pune", "Kolkata", "Hyderabad"];

export default function SignupProfileScreen({ params, onNext }) {
  const [form, setForm] = useState({ name: "", city: "Mumbai", pincode: "400070", earnings: "4200", hours: "56" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const valid = form.name.length > 2 && form.pincode.length === 6;

  const handleSave = async () => {
    setLoading(true); setError("");
    try {
      const { data, error: updateError } = await supabase
        .from("users")
        .update({
          name: form.name,
          zone_city: form.city,
          zone_pincode: form.pincode,
          declared_weekly_earnings: parseFloat(form.earnings),
          declared_weekly_hours: parseFloat(form.hours)
        })
        .eq("id", params.user.id)
        .select().single();
      if (updateError) throw updateError;
      onNext("select_plan", { user: data, session: params.session });
    } catch (_e) {
      setError("Failed to save profile. Try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", padding: "48px 24px 40px" }}>
      <button style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", marginBottom: "32px", textAlign: "left", display: "flex", alignItems: "center", gap: "6px", fontFamily: "inherit" }} onClick={() => onNext("signup_bank", params)}>
        <Icon name="chevronLeft" size={18} /> Back
      </button>
      <div style={{ flex: 1 }}>
        <span style={S.label}>04 — YOUR PROFILE</span>
        <h2 style={{ ...S.h2, fontSize: "26px", marginBottom: "8px", marginTop: "8px" }}>Personal<br />Details</h2>
        <p style={{ ...S.body, marginBottom: "24px" }}>Helps us calculate your accurate coverage and premium.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <span style={S.label}>FULL NAME</span>
            <input style={S.input} placeholder="Raju Mane" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <span style={S.label}>CITY</span>
            <select style={{ ...S.input, appearance: "none" }} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <span style={S.label}>PINCODE / ZONE</span>
            <input style={S.input} placeholder="400070" maxLength={6} value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value.replace(/\D/g, "") }))} inputMode="numeric" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <span style={S.label}>WEEKLY EARNINGS (₹)</span>
              <input style={S.input} placeholder="4200" value={form.earnings} onChange={e => setForm(f => ({ ...f, earnings: e.target.value.replace(/\D/g, "") }))} inputMode="numeric" />
            </div>
            <div>
              <span style={S.label}>WEEKLY HOURS</span>
              <input style={S.input} placeholder="56" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value.replace(/\D/g, "") }))} inputMode="numeric" />
            </div>
          </div>
        </div>
        {error && <p style={{ color: "#f87171", fontSize: "13px", marginTop: "12px" }}>{error}</p>}
      </div>
      <button style={S.btn("primary", !valid || loading)} disabled={!valid || loading} onClick={handleSave}>
        {loading ? "Saving..." : "Save & Continue →"}
      </button>
    </div>
  );
}

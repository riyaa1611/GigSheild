import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import Icon from "../components/Icon";
import { S } from "../styles/styles";

const CITIES = [
  "Mumbai", "Delhi", "Ahmedabad", "Bangalore",
  "Chennai", "Pune", "Hyderabad", "Chandigarh",
];

const PLATFORMS = [
  { id: "zomato", label: "Zomato", emoji: "🍕", color: "#ef4444" },
  { id: "swiggy", label: "Swiggy", emoji: "🛵", color: "#f97316" },
  { id: "zepto", label: "Zepto", emoji: "⚡", color: "#8b5cf6" },
  { id: "blinkit", label: "Blinkit", emoji: "🛒", color: "#eab308" },
  { id: "amazon", label: "Amazon", emoji: "📦", color: "#3b82f6" },
];

const STEP_COUNT = 4; // total onboarding steps visible to user

export default function WorkerDetailsScreen({ params, onNext }) {
  const [form, setForm] = useState({
    name: "",
    city: "Mumbai",
    platform: "zomato",
    partnerId: "",
    aadhaar: "",
    earnings: "4200",
    hours: "56",
  });
  const [aadhaarStatus, setAadhaarStatus] = useState(null); // null | "verified" | "failed"
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const aadhaarValid = form.aadhaar.length === 12;
  const formValid =
    form.name.trim().length > 2 &&
    aadhaarStatus === "verified";

  const handleVerifyAadhaar = async () => {
    if (!aadhaarValid) return;
    setVerifying(true);
    // Demo: numbers starting with 9 are verified
    const verified = form.aadhaar.startsWith("9");
    await supabase
      .from("users")
      .update({
        aadhaar_status: verified ? "verified" : "failed",
        aadhaar_number: form.aadhaar.slice(-4),
      })
      .eq("id", params.user.id);
    setAadhaarStatus(verified ? "verified" : "failed");
    setVerifying(false);
  };

  const handleContinue = async () => {
    if (!formValid) return;
    setLoading(true);
    setError("");
    try {
      const { data, error: updateError } = await supabase
        .from("users")
        .update({
          name: form.name.trim(),
          zone_city: form.city,
          declared_weekly_earnings: parseFloat(form.earnings) || 4200,
          declared_weekly_hours: parseFloat(form.hours) || 56,
          platform_type: form.platform,
          platform_id: form.partnerId,
        })
        .eq("id", params.user.id)
        .select()
        .single();
      if (updateError) throw updateError;
      onNext("signup_bank", { ...params, user: data || params.user });
    } catch (_e) {
      setError("Failed to save details. Please try again.");
    }
    setLoading(false);
  };

  const selectedPlatform = PLATFORMS.find((p) => p.id === form.platform);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: "#0d0d14",
      }}
    >
      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "48px 24px 120px" }}>
        {/* Back */}
        <button
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "rgba(255,255,255,0.5)",
            marginBottom: "32px",
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontFamily: "inherit",
            padding: 0,
            fontSize: "14px",
          }}
          onClick={() => onNext("otp", params)}
        >
          <Icon name="chevronLeft" size={18} /> Back
        </button>

        {/* Header */}
        <span style={S.label}>01 — WORKER PROFILE</span>
        <h2
          style={{
            ...S.h2,
            fontSize: "28px",
            marginBottom: "6px",
            marginTop: "8px",
            lineHeight: 1.2,
          }}
        >
          Tell us about<br />
          <span style={{ color: "#4ade80" }}>yourself</span>
        </h2>
        <p style={{ ...S.body, marginBottom: "28px" }}>
          Your details help us personalise coverage and verify your identity.
        </p>

        {/* ── SECTION 1: Personal Info ── */}
        <div
          style={{
            ...S.card,
            marginBottom: "16px",
            padding: "20px",
          }}
        >
          <p
            style={{
              ...S.label,
              color: "#4ade80",
              marginBottom: "16px",
              fontSize: "10px",
            }}
          >
            PERSONAL INFORMATION
          </p>

          {/* Full Name */}
          <div style={{ marginBottom: "16px" }}>
            <span style={S.label}>FULL NAME</span>
            <input
              style={S.input}
              placeholder="e.g. Raju Sharma"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
            />
          </div>

          {/* City */}
          <div style={{ marginBottom: "16px" }}>
            <span style={S.label}>CITY YOU WORK IN</span>
            <select
              style={{ ...S.input, appearance: "none", cursor: "pointer" }}
              value={form.city}
              onChange={(e) =>
                setForm((f) => ({ ...f, city: e.target.value }))
              }
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Earnings + Hours */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            <div>
              <span style={S.label}>WEEKLY EARNINGS (₹)</span>
              <input
                style={S.input}
                placeholder="4200"
                value={form.earnings}
                inputMode="numeric"
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    earnings: e.target.value.replace(/\D/g, ""),
                  }))
                }
              />
            </div>
            <div>
              <span style={S.label}>WEEKLY HOURS</span>
              <input
                style={S.input}
                placeholder="56"
                value={form.hours}
                inputMode="numeric"
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    hours: e.target.value.replace(/\D/g, ""),
                  }))
                }
              />
            </div>
          </div>
        </div>

        {/* ── SECTION 2: Platform ── */}
        <div
          style={{
            ...S.card,
            marginBottom: "16px",
            padding: "20px",
          }}
        >
          <p
            style={{
              ...S.label,
              color: "#4ade80",
              marginBottom: "16px",
              fontSize: "10px",
            }}
          >
            GIG PLATFORM
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            {PLATFORMS.map((p) => (
              <div
                key={p.id}
                onClick={() => setForm((f) => ({ ...f, platform: p.id }))}
                style={{
                  padding: "12px",
                  borderRadius: "12px",
                  border: `1.5px solid ${
                    form.platform === p.id
                      ? p.color
                      : "rgba(255,255,255,0.07)"
                  }`,
                  background:
                    form.platform === p.id
                      ? p.color + "14"
                      : "rgba(255,255,255,0.03)",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.18s",
                }}
              >
                <div style={{ fontSize: "22px", marginBottom: "4px" }}>
                  {p.emoji}
                </div>
                <p
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    color:
                      form.platform === p.id
                        ? p.color
                        : "rgba(255,255,255,0.6)",
                    margin: 0,
                  }}
                >
                  {p.label}
                </p>
              </div>
            ))}
          </div>

          <span style={S.label}>PARTNER / EMPLOYEE ID (optional)</span>
          <input
            style={S.input}
            placeholder={`e.g. ${
              selectedPlatform?.id === "zomato"
                ? "ZMT-12345"
                : selectedPlatform?.id === "swiggy"
                ? "SWG-67890"
                : "PARTNER-001"
            }`}
            value={form.partnerId}
            onChange={(e) =>
              setForm((f) => ({ ...f, partnerId: e.target.value }))
            }
          />
        </div>

        {/* ── SECTION 3: Aadhaar Verification ── */}
        <div
          style={{
            ...S.card,
            marginBottom: "16px",
            padding: "20px",
          }}
        >
          <p
            style={{
              ...S.label,
              color: "#4ade80",
              marginBottom: "16px",
              fontSize: "10px",
            }}
          >
            AADHAAR VERIFICATION
          </p>

          {/* Demo hint */}
          <div
            style={{
              background: "rgba(59,130,246,0.06)",
              border: "1px solid rgba(59,130,246,0.15)",
              borderRadius: "10px",
              padding: "10px 14px",
              marginBottom: "16px",
              display: "flex",
              gap: "10px",
              alignItems: "flex-start",
            }}
          >
            <Icon name="fingerprint" size={16} color="#60a5fa" />
            <p
              style={{
                ...S.muted,
                color: "#93c5fd",
                fontSize: "12px",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Demo: Aadhaar starting with{" "}
              <strong style={{ color: "#60a5fa" }}>9</strong> = Verified.
            </p>
          </div>

          <span style={S.label}>AADHAAR NUMBER</span>
          <input
            style={{
              ...S.input,
              letterSpacing: "4px",
              fontSize: "18px",
              marginBottom: "12px",
            }}
            maxLength={12}
            value={form.aadhaar}
            onChange={(e) => {
              setAadhaarStatus(null);
              setForm((f) => ({
                ...f,
                aadhaar: e.target.value.replace(/\D/g, ""),
              }));
            }}
            placeholder="XXXX XXXX XXXX"
            inputMode="numeric"
          />
          <p style={{ ...S.muted, marginBottom: "14px" }}>
            {form.aadhaar.length}/12 digits
          </p>

          {aadhaarStatus === "verified" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 14px",
                background: "rgba(74,222,128,0.08)",
                border: "1px solid rgba(74,222,128,0.22)",
                borderRadius: "10px",
                marginBottom: "12px",
              }}
            >
              <Icon name="check" size={15} color="#4ade80" />
              <span
                style={{ fontSize: "13px", color: "#4ade80", fontWeight: "600" }}
              >
                Aadhaar Verified Successfully
              </span>
            </div>
          )}

          {aadhaarStatus === "failed" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 14px",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: "10px",
                marginBottom: "12px",
              }}
            >
              <Icon name="x" size={15} color="#f87171" />
              <span style={{ fontSize: "13px", color: "#f87171" }}>
                Verification failed. Try a number starting with 9.
              </span>
            </div>
          )}

          {aadhaarStatus !== "verified" && (
            <button
              style={S.btn("secondary", verifying || !aadhaarValid)}
              disabled={verifying || !aadhaarValid}
              onClick={handleVerifyAadhaar}
            >
              {verifying ? "Verifying..." : "Verify Aadhaar →"}
            </button>
          )}
        </div>

        {error && (
          <p style={{ color: "#f87171", fontSize: "13px", marginTop: "4px" }}>
            {error}
          </p>
        )}
      </div>

      {/* Fixed CTA */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          padding: "16px 24px 28px",
          background: "rgba(13,13,20,0.97)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          style={S.btn("primary", !formValid || loading)}
          disabled={!formValid || loading}
          onClick={handleContinue}
        >
          {loading ? "Saving..." : "Continue to Bank Details →"}
        </button>
      </div>
    </div>
  );
}

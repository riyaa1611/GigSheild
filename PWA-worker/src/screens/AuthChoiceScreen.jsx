import React from "react";
import Icon from "../components/Icon";
import { S } from "../styles/styles";

export default function AuthChoiceScreen({ onNext, params }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", padding: "48px 24px 40px", background: "#0d0d14" }}>
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
          fontFamily: "inherit"
        }}
        onClick={() => onNext("welcome")}
      >
        <Icon name="chevronLeft" size={18} /> Back
      </button>

      <div style={{ flex: 1 }}>
        <span style={S.label}>ACCESS</span>
        <h2 style={{ ...S.h2, fontSize: "28px", marginBottom: "8px", marginTop: "8px" }}>Welcome to<br />GigShield</h2>
        <p style={{ ...S.body, marginBottom: "28px" }}>Choose how you want to continue.</p>

        {params?.authError ? (
          <div style={{ ...S.card, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.22)", marginBottom: "20px" }}>
            <p style={{ margin: 0, color: "#fca5a5", fontSize: "13px" }}>{params.authError}</p>
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <button style={S.btn("primary")} onClick={() => onNext("phone", { mode: "signup" })}>
          Register / Sign up
        </button>
        <button style={S.btn("ghost")} onClick={() => onNext("phone", { mode: "login" })}>
          Login
        </button>
      </div>
    </div>
  );
}

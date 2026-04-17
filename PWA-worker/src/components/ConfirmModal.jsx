import React from "react";
import { S } from "../styles/styles";

export default function ConfirmModal({ visible, title, body, confirmLabel = "Confirm", cancelLabel = "Cancel", onConfirm, onCancel, danger = false, loading = false }) {
  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8,8,14,0.52)",
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "18px",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          width: "min(390px, 100%)",
          background: "#13131e",
          borderRadius: "24px",
          padding: "24px 20px 36px",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
        }}
      >
        <div style={{ width: "40px", height: "4px", background: "rgba(255,255,255,0.15)", borderRadius: "2px", margin: "0 auto 20px" }} />
        <h3 style={{ ...S.h3, marginBottom: "8px" }}>{title}</h3>
        <p style={{ ...S.body, marginBottom: "24px" }}>{body}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button style={S.btn(danger ? "danger" : "primary", loading)} disabled={loading} onClick={onConfirm}>
            {loading ? "Processing..." : confirmLabel}
          </button>
          <button style={S.btn("ghost")} onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
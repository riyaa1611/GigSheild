import React from "react";
import { AS } from "../styles/adminStyles";

export default function ConfirmModal({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ ...AS.card, width: "420px", marginBottom: 0 }}>
        <h3 style={{ ...AS.h3, marginBottom: "8px" }}>{title || "Confirm action"}</h3>
        <p style={{ ...AS.body, marginBottom: "16px" }}>{message || "Are you sure?"}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button style={AS.btn("ghost")} onClick={onCancel}>Cancel</button>
          <button style={AS.btn("primary")} onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

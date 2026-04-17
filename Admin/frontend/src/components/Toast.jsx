import React from "react";

export default function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{ position: "fixed", top: "16px", right: "16px", background: "#1a2e1a", border: "1px solid rgba(74,222,128,0.3)", borderRadius: "10px", padding: "10px 16px", fontSize: "13px", color: "#4ade80", zIndex: 999 }}>
      {message}
    </div>
  );
}

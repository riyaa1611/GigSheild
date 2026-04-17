import React from "react";
import { S } from "../styles/styles";

export default function BottomSheet({ visible, title, onClose, children }) {
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
      onClick={onClose}
    >
      <div
        style={{
          width: "min(390px, 100%)",
          background: "#13131e",
          borderRadius: "24px",
          padding: "20px 20px 40px",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: "40px", height: "4px", background: "rgba(255,255,255,0.15)", borderRadius: "2px", margin: "0 auto 16px" }} />
        {title ? <h3 style={{ ...S.h3, marginBottom: "16px" }}>{title}</h3> : null}
        {children}
      </div>
    </div>
  );
}
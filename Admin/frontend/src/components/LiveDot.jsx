import React from "react";

export default function LiveDot({ color = "#4ade80" }) {
  return (
    <div
      style={{
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: color,
        animation: "pulse 1.5s infinite",
      }}
    />
  );
}

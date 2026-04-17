import React from "react";

export default function PulsingDot({ color = "#4ade80" }) {
  return (
    <span style={{ position: "relative", display: "inline-block", width: "8px", height: "8px" }}>
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, opacity: 0.4, animation: "ping 1.5s infinite" }} />
      <span style={{ position: "absolute", inset: "1px", borderRadius: "50%", background: color }} />
    </span>
  );
}

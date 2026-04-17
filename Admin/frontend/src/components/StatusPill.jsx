import React from "react";
import { AS } from "../styles/adminStyles";

export default function StatusPill({ label, color = "#4ade80" }) {
  return <span style={AS.badge(color)}>{label}</span>;
}

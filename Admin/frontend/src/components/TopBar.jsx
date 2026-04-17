import React from "react";
import { AS } from "../styles/adminStyles";

export default function TopBar({ title, subtitle, right }) {
  return (
    <div style={AS.topBar}>
      <div>
        <h1 style={AS.h1}>{title}</h1>
        {subtitle ? <p style={AS.muted}>{subtitle}</p> : null}
      </div>
      {right || null}
    </div>
  );
}

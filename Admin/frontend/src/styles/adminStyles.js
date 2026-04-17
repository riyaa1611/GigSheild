export const AS = {
  app: { background: "#0a0a0f", minHeight: "100vh", display: "flex", fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif", color: "#fff" },
  sidebar: { width: "220px", minHeight: "100vh", background: "#0d0d14", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, zIndex: 100 },
  mainContent: { marginLeft: "220px", flex: 1, padding: "24px", minHeight: "100vh", background: "#0a0a0f" },
  topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" },
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "20px", marginBottom: "16px" },
  statCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "20px" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  grid4: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" },
  grid3: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" },
  h1: { fontSize: "24px", fontWeight: "800", color: "#fff", margin: 0 },
  h2: { fontSize: "18px", fontWeight: "700", color: "#fff", margin: 0 },
  h3: { fontSize: "15px", fontWeight: "600", color: "#fff", margin: 0 },
  label: { fontSize: "11px", color: "rgba(255,255,255,0.4)", letterSpacing: "1px", textTransform: "uppercase", fontWeight: "600", marginBottom: "6px", display: "block" },
  muted: { fontSize: "12px", color: "rgba(255,255,255,0.35)", margin: 0 },
  body: { fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: "1.5" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "10px 14px", textAlign: "left", fontSize: "11px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.8px", textTransform: "uppercase", fontWeight: "600", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  td: { padding: "12px 14px", fontSize: "13px", color: "rgba(255,255,255,0.7)", borderBottom: "1px solid rgba(255,255,255,0.04)" },
  input: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "10px 14px", color: "#fff", fontSize: "14px", outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" },
  btn: (variant = "primary") => ({
    padding: "10px 20px", borderRadius: "10px", border: "none", fontSize: "13px", fontWeight: "600",
    cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
    ...(variant === "primary" ? { background: "linear-gradient(135deg, #4ade80, #22c55e)", color: "#0a1a0f" }
      : variant === "danger" ? { background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }
      : variant === "ghost" ? { background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }
      : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }),
  }),
  badge: (color = "#4ade80") => ({
    display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 9px",
    borderRadius: "20px", fontSize: "11px", fontWeight: "600",
    background: color + "18", color: color, border: `1px solid ${color}30`,
  }),
  navItem: (active) => ({
    display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px",
    cursor: "pointer", borderRadius: "10px", margin: "2px 10px",
    background: active ? "rgba(74,222,128,0.1)" : "transparent",
    color: active ? "#4ade80" : "rgba(255,255,255,0.5)",
    fontSize: "13px", fontWeight: active ? "600" : "400",
    transition: "all 0.15s", textDecoration: "none",
  }),
};

export const TRIGGER_COLORS = {
  "T-01": "#3b82f6", "T-02": "#06b6d4", "T-03": "#6b7280",
  "T-04": "#f59e0b", "T-05": "#ef4444", "T-06": "#8b5cf6", "T-07": "#f97316"
};

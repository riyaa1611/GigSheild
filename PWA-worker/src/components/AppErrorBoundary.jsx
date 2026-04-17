import React from "react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error) {
    console.error("GigShield UI crashed:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0f", color: "#fff", padding: "24px", fontFamily: "DM Sans, sans-serif", textAlign: "center" }}>
          <div style={{ maxWidth: "420px" }}>
            <div style={{ fontSize: "22px", fontWeight: "800", marginBottom: "10px" }}>GigShield failed to render</div>
            <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.65)", lineHeight: 1.5, marginBottom: "18px" }}>
              The app hit a runtime error before drawing the UI. Refresh after this change, or check the console for the captured error.
            </div>
            <pre style={{ whiteSpace: "pre-wrap", textAlign: "left", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "14px", color: "#fca5a5", fontSize: "12px", overflowX: "auto" }}>
              {String(this.state.error?.message || this.state.error || "Unknown error")}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
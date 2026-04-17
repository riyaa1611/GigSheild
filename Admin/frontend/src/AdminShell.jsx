import React, { Suspense, useState } from "react";
import { useActiveUserCount } from "./hooks/useRealtime";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import { AS } from "./styles/adminStyles";

const TriggerMap = React.lazy(() => import("./pages/TriggerMap"));
const ClaimsQueue = React.lazy(() => import("./pages/ClaimsQueue"));
const Analytics = React.lazy(() => import("./pages/Analytics"));
const FraudMonitor = React.lazy(() => import("./pages/FraudMonitor"));
const ForecastMap = React.lazy(() => import("./pages/ForecastMap"));
const Workers = React.lazy(() => import("./pages/Workers"));
const SupportQueue = React.lazy(() => import("./pages/SupportQueue"));

export default function AdminShell({ token, admin, onLogout }) {
  const [page, setPage] = useState("dashboard");
  const activeUserCount = useActiveUserCount();

  const renderPage = () => {
    if (page === "home") {
      return <AdminHome admin={admin} liveCount={activeUserCount} />;
    }

    const pageMap = {
      dashboard: Dashboard,
      "trigger-map": TriggerMap,
      "claims-queue": ClaimsQueue,
      analytics: Analytics,
      "fraud-monitor": FraudMonitor,
      forecast: ForecastMap,
      workers: Workers,
      support: SupportQueue,
    };

    const ActivePage = pageMap[page] || Dashboard;
    return (
      <Suspense fallback={<div style={{ color: "rgba(255,255,255,0.4)", padding: "40px" }}>Loading section...</div>}>
        <ActivePage token={token} />
      </Suspense>
    );
  };

  return (
    <div style={AS.app}>
      <Sidebar activePage={page} onNavigate={setPage} admin={admin} onLogout={onLogout} liveCount={activeUserCount} />
      <main style={AS.mainContent}>
        <PageErrorBoundary onReset={() => setPage("dashboard")}>
          {renderPage()}
        </PageErrorBoundary>
      </main>
    </div>
  );
}

class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Section failed to render" };
  }

  componentDidCatch(error) {
    console.error("[AdminShell] section render error", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{ ...AS.card, border: "1px solid rgba(239,68,68,0.28)", background: "rgba(239,68,68,0.06)" }}>
        <p style={{ ...AS.h3, color: "#fca5a5", marginBottom: "8px" }}>Section crashed and was recovered.</p>
        <p style={{ ...AS.body, color: "rgba(252,165,165,0.9)", marginBottom: "12px" }}>{this.state.message}</p>
        <button
          style={AS.btn("primary")}
          onClick={() => {
            this.setState({ hasError: false, message: "" });
            this.props.onReset?.();
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }
}

function AdminHome({ admin, liveCount }) {
  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={AS.topBar}>
        <div>
          <h1 style={AS.h1}>Admin Home</h1>
          <p style={AS.muted}>Signed in as +91 {admin?.phone}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        <div style={AS.statCard}>
          <p style={AS.label}>Session</p>
          <p style={{ fontSize: "28px", fontWeight: "900", color: "#4ade80", margin: "4px 0 0" }}>Active</p>
        </div>
        <div style={AS.statCard}>
          <p style={AS.label}>Live Workers</p>
          <p style={{ fontSize: "28px", fontWeight: "900", color: "#3b82f6", margin: "4px 0 0" }}>{liveCount || 0}</p>
        </div>
        <div style={AS.statCard}>
          <p style={AS.label}>Next Step</p>
          <p style={{ fontSize: "22px", fontWeight: "800", color: "#f59e0b", margin: "4px 0 0" }}>Choose a section</p>
        </div>
      </div>
    </div>
  );
}

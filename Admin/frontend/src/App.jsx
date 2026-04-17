import React, { useState } from "react";
import { useAdminAuth } from "./hooks/useAdminAuth";
import { supabase } from "./lib/supabase";
import AdminLoginScreen from "./screens/AdminLoginScreen";
import AdminOTPScreen from "./screens/AdminOTPScreen";
import AdminShell from "./AdminShell";

const injectFonts = () => {
  if (document.getElementById("admin-fonts")) return;
  const style = document.createElement("style");
  style.id = "admin-fonts";
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0a0f; color: #fff; font-family: 'DM Sans', sans-serif; }
    ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0a0a0f; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
    input, select, textarea { font-family: inherit; color: #fff; }
    select option { background: #1a1a2e; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  `;
  document.head.appendChild(style);
};

injectFonts();

class AdminShellBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("[AdminApp] shell crash", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ width: "100%", maxWidth: "460px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "20px" }}>
          <p style={{ fontSize: "18px", fontWeight: "800", color: "#fff", margin: "0 0 8px" }}>Could not load Admin Dashboard</p>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", margin: "0 0 14px" }}>Please try again. Your login session is still active.</p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onRetry?.();
            }}
            style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, #4ade80, #22c55e)", color: "#0a1a0f", fontWeight: "700", cursor: "pointer" }}
          >
            Retry Loading Dashboard
          </button>
        </div>
      </div>
    );
  }
}

export default function App() {
  const { token, admin, loading, login, logout } = useAdminAuth();
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [shellKey, setShellKey] = useState(0);

  if (loading) {
    return <div style={{ background: "#0a0a0f", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#4ade80", fontSize: "20px", fontWeight: "800" }}>GigShield Admin</p>
    </div>;
  }

  if (!token || !admin) {
    const handleSendOTP = async (ph) => {
      setAuthLoading(true); setAuthError("");
      try {
        await supabase.functions.invoke("send-otp", { body: { phone: ph } });
        setPhone(ph);
        setStep("otp");
      } catch (e) {
        setAuthError(e.message || "Failed to send OTP");
      }
      setAuthLoading(false);
    };

    const handleVerifyOTP = async (otp) => {
      setAuthLoading(true); setAuthError("");
      try {
        const data = await login(phone, otp);
        if (data.user.role !== "admin") {
          setAuthError("This number is not registered as an admin.");
          logout();
        }
      } catch (e) {
        setAuthError(e.message || "Verification failed");
      }
      setAuthLoading(false);
    };

    if (step === "otp") {
      return <AdminOTPScreen phone={phone} onVerify={handleVerifyOTP} onBack={() => setStep("phone")} loading={authLoading} error={authError} />;
    }
    return <AdminLoginScreen onSendOTP={handleSendOTP} loading={authLoading} error={authError} />;
  }

  return (
    <AdminShellBoundary onRetry={() => setShellKey((k) => k + 1)}>
      <AdminShell key={shellKey} token={token} admin={admin} onLogout={logout} />
    </AdminShellBoundary>
  );
}

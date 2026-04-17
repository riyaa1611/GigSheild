import React, { useEffect, useState } from "react";
import AppShell from "./AppShell";
import { useAuth } from "./hooks/useAuth";
import WelcomeScreen from "./screens/WelcomeScreen";
import AuthChoiceScreen from "./screens/AuthChoiceScreen";
import PhoneScreen from "./screens/PhoneScreen";
import OTPScreen from "./screens/OTPScreen";
import SignupCompanyScreen from "./screens/SignupCompanyScreen";
import SignupKYCScreen from "./screens/SignupKYCScreen";
import RiskProfilingScreen from "./screens/RiskProfilingScreen";
import SignupBankScreen from "./screens/SignupBankScreen";
import SignupProfileScreen from "./screens/SignupProfileScreen";
import SelectPlanScreen from "./screens/SelectPlanScreen";
import UPIAutoPayScreen from "./screens/UPIAutoPayScreen";
import WorkerDetailsScreen from "./screens/WorkerDetailsScreen";
import { requestPushPermission } from "./lib/pwa";
import { S } from "./styles/styles";

function injectStyles() {
  const id = "gs-styles";
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
    * { box-sizing: border-box; }
    ::-webkit-scrollbar { display: none; }
    input, textarea, select { font-family: 'DM Sans', inherit; }
    select option { background: #1a1a2e; color: white; }
    @keyframes ping { 0% { transform: scale(1); opacity: 0.4; } 70% { transform: scale(2.2); opacity: 0; } 100% { transform: scale(2.2); opacity: 0; } }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  `;
  document.head.appendChild(style);
}

export default function App() {
  const { session, user, loading, login, logout } = useAuth();
  const [step, setStep] = useState("welcome");
  const [params, setParams] = useState({});

  useEffect(() => { injectStyles(); }, []);

  const handleLogout = async () => {
    await logout();
    setStep("welcome");
    setParams({});
  };

  const go = (nextStep, nextParams = {}) => {
    setStep(nextStep);
    setParams(nextParams);
    if (nextStep === "app") {
      login(nextParams.session, nextParams.user);
      // Request push permission after login (non-blocking)
      setTimeout(() => requestPushPermission(), 2000);
    }
  };

  if (loading) {
    return (
      <div style={S.app}>
        <div style={{ ...S.phoneFrame, alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "28px", fontWeight: "800", color: "#4ade80" }}>GigShield</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === "app" && session && user) {
    return (
      <div style={S.app}>
        <AppShell user={user} session={session} onLogout={handleLogout} />
      </div>
    );
  }

  return (
    <div style={S.app}>
      <div style={{ ...S.phoneFrame, animation: "fadeIn 0.3s ease" }}>
        {step === "welcome" && <WelcomeScreen onNext={go} />}
        {step === "auth_choice" && <AuthChoiceScreen onNext={go} params={params} />}
        {step === "phone" && <PhoneScreen onNext={go} params={params} />}
        {step === "otp" && <OTPScreen onNext={go} params={params} />}
        {step === "signup_company" && <SignupCompanyScreen params={params} onNext={go} />}
        {step === "signup_kyc" && <SignupKYCScreen params={params} onNext={go} />}
        {step === "worker_details" && <WorkerDetailsScreen params={params} onNext={go} />}
        {step === "signup_risk" && <RiskProfilingScreen params={params} onNext={go} />}
        {step === "signup_bank" && <SignupBankScreen params={params} onNext={go} />}
        {step === "signup_profile" && <SignupProfileScreen params={params} onNext={go} />}
        {step === "select_plan" && <SelectPlanScreen params={params} onNext={go} />}
        {step === "upi_autopay" && <UPIAutoPayScreen params={params} onNext={go} />}
      </div>
    </div>
  );
}

import React, { useEffect, useRef, useState } from "react";
import PulsingDot from "../components/PulsingDot";
import Icon from "../components/Icon";
import { useSupportChat } from "../hooks/useSupportChat";
import { S } from "../styles/styles";

// ─── FAQ Data per category ────────────────────────────────────────────────────
const CATEGORY_FAQS = {
  payouts: [
    {
      q: "When will I receive my payout?",
      a: "Payouts are processed automatically within 24 hours of a qualifying trigger event. You'll receive a notification once your payout is initiated to your registered bank/UPI account.",
      followUps: [
        { q: "Why is my payout delayed?", a: "Delays can occur due to bank processing times (especially on weekends/holidays), or if your bank details need verification. Typically, payouts settle within 1–3 business days after initiation." },
        { q: "I still haven't received my payout after 3 days.", escalate: true },
      ],
    },
    {
      q: "How do I update my bank account or UPI details?",
      a: "Go to the Profile tab or Payouts tab and tap 'Edit Bank Details'. Your new details will be saved immediately and used for all future payouts.",
      followUps: [
        { q: "My UPI ID isn't being accepted.", a: "Make sure your UPI ID is in the correct format (example@upi or phone@bank). Some bank UPI IDs take up to 24 hours to activate. Try again after some time." },
        { q: "I entered wrong bank details and a payout went to the wrong account.", escalate: true },
      ],
    },
    {
      q: "What is the minimum payout amount?",
      a: "The minimum payout threshold is ₹100. If your triggered payout is below this, it will accumulate and be paid out once the balance crosses ₹100.",
      followUps: [
        { q: "That makes sense, thank you!", a: "You're welcome! Is there anything else I can help you with?" },
      ],
    },
    {
      q: "How do I view my payout history?",
      a: "Open the Payouts tab from the bottom navigation bar. You'll see a complete history of all your payouts, including dates, amounts, and status for each transaction.",
      followUps: [],
    },
    {
      q: "My payout was rejected — what should I do?",
      a: "Payout rejections usually happen due to invalid bank details or a closed account. Please verify your bank/UPI details in the Profile tab. If the issue persists, contact support.",
      followUps: [
        { q: "My bank details are correct but the payout was still rejected.", escalate: true },
      ],
    },
  ],
  coverage: [
    {
      q: "What events trigger a payout?",
      a: "GigShield covers 7 parametric triggers: (T-01) Heavy Rain >64mm/hr, (T-02) Flash Flood, (T-03) AQI >300, (T-04) Heatwave >45°C, (T-05) Curfew/Section 144, (T-06) Cyclone Alert, and (T-07) Platform Outage >4 hrs. Your plan determines which triggers are covered.",
      followUps: [
        { q: "My city had heavy rain but I didn't get a payout.", a: "Trigger validation uses official IMD and platform data. The event must meet the exact threshold (e.g., >64mm/hr rainfall at the nearest weather station to your registered pincode). Minor rainfall events may not qualify." },
        { q: "The trigger conditions seem unfair — I was unable to work.", escalate: true },
      ],
    },
    {
      q: "What is the weekly coverage cap?",
      a: "The weekly coverage cap is the maximum payout you can receive in a single week, regardless of the number of triggers. BasicShield: ₹3,000 | ProShield: ₹5,000 | UltraShield: ₹8,000.",
      followUps: [
        { q: "Can I increase my weekly cap?", a: "Yes! Upgrade to a higher plan (ProShield or UltraShield) from the Policy tab to get a higher weekly cap." },
      ],
    },
    {
      q: "Does coverage pause if I take a break from work?",
      a: "No. Your coverage is continuous as long as your policy is active and your premium is paid. Taking time off does not affect your coverage status.",
      followUps: [],
    },
    {
      q: "Am I covered in multiple cities?",
      a: "Your policy is linked to your registered city (zone). Coverage triggers are evaluated for your registered zone. If you frequently work in a different city, contact support to update your zone.",
      followUps: [
        { q: "I work across two cities — how do I handle this?", escalate: true },
      ],
    },
    {
      q: "How does the risk multiplier affect my premium?",
      a: "Your premium is adjusted by a risk multiplier (0.80×–1.35×) based on 15 years of historical weather, AQI, and outage data for your city. Higher-risk cities or seasons have higher multipliers.",
      followUps: [
        { q: "My multiplier seems too high.", escalate: true },
      ],
    },
  ],
  appHelp: [
    {
      q: "How do I change my registered phone number?",
      a: "Phone number changes require identity verification. Please contact our support team — this cannot be done self-service to protect your account security.",
      followUps: [
        { q: "I no longer have access to my old number.", escalate: true },
      ],
    },
    {
      q: "I can't log in to my account.",
      a: "GigShield uses OTP-based login. Make sure you're entering the correct phone number and that you have a working mobile signal to receive the OTP. Check if your SIM is active and not in DND mode.",
      followUps: [
        { q: "I received the OTP but the app still won't log me in.", a: "OTPs expire in 5 minutes. Make sure you're entering the latest OTP. If the issue continues, force-close the app, clear cache, and try again." },
        { q: "I still cannot log in after trying everything.", escalate: true },
      ],
    },
    {
      q: "How do I update my Aadhaar details?",
      a: "Aadhaar details can be updated from the Worker Details section during onboarding. If you've already completed onboarding, contact support — Aadhaar changes require manual review for security.",
      followUps: [
        { q: "My Aadhaar verification keeps failing.", a: "In the demo mode, Aadhaar numbers starting with '9' are verified. In production, ensure your 12-digit Aadhaar number is correct and matches government records." },
        { q: "I entered wrong Aadhaar details and need to correct them.", escalate: true },
      ],
    },
    {
      q: "The app is slow or crashing. What should I do?",
      a: "Try these steps in order: (1) Close and reopen the app. (2) Check your internet connection. (3) Clear your browser/app cache. (4) Update the app to the latest version. Most issues resolve with these steps.",
      followUps: [
        { q: "The app is still crashing after all these steps.", escalate: true },
      ],
    },
    {
      q: "How do I delete my account?",
      a: "Account deletion is an irreversible action. If you have an active policy, it will be cancelled with a pro-rated refund first. Please contact our support team with your registered phone number to initiate deletion.",
      followUps: [
        { q: "Yes, I want to proceed with account deletion.", escalate: true },
      ],
    },
  ],
};

const CATEGORY_META = {
  payouts: { icon: "history", label: "Payouts", color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  coverage: { icon: "shield", label: "Coverage", color: "#60a5fa", bg: "rgba(59,130,246,0.12)" },
  appHelp: { icon: "settings", label: "App Help", color: "#c084fc", bg: "rgba(168,85,247,0.12)" },
};

// ─── Escalation Screen ────────────────────────────────────────────────────────
function LiveChatView({ user, session, onBack }) {
  const { ticket, messages, sending, openOrCreateTicket, sendMessage } = useSupportChat(user?.id, session);
  const [input, setInput] = useState("");
  const [booting, setBooting] = useState(true);
  const endRef = useRef(null);

  useEffect(() => {
    let active = true;
    async function init() {
      if (!user?.id) {
        if (active) setBooting(false);
        return;
      }
      await openOrCreateTicket("Live Support Chat");
      if (active) setBooting(false);
    }
    init();
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, sending]);

  async function submitMessage() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    await sendMessage(text);
  }

  return (
    <div style={{ minHeight: "580px", display: "flex", flexDirection: "column" }}>
      <div style={S.topBar}>
        <button
          type="button"
          onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: "6px", fontFamily: "inherit", fontSize: "14px" }}
        >
          <Icon name="chevronLeft" size={20} /> Back
        </button>
        <h2 style={{ ...S.h2, fontSize: "17px" }}>Live Support Chat</h2>
        <div style={{ width: "48px" }} />
      </div>

      <div style={{ padding: "0 16px" }}>
        <div style={{ ...S.badge("#4ade80"), marginBottom: "10px" }}>
          <PulsingDot />&nbsp;Realtime
        </div>
        <div style={{ ...S.card, padding: "12px 14px", marginBottom: "10px" }}>
          <p style={{ margin: 0, fontSize: "12px", color: "rgba(255,255,255,0.52)", lineHeight: 1.5 }}>
            Ask only GigShield platform queries: plans, policy, payouts, claims, triggers, onboarding, OTP, KYC, account help.
          </p>
          {ticket?.ticket_ref ? (
            <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#4ade80", fontWeight: 600 }}>
              Ticket: {ticket.ticket_ref}
            </p>
          ) : null}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 96px" }}>
        {booting ? (
          <div style={{ ...S.card, textAlign: "center", color: "rgba(255,255,255,0.45)", padding: "24px" }}>
            Connecting to support...
          </div>
        ) : null}

        {!booting && messages.length === 0 ? (
          <div style={{ ...S.card, textAlign: "center", color: "rgba(255,255,255,0.45)", padding: "24px" }}>
            Start a conversation with Sentinel AI.
          </div>
        ) : null}

        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div key={msg.id || `${msg.role}-${msg.created_at || msg.text}`} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: "10px" }}>
              <div
                style={{
                  maxWidth: "86%",
                  borderRadius: "14px",
                  padding: "10px 12px",
                  lineHeight: 1.6,
                  fontSize: "13px",
                  color: isUser ? "#08120b" : "rgba(255,255,255,0.78)",
                  background: isUser ? "linear-gradient(135deg,#4ade80,#22c55e)" : "rgba(255,255,255,0.05)",
                  border: isUser ? "none" : "1px solid rgba(255,255,255,0.08)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div
        style={{
          position: "sticky",
          bottom: 0,
          padding: "10px 16px 12px",
          background: "rgba(13,13,20,0.95)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a platform question..."
            rows={1}
            style={{ ...S.input, marginBottom: 0, minHeight: "46px", maxHeight: "110px", resize: "vertical", paddingTop: "12px", paddingBottom: "12px" }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submitMessage();
              }
            }}
          />
          <button
            type="button"
            onClick={submitMessage}
            disabled={sending || !input.trim()}
            style={{ ...S.btn("primary", sending || !input.trim()), width: "46px", height: "46px", padding: 0, borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="send" size={16} color="#0a1a0f" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Category FAQ Flow ────────────────────────────────────────────────────────
function CategoryView({ categoryKey, onBack, onOpenLiveChat }) {
  const meta = CATEGORY_META[categoryKey];
  const faqs = CATEGORY_FAQS[categoryKey];
  const [selected, setSelected] = useState(null); // index of selected top-level FAQ
  const [followUpSelected, setFollowUpSelected] = useState(null); // index of selected follow-up

  // If a top-level FAQ is selected, show follow-ups
  if (selected !== null) {
    const faq = faqs[selected];
    return (
      <div style={{ padding: "0 16px" }}>
        {/* Back button */}
        <button
          type="button"
          onClick={() => { setSelected(null); setFollowUpSelected(null); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: "6px", fontFamily: "inherit", fontSize: "14px", padding: "0 0 20px 0" }}
        >
          <Icon name="chevronLeft" size={18} /> Back
        </button>

        {/* Question + Answer bubble */}
        <div style={{ ...S.card, background: "rgba(255,255,255,0.04)", marginBottom: "14px" }}>
          <p style={{ fontSize: "14px", fontWeight: "700", color: "#fff", marginBottom: "10px" }}>{faq.q}</p>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", lineHeight: 1.7, margin: 0 }}>{faq.a}</p>
        </div>

        {/* Follow-up options */}
        {faq.followUps && faq.followUps.length > 0 && (
          <>
            <p style={{ ...S.label, marginBottom: "10px" }}>DOES THIS HELP? SELECT YOUR SITUATION</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {faq.followUps.map((fu, i) => {
                const isSelected = followUpSelected === i;
                return (
                  <div key={i}>
                    <button
                      type="button"
                      onClick={() => {
                        if (fu.escalate) { onOpenLiveChat?.(); return; }
                        setFollowUpSelected(isSelected ? null : i);
                      }}
                      style={{
                        width: "100%",
                        background: isSelected ? "rgba(74,222,128,0.07)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isSelected ? "rgba(74,222,128,0.35)" : "rgba(255,255,255,0.08)"}`,
                        borderRadius: "14px",
                        padding: "14px 16px",
                        cursor: "pointer",
                        textAlign: "left",
                        color: isSelected ? "#4ade80" : "rgba(255,255,255,0.7)",
                        fontSize: "13px",
                        fontFamily: "inherit",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "10px",
                        transition: "all 0.18s",
                      }}
                    >
                      {fu.q}
                      {fu.escalate
                        ? <Icon name="chevronRight" size={15} color="rgba(255,255,255,0.3)" />
                        : <Icon name={isSelected ? "chevronLeft" : "plus"} size={15} color="rgba(255,255,255,0.3)" />}
                    </button>
                    {isSelected && !fu.escalate && fu.a && (
                      <div style={{ background: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: "0 0 14px 14px", padding: "12px 16px", marginTop: "-2px" }}>
                        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, margin: 0 }}>{fu.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Escalation CTA if no follow-ups or still unresolved */}
        <div style={{ marginTop: "24px" }}>
          <button
            type="button"
            onClick={() => onOpenLiveChat?.()}
            style={{ ...S.btn("ghost"), color: "rgba(255,255,255,0.4)", fontSize: "13px" }}
          >
            Still having trouble? Contact support →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 16px" }}>
      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: "6px", fontFamily: "inherit", fontSize: "14px", padding: "0 0 20px 0" }}
      >
        <Icon name="chevronLeft" size={18} /> Back
      </button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <div style={{ width: "44px", height: "44px", background: meta.bg, borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={meta.icon} size={20} color={meta.color} />
        </div>
        <div>
          <p style={{ ...S.label, marginBottom: "2px" }}>SUPPORT TOPIC</p>
          <h2 style={{ ...S.h2, fontSize: "18px", margin: 0 }}>{meta.label}</h2>
        </div>
      </div>

      <p style={{ ...S.label, marginBottom: "10px" }}>SELECT YOUR QUESTION</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {faqs.map((faq, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSelected(i)}
            style={{
              width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px",
              padding: "14px 16px", cursor: "pointer", textAlign: "left", color: "rgba(255,255,255,0.75)", fontSize: "13px",
              fontFamily: "inherit", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", transition: "all 0.18s",
            }}
          >
            {faq.q}
            <Icon name="chevronRight" size={15} color="rgba(255,255,255,0.3)" />
          </button>
        ))}
      </div>

      <div style={{ marginTop: "20px" }}>
        <button type="button" onClick={() => onOpenLiveChat?.()} style={{ ...S.btn("ghost"), color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
          My question isn't listed — contact support →
        </button>
      </div>
    </div>
  );
}

// ─── AI Chat In-Progress Screen ───────────────────────────────────────────────
// ─── Main SupportTab ──────────────────────────────────────────────────────────
export default function SupportTab({ user, session }) {
  const [view, setView] = useState("hub"); // "hub" | "live-chat" | "payouts" | "coverage" | "appHelp"
  const [search, setSearch] = useState("");
  const [openFaq, setOpenFaq] = useState(null);

  const allFaqs = [
    ...CATEGORY_FAQS.payouts.map(f => ({ ...f, cat: "payouts" })),
    ...CATEGORY_FAQS.coverage.map(f => ({ ...f, cat: "coverage" })),
    ...CATEGORY_FAQS.appHelp.map(f => ({ ...f, cat: "appHelp" })),
  ];
  const filteredFaqs = allFaqs.filter(item => item.q.toLowerCase().includes(search.trim().toLowerCase()));

  // Category and AI chat views
  if (view === "live-chat") return <LiveChatView user={user} session={session} onBack={() => setView("hub")} />;
  if (["payouts", "coverage", "appHelp"].includes(view)) {
    return <CategoryView categoryKey={view} onBack={() => setView("hub")} onOpenLiveChat={() => setView("live-chat")} />;
  }

  // Hub view
  return (
    <div>
      <div style={S.topBar}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
            <Icon name="chat" size={16} color="#4ade80" />
            <span style={{ ...S.label, marginBottom: 0 }}>CONCIERGE SERVICE</span>
          </div>
          <h2 style={{ ...S.h2, fontSize: "17px" }}>Support Hub</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "999px", background: "#4ade80" }} />
          <span style={{ fontSize: "12px", fontWeight: "600", color: "#4ade80", letterSpacing: "0.2px" }}>SECURE</span>
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        <h1 style={{ ...S.h1, fontSize: "24px", marginBottom: "14px" }}>How can we help you<br />protect your hustle?</h1>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: "18px" }}>
          <div style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <Icon name="search" size={18} color="rgba(255,255,255,0.35)" />
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search coverage, payouts, or help topics..."
            style={{ ...S.input, marginBottom: 0, paddingLeft: "48px", height: "52px", borderRadius: "16px", fontSize: "14px" }}
          />
        </div>

        {/* If searching, show filtered results */}
        {search.trim() ? (
          <>
            <p style={{ ...S.label, marginBottom: "10px" }}>SEARCH RESULTS</p>
            <div style={{ ...S.card, padding: "0", marginBottom: "16px", borderRadius: "16px", overflow: "hidden" }}>
              {filteredFaqs.length === 0 ? (
                <div style={{ padding: "20px 16px", color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>No matching help topics.</div>
              ) : filteredFaqs.map((item, i) => {
                const expanded = openFaq === item.q;
                return (
                  <div key={item.q} style={{ borderBottom: i < filteredFaqs.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(expanded ? null : item.q)}
                      style={{ width: "100%", background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                    >
                      <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.68)", paddingRight: "12px" }}>{item.q}</span>
                      <Icon name={expanded ? "chevronLeft" : "plus"} size={16} color="rgba(255,255,255,0.3)" />
                    </button>
                    {expanded && (
                      <div style={{ padding: "0 16px 16px", color: "rgba(255,255,255,0.45)", fontSize: "13px", lineHeight: 1.6 }}>
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* Quick categories */}
            <p style={{ ...S.label, marginBottom: "10px" }}>QUICK CATEGORIES</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "18px" }}>
              {[
                { key: "payouts", icon: "history", label: "Payouts", sub: "Track, expedite, and verify your earnings.", iconBg: "rgba(74,222,128,0.12)", iconColor: "#4ade80" },
                { key: "coverage", icon: "shield", label: "Coverage", sub: "Your active protection and triggers.", iconBg: "rgba(59,130,246,0.12)", iconColor: "#60a5fa" },
                { key: "appHelp", icon: "settings", label: "App Help", sub: "Settings, profile, and account issues.", iconBg: "rgba(168,85,247,0.12)", iconColor: "#c084fc" },
                { key: "live-chat", icon: "chat", label: "AI Chat", sub: "Talk to Sentinel AI agent.", iconBg: "rgba(245,158,11,0.12)", iconColor: "#f59e0b" },
              ].map(c => (
                <div
                  key={c.key}
                  onClick={() => setView(c.key)}
                  style={{
                    ...S.card, minHeight: "150px", display: "flex", flexDirection: "column", justifyContent: "flex-start",
                    gap: "12px", cursor: "pointer", padding: "14px", marginBottom: 0,
                    background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "18px",
                  }}
                >
                  <div style={{ width: "42px", height: "42px", background: c.iconBg, borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={c.icon} size={18} color={c.iconColor} />
                  </div>
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: "700", color: "#fff", margin: "0 0 6px" }}>{c.label}</p>
                    <p style={{ fontSize: "13px", lineHeight: "1.45", color: "rgba(255,255,255,0.42)", margin: 0 }}>{c.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Common questions across all categories */}
            <p style={{ ...S.label, marginBottom: "10px" }}>COMMON QUESTIONS</p>
            <div style={{ ...S.card, padding: "0", marginBottom: "16px", borderRadius: "20px", overflow: "hidden" }}>
              {allFaqs.slice(0, 6).map((item, i) => {
                const expanded = openFaq === item.q;
                return (
                  <div key={item.q} style={{ borderBottom: i < 5 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(expanded ? null : item.q)}
                      style={{ width: "100%", background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                    >
                      <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.68)", paddingRight: "12px" }}>{item.q}</span>
                      <Icon name={expanded ? "chevronLeft" : "plus"} size={16} color="rgba(255,255,255,0.3)" />
                    </button>
                    {expanded && (
                      <div style={{ padding: "0 16px 16px", color: "rgba(255,255,255,0.45)", fontSize: "13px", lineHeight: 1.6 }}>
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

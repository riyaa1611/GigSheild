import React from "react";
import BottomSheet from "../components/BottomSheet";
import PulsingDot from "../components/PulsingDot";
import Icon from "../components/Icon";
import { useUserProfile } from "../hooks/useUserProfile";
import { useReferral } from "../hooks/useReferral";
import { S } from "../styles/styles";

export default function ProfileTab({ user, planData, onLogout, session, onOpenSupport }) {
  const { profile, updateProfile, updateAvatar, saving } = useUserProfile(user?.id, session);
  const { referralCode, totalReward, shareReferral } = useReferral(user?.id);
  const liveUser = profile || user || {};
  const claimsCount = liveUser?.claims_count || 0;
  const loyalty = claimsCount < 5
    ? { label: "Bronze", color: "#cd7f32" }
    : claimsCount < 20
    ? { label: "Gold", color: "#f59e0b" }
    : { label: "Sentinel", color: "#a855f7" };

  const initials = (liveUser?.name || "GU").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const [editOpen, setEditOpen] = React.useState(false);
  const [prefsOpen, setPrefsOpen] = React.useState(false);
  const [draft, setDraft] = React.useState({
    upi_handle: liveUser?.upi_handle || "",
    bank_account: liveUser?.bank_account || "",
    bank_name: liveUser?.bank_name || "",
    bank_ifsc: liveUser?.bank_ifsc || "",
    bank_account_name: liveUser?.bank_account_name || "",
  });
  const [prefsDraft, setPrefsDraft] = React.useState({
    payout_alerts: true,
    claim_updates: true,
    support_updates: true,
    marketing: false,
    sound: true,
  });
  const avatarInputRef = React.useRef(null);

  React.useEffect(() => {
    setDraft({
      upi_handle: liveUser?.upi_handle || "",
      bank_account: liveUser?.bank_account || "",
      bank_name: liveUser?.bank_name || "",
      bank_ifsc: liveUser?.bank_ifsc || "",
      bank_account_name: liveUser?.bank_account_name || "",
    });
  }, [liveUser?.upi_handle, liveUser?.bank_account, liveUser?.bank_name, liveUser?.bank_ifsc, liveUser?.bank_account_name]);

  React.useEffect(() => {
    setPrefsDraft((prev) => ({
      ...prev,
      ...(liveUser?.notification_prefs || {}),
    }));
  }, [liveUser?.notification_prefs]);

  const handleAvatarPick = async (event) => {
    const file = event.target.files?.[0];
    if (file) {
      await updateAvatar(file);
    }
    event.target.value = "";
  };

  const handleSaveDetails = async () => {
    await updateProfile({
      upi_handle: draft.upi_handle || null,
      bank_account: draft.bank_account || null,
      bank_name: draft.bank_name || null,
      bank_ifsc: draft.bank_ifsc || null,
      bank_account_name: draft.bank_account_name || null,
    });
    setEditOpen(false);
  };

  return (
    <div>
      <div style={S.topBar}>
        <h2 style={{ ...S.h2, fontSize: "17px" }}>Profile</h2>
        <div style={{ width: "36px", height: "36px", background: "rgba(255,255,255,0.06)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Icon name="settings" size={18} color="rgba(255,255,255,0.5)" />
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        {/* Avatar */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <div style={{ width: "88px", height: "88px", background: "linear-gradient(135deg, #1a3a2a, #0f3460)", border: "2px solid rgba(74,222,128,0.3)", borderRadius: "24px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: "800", color: "#4ade80", margin: "0 auto" }}>
              {initials}
            </div>
            <div style={{ position: "absolute", bottom: "0", right: "-4px", width: "24px", height: "24px", background: "#4ade80", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #0d0d14", cursor: "pointer" }}>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                style={{ all: "unset", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                aria-label="Update avatar"
              >
                <Icon name="camera" size={12} color="#0a1a0f" />
              </button>
            </div>
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarPick} />
          <h2 style={{ ...S.h2, marginTop: "12px", marginBottom: "4px" }}>{liveUser?.name || "Gig Worker"}</h2>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px" }}>
            <PulsingDot color={loyalty.color} />
            <span style={{ fontSize: "12px", color: loyalty.color, fontWeight: "700", letterSpacing: "0.5px" }}>
              VERIFIED {loyalty.label.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Verification */}
        <p style={{ ...S.label, marginBottom: "10px" }}>VERIFICATION STATUS</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
          {[
            { icon: "fingerprint", label: "Document", sub: "Aadhaar", verified: user?.aadhaar_status === "verified" },
            { icon: "zap", label: "Platform ID", sub: user?.platform_type ? user.platform_type.charAt(0).toUpperCase() + user.platform_type.slice(1) : "Zomato", verified: !!user?.platform_type },
          ].map((v, i) => (
            <div key={i} style={{ ...S.card, padding: "14px", marginBottom: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <Icon name={v.icon} size={18} color="rgba(255,255,255,0.4)" />
                <span style={{ ...S.badge(v.verified ? "#4ade80" : "#f59e0b"), fontSize: "10px", padding: "2px 7px" }}>
                  {v.verified ? "VERIFIED" : "PENDING"}
                </span>
              </div>
              <p style={{ ...S.muted, margin: 0 }}>{v.label}</p>
              <p style={{ fontSize: "14px", fontWeight: "600", color: "#fff", margin: 0 }}>{v.sub}</p>
            </div>
          ))}
        </div>

        {/* Coverage */}
        <p style={{ ...S.label, marginBottom: "10px" }}>CURRENT COVERAGE</p>
        <div style={{ ...S.card, padding: "14px 16px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={S.h3}>{planData?.name || "ProShield"}</h3>
              <p style={{ fontSize: "16px", fontWeight: "700", color: "#4ade80", margin: "2px 0" }}>
                ₹{planData?.weeklyPremium}<span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", fontWeight: "400" }}>/wk</span>
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
                <PulsingDot />
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>Income Loss Protection</span>
              </div>
            </div>
            <button onClick={() => setEditOpen(true)} style={{ padding: "8px 14px", background: "#4ade80", border: "none", borderRadius: "10px", color: "#0a1a0f", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>
              Manage
            </button>
          </div>
        </div>
  {/* Referral Program */}
        <p style={{ ...S.label, marginBottom: "10px" }}>REFERRAL PROGRAM</p>
        <div style={{ ...S.card, border: "1px solid rgba(168,85,247,0.2)", marginBottom: "16px", padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <div>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.5px", fontWeight: "600", margin: "0 0 4px" }}>YOUR REFERRAL CODE</p>
              <p style={{ fontSize: "18px", fontWeight: "800", color: "#a855f7", margin: 0, fontFamily: "monospace" }}>{referralCode || "—"}</p>
            </div>
            <button
              type="button"
              onClick={() => shareReferral?.()}
              style={{ padding: "8px 12px", background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: "8px", color: "#a855f7", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}
            >
              SHARE
            </button>
          </div>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", margin: 0 }}>
            Earn ₹50 for each worker you refer who completes onboarding
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px", padding: "10px", background: "rgba(168,85,247,0.08)", borderRadius: "8px" }}>
            <Icon name="gift" size={16} color="#a855f7" />
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#a855f7" }}>Total Earned: ₹{(totalReward || 0).toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* Loyalty */}
        <p style={{ ...S.label, marginBottom: "10px" }}>LOYALTY & REWARDS</p>
        <div style={{ ...S.card, marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "36px", height: "36px", background: loyalty.color + "15", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="award" size={18} color={loyalty.color} />
              </div>
              <div>
                <p style={{ fontSize: "14px", fontWeight: "600", color: "#fff", margin: 0 }}>{loyalty.label} Member</p>
                <p style={S.muted}>{claimsCount} claims · Score: {user?.loyalty_score || 100}/100</p>
              </div>
            </div>
            <div style={{ width: "40px", height: "40px", background: loyalty.color + "15", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "18px", fontWeight: "900", color: loyalty.color }}>{loyalty.label[0]}</span>
            </div>
          </div>
        </div>

        {/* Account details */}
        <p style={{ ...S.label, marginBottom: "10px" }}>ACCOUNT DETAILS</p>
        <div style={{ ...S.card, padding: "0", marginBottom: "16px" }}>
          {[
            ["Mobile", liveUser?.phone ? `+91 ${liveUser.phone.slice(0, 4)}XXXXXX` : "+91 98XXXXXXXX"],
            ["Zone", `${liveUser?.zone_city || "Mumbai"} — ${liveUser?.zone_pincode || "400070"}`],
            ["Platform", liveUser?.platform_type ? liveUser.platform_type.charAt(0).toUpperCase() + liveUser.platform_type.slice(1) : "Zomato"],
            ["UPI Handle", liveUser?.upi_handle || "—"],
            ["Weekly Earnings", `₹${(liveUser?.declared_weekly_earnings || 4200).toLocaleString("en-IN")}`],
            ["Member Since", new Date(liveUser?.created_at || Date.now()).toLocaleDateString("en-IN", { month: "short", year: "numeric" })],
          ].map(([k, v], i, arr) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>{k}</span>
              <span style={{ fontSize: "13px", color: "#fff", fontWeight: "500" }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Settings */}
        <p style={{ ...S.label, marginBottom: "10px" }}>ACCOUNT & SUPPORT</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "8px" }}>
          {[
            { icon: "settings", label: "App Preferences", onClick: () => setPrefsOpen(true) },
            { icon: "support", label: "Help & Support", onClick: () => onOpenSupport?.() },
          ].map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={item.onClick}
              style={{ ...S.card, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", padding: "14px 16px", marginBottom: 0, background: "rgba(255,255,255,0.04)", textAlign: "left" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "32px", height: "32px", background: "rgba(255,255,255,0.05)", borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name={item.icon} size={16} color="rgba(255,255,255,0.4)" />
                </div>
                <span style={{ fontSize: "14px", color: "#fff" }}>{item.label}</span>
              </div>
              <Icon name="chevronRight" size={16} color="rgba(255,255,255,0.2)" />
            </button>
          ))}
        </div>

        <div style={{ ...S.card, display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", padding: "14px 16px", background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)", marginBottom: "90px" }} onClick={onLogout}>
          <div style={{ width: "32px", height: "32px", background: "rgba(239,68,68,0.1)", borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="logout" size={16} color="#f87171" />
          </div>
          <span style={{ fontSize: "14px", color: "#f87171" }}>Log Out</span>
        </div>
      </div>

      <BottomSheet visible={editOpen} title="Edit payout details" onClose={() => setEditOpen(false)}>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <span style={S.label}>UPI HANDLE</span>
            <input style={S.input} value={draft.upi_handle} onChange={(e) => setDraft((prev) => ({ ...prev, upi_handle: e.target.value }))} placeholder="yourname@upi" />
          </div>
          <div>
            <span style={S.label}>BANK ACCOUNT</span>
            <input style={S.input} value={draft.bank_account} onChange={(e) => setDraft((prev) => ({ ...prev, bank_account: e.target.value.replace(/\D/g, "") }))} placeholder="Account number" />
          </div>
          <div>
            <span style={S.label}>BANK NAME</span>
            <input style={S.input} value={draft.bank_name} onChange={(e) => setDraft((prev) => ({ ...prev, bank_name: e.target.value }))} placeholder="State Bank of India" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <span style={S.label}>IFSC</span>
              <input style={S.input} value={draft.bank_ifsc} onChange={(e) => setDraft((prev) => ({ ...prev, bank_ifsc: e.target.value.toUpperCase() }))} placeholder="SBIN0001234" maxLength={11} />
            </div>
            <div>
              <span style={S.label}>ACCOUNT HOLDER</span>
              <input style={S.input} value={draft.bank_account_name} onChange={(e) => setDraft((prev) => ({ ...prev, bank_account_name: e.target.value }))} placeholder="Rakesh Kumar" />
            </div>
          </div>
          <button type="button" onClick={handleSaveDetails} disabled={saving} style={S.btn("primary", saving)}>
            {saving ? "Saving..." : "Save Details"}
          </button>
        </div>
      </BottomSheet>

      <BottomSheet visible={prefsOpen} title="App Preferences" onClose={() => setPrefsOpen(false)}>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[
            ["payout_alerts", "Payout alerts"],
            ["claim_updates", "Claim status updates"],
            ["support_updates", "Support updates"],
            ["marketing", "Marketing messages"],
            ["sound", "App sound"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPrefsDraft((prev) => ({ ...prev, [key]: !prev[key] }))}
              style={{ ...S.card, marginBottom: 0, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", padding: "14px 16px", background: "rgba(255,255,255,0.04)" }}
            >
              <span style={{ fontSize: "14px", color: "#fff" }}>{label}</span>
              <span style={S.badge(prefsDraft[key] ? "#4ade80" : "#6b7280")}>{prefsDraft[key] ? "ON" : "OFF"}</span>
            </button>
          ))}

          <button
            type="button"
            onClick={async () => {
              await updateProfile({ notification_prefs: prefsDraft });
              setPrefsOpen(false);
            }}
            disabled={saving}
            style={S.btn("primary", saving)}
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}

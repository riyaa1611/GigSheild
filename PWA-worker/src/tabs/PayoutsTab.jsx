import React, { useEffect, useMemo, useState } from "react";
import TriggerBadge from "../components/TriggerBadge";
import Icon from "../components/Icon";
import BottomSheet from "../components/BottomSheet";
import { useUserProfile } from "../hooks/useUserProfile";
import { useClaimDetail } from "../hooks/useClaimDetail";
import { usePremiumHistory } from "../hooks/usePremiumHistory";
import { S } from "../styles/styles";

const FILTERS = ["ALL", "SUCCESS", "PENDING", "FAILED"];

export default function PayoutsTab({ user, payouts = [], loading, session }) {
  const [filter, setFilter] = useState("ALL");
  const [section, setSection] = useState("payouts");
  const [editOpen, setEditOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);

  const { profile, updateUPI, saving } = useUserProfile(user?.id, session);
  const liveUser = profile || user || {};
  const { claims: allClaims } = useClaimDetail(user?.id);
  const { payments: billingHistory } = usePremiumHistory(user?.id);

  const [draft, setDraft] = useState({
    upi_handle: "",
    bank_account: "",
    bank_name: "",
    bank_ifsc: "",
    bank_account_name: "",
  });

  useEffect(() => {
    setDraft({
      upi_handle: liveUser?.upi_handle || "",
      bank_account: liveUser?.bank_account || "",
      bank_name: liveUser?.bank_name || "",
      bank_ifsc: liveUser?.bank_ifsc || "",
      bank_account_name: liveUser?.bank_account_name || "",
    });
  }, [
    liveUser?.upi_handle,
    liveUser?.bank_account,
    liveUser?.bank_name,
    liveUser?.bank_ifsc,
    liveUser?.bank_account_name,
  ]);

  const shown = useMemo(() => {
    if (filter === "ALL") return payouts;
    return payouts.filter(
      (p) => p.status?.toLowerCase() === filter.toLowerCase()
    );
  }, [filter, payouts]);

  const total = payouts
    .filter((p) => p.status === "success")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <div>
      <div style={S.topBar}>
        <div>
          <div style={{ display: "flex", gap: "8px", marginBottom: "2px" }}>
            <Icon name="shield" size={16} color="#4ade80" />
            <span style={{ ...S.label, marginBottom: 0 }}>
              FINANCIAL RECOVERY
            </span>
          </div>
          <h2 style={{ ...S.h2, fontSize: "17px" }}>
            Payouts & Billing
          </h2>
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          {["payouts", "claims", "wallet"].map((sec) => (
            <button
              key={sec}
              onClick={() => setSection(sec)}
              style={{
                flex: 1,
                padding: "12px 10px",
                background: section === sec ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.02)",
                color: section === sec ? "#4ade80" : "rgba(255,255,255,0.72)",
                border: section === sec ? "1px solid rgba(74,222,128,0.28)" : "1px solid rgba(255,255,255,0.08)",
                borderRadius: "14px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "13px",
                letterSpacing: "0.4px",
                fontFamily: "inherit",
              }}
            >
              {sec === "payouts" ? "Payouts" : sec === "claims" ? "Claims" : "Wallet"}
            </button>
          ))}
        </div>

        {/* ================= PAYOUTS ================= */}
        {section === "payouts" && (
          <>
            <div style={{ ...S.card, padding: "20px", marginBottom: "12px" }}>
              <p style={S.label}>LIFETIME DISBURSED</p>
              <h2 style={{ color: "#fff", fontWeight: "800", fontSize: "26px", margin: 0 }}>₹{total.toLocaleString("en-IN")}</h2>
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "999px",
                    border: filter === f ? "1px solid rgba(74,222,128,0.32)" : "1px solid rgba(255,255,255,0.08)",
                    background: filter === f ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.02)",
                    color: filter === f ? "#4ade80" : "rgba(255,255,255,0.72)",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            {loading ? (
              <div>Loading payouts...</div>
            ) : shown.length > 0 ? (
              shown.map((p) => {
                const triggerCode = p.claims?.triggers?.type || "T-01";
                const triggerLabel =
                  p.claims?.triggers?.severity_label || "Weather Event";
                const date = new Date(p.created_at).toLocaleDateString(
                  "en-IN",
                  { day: "numeric", month: "short", year: "numeric" }
                );
                const time = new Date(p.created_at).toLocaleTimeString(
                  "en-IN",
                  { hour: "2-digit", minute: "2-digit" }
                );

                return (
                  <div
                    key={p.id}
                    style={{
                      ...S.card,
                      padding: "14px 16px",
                      marginBottom: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div style={{ marginBottom: "4px" }}>
                          <TriggerBadge code={triggerCode} />
                        </div>
                        <p style={S.muted}>
                          {date} · {time}
                        </p>
                        <p style={{ fontSize: "12px", opacity: 0.72, color: "rgba(255,255,255,0.55)", margin: "2px 0 0" }}>
                          {triggerLabel}
                        </p>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontWeight: "800", color: "#fff", margin: "0 0 4px", fontSize: "16px" }}>
                          ₹{Number(p.amount).toLocaleString("en-IN")}
                        </p>
                        <span style={S.statusPill(p.status)}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: "center", padding: "28px 0" }}>
                <Icon name="history" size={40} color="rgba(255,255,255,0.18)" />
                <p style={{ color: "#fff", margin: "12px 0 0", fontSize: "14px" }}>No payouts yet</p>
              </div>
            )}
          </>
        )}

        {/* ================= CLAIMS ================= */}
        {section === "claims" && (
          <>
            {allClaims?.length ? (
              allClaims.map((claim) => {
                const date = new Date(claim.created_at).toLocaleDateString(
                  "en-IN",
                  { day: "numeric", month: "short", year: "numeric" }
                );
                const time = new Date(claim.created_at).toLocaleTimeString(
                  "en-IN",
                  { hour: "2-digit", minute: "2-digit" }
                );

                return (
                  <div
                    key={claim.id}
                    onClick={() => setSelectedClaim(claim)}
                    style={{
                      ...S.card,
                      padding: "14px 16px",
                      marginBottom: "8px",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <TriggerBadge
                          code={claim.triggers?.type || "T-01"}
                        />
                        <p style={S.muted}>
                          {date} · {time}
                        </p>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <p style={{ color: "#fff", fontWeight: 800, margin: "0 0 4px", fontSize: "16px" }}>
                          ₹{Number(claim.amount || 0).toLocaleString("en-IN")}
                        </p>
                        <span style={S.statusPill(claim.status)}>
                          {claim.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: "center", padding: "28px 0" }}>
                <Icon name="inbox" size={40} color="rgba(255,255,255,0.18)" />
                <p style={{ color: "#fff", margin: "12px 0 0", fontSize: "14px" }}>No claims yet</p>
              </div>
            )}
          </>
        )}

        {/* ================= WALLET ================= */}
        {section === "wallet" && (
          <>
            {billingHistory?.length ? (
              <>
                <div style={{ ...S.card, padding: "20px" }}>
                  <p style={S.label}>TOTAL PREMIUM</p>
                  <h2 style={{ color: "#fff", fontSize: "26px", margin: 0 }}>
                    ₹
                    {billingHistory
                      .filter((p) => p.status === "success")
                      .reduce(
                        (sum, p) => sum + Number(p.amount || 0),
                        0
                      )
                      .toLocaleString("en-IN")}
                  </h2>
                </div>

                {billingHistory.map((p) => (
                  <div key={p.id} style={S.card}>
                    <p style={{ color: "#fff", margin: "0 0 6px", fontWeight: 700 }}>
                      ₹{Number(p.amount).toLocaleString("en-IN")}
                    </p>
                    <span style={S.statusPill(p.status)}>
                      {p.status}
                    </span>
                  </div>
                ))}
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "28px 0" }}>
                <Icon name="credit-card" size={40} color="rgba(255,255,255,0.18)" />
                <p style={{ color: "#fff", margin: "12px 0 0", fontSize: "14px" }}>No billing history</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ================= BOTTOM SHEET ================= */}
      <BottomSheet
        visible={editOpen}
        title="Edit payout details"
        onClose={() => setEditOpen(false)}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input
            value={draft.upi_handle}
            onChange={(e) =>
              setDraft({ ...draft, upi_handle: e.target.value })
            }
            placeholder="yourname@upi"
            style={{ ...S.input, marginBottom: "2px" }}
          />

          <button
            onClick={async () => {
              await updateUPI({
                upiHandle: draft.upi_handle || undefined,
              });
              setEditOpen(false);
            }}
            disabled={saving}
            style={S.btn("primary", saving)}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
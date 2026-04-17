import React, { useEffect, useMemo, useState } from "react";
import BottomNav from "./components/BottomNav";
import MagicPayoutModal from "./components/MagicPayoutModal";
import { usePayouts } from "./hooks/usePayouts";
import { usePolicy } from "./hooks/usePolicy";
import { useTriggers } from "./hooks/useTriggers";
import { useWorkerPing } from "./hooks/useWorkerPing";
import { supabase } from "./lib/supabase";
import { storage } from "./lib/storage";
import { PLANS } from "./constants/plans";
import { S } from "./styles/styles";
import HomeTab from "./tabs/HomeTab";
import PolicyTab from "./tabs/PolicyTab";
import PayoutsTab from "./tabs/PayoutsTab";
import SupportTab from "./tabs/SupportTab";
import ProfileTab from "./tabs/ProfileTab";

export default function AppShell({ user: initialUser, session, onLogout }) {
  const [tab, setTab] = useState("home");
  const [user, setUser] = useState(initialUser);

  const { payouts, loading: payoutsLoading, liveEvent, clearLiveEvent } = usePayouts(user?.id);
  const { policy } = usePolicy(user?.id);
  const { activeTrigger } = useTriggers(user?.zone_pincode);

  // Background heartbeat — critical for context validation
  useWorkerPing(user, session);

  const planData = useMemo(
    () => PLANS.find((p) => p.id === (policy?.plan_type || user?.plan)) || PLANS[1],
    [policy?.plan_type, user?.plan]
  );

  useEffect(() => {
    if (!user?.id) return;

    supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const merged = { ...user, ...data };
          setUser(merged);
          storage.set("user", merged);
        }
      });

    const channel = supabase
      .channel(`app-user:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "users", filter: `id=eq.${user.id}` }, (payload) => {
        setUser((prev) => {
          const merged = { ...prev, ...payload.new };
          storage.set("user", merged);
          return merged;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return (
    <div style={{ ...S.phoneFrame, display: "flex", flexDirection: "column" }}>
      {liveEvent ? (
        <MagicPayoutModal
          data={{
            amount: liveEvent.amount,
            triggerType: liveEvent.claims?.triggers?.severity_label || "Weather Event",
            triggerCode: liveEvent.claims?.triggers?.type || "T-01",
            zone: user?.zone_city || "Your Zone",
            time: "Just now"
          }}
          onDismiss={clearLiveEvent}
        />
      ) : null}

      <div style={S.screen}>
        {tab === "home" ? <HomeTab user={user} policy={policy} planData={planData} activeTrigger={activeTrigger} recentPayout={payouts[0] || null} session={session} /> : null}
        {tab === "policy" ? <PolicyTab user={user} planData={planData} session={session} /> : null}
        {tab === "payouts" ? <PayoutsTab user={user} payouts={payouts} loading={payoutsLoading} session={session} /> : null}
        {tab === "support" ? <SupportTab user={user} session={session} /> : null}
        {tab === "profile" ? <ProfileTab user={user} planData={planData} onLogout={onLogout} session={session} onOpenSupport={() => setTab("support")} /> : null}
      </div>

      <BottomNav activeTab={tab} onTabChange={setTab} />
    </div>
  );
}

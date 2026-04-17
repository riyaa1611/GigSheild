import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useReferral(userId) {
  const [referralCode, setReferralCode] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [totalReward, setTotalReward] = useState(0);

  useEffect(() => {
    if (!userId) return;
    supabase.from("users").select("referral_code").eq("id", userId).single()
      .then(({ data }) => setReferralCode(data?.referral_code || null));

    supabase.from("referrals").select("*").eq("referrer_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setReferrals(data || []);
        const rewarded = (data || []).filter(r => r.status === "rewarded");
        setTotalReward(rewarded.reduce((s, r) => s + (r.reward_amount || 50), 0));
      });
  }, [userId]);

  function getShareUrl() {
    return `https://gigshield.app/join?ref=${referralCode}`;
  }

  async function shareReferral() {
    const url = getShareUrl();
    const text = `Join GigShield — income protection for delivery workers. Get ₹50 off your first week! ${url}`;
    if (navigator.share) {
      await navigator.share({ title: "GigShield — Income Protection", text, url });
    } else {
      await navigator.clipboard.writeText(text);
    }
  }

  return { referralCode, referrals, totalReward, shareReferral, getShareUrl };
}

import { useCallback, useEffect, useState } from "react";
import { callFunction, supabase } from "../lib/supabase";
import { storage } from "../lib/storage";

function mergeCachedUser(updates) {
  return { ...(storage.get("user") || {}), ...updates };
}

export function useUserProfile(userId, session) {
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return undefined;

    fetchProfile();

    const channel = supabase
      .channel(`user:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "users", filter: `id=eq.${userId}` }, (payload) => {
        setProfile((prev) => ({ ...prev, ...payload.new }));
        storage.set("user", mergeCachedUser(payload.new));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function fetchProfile() {
    const { data } = await supabase.from("users").select("*").eq("id", userId).single();
    if (data) {
      setProfile(data);
      storage.set("user", mergeCachedUser(data));
    }
  }

  const updateProfile = useCallback(async (updates) => {
    setSaving(true);
    setError("");
    try {
      const data = await callFunction("update-profile", updates, session);
      setProfile((prev) => ({ ...prev, ...data.user }));
      storage.set("user", mergeCachedUser(data.user));
      return data.user;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setSaving(false);
    }
  }, [session]);

  const updateUPI = useCallback(async (details) => {
    setSaving(true);
    setError("");
    try {
      const updates = {
        ...(details.upiHandle ? { upi_handle: details.upiHandle } : {}),
        ...(details.bankAccount ? { bank_account: details.bankAccount } : {}),
        ...(details.bankName ? { bank_name: details.bankName } : {}),
        ...(details.bankIfsc ? { bank_ifsc: details.bankIfsc } : {}),
        ...(details.bankAccountName ? { bank_account_name: details.bankAccountName } : {}),
      };

      const { error: userUpdateError } = await supabase
        .from("users")
        .update(updates)
        .eq("id", userId);

      if (userUpdateError) throw userUpdateError;

      if (details.upiHandle) {
        const { error: policyUpdateError } = await supabase
          .from("policies")
          .update({ upi_handle: details.upiHandle })
          .eq("user_id", userId)
          .eq("status", "active");

        if (policyUpdateError) throw policyUpdateError;
      }

      await callFunction("update-upi", details, session).catch(() => null);
      const updated = { ...profile, ...details };
      setProfile(updated);
      storage.set("user", mergeCachedUser(details));
      return updated;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setSaving(false);
    }
  }, [session, profile]);

  const updateAvatar = useCallback(async (file) => {
    setSaving(true);
    setError("");
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      await updateProfile({ avatar_url: publicUrl });
      return publicUrl;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setSaving(false);
    }
  }, [userId, updateProfile]);

  const removeAvatar = useCallback(async () => {
    setSaving(true);
    try {
      await updateProfile({ avatar_url: null });
    } finally {
      setSaving(false);
    }
  }, [updateProfile]);

  return { profile, saving, error, updateProfile, updateUPI, updateAvatar, removeAvatar, refetch: fetchProfile };
}
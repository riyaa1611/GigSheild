import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { storage } from "../lib/storage";

export function useAuth() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedSession = storage.get("session");
    const savedUser = storage.get("user");

    if (savedSession && savedUser) {
      setSession(savedSession);
      setUser(savedUser);
      supabase.auth.setSession(savedSession).catch(() => {
        storage.clear();
        setSession(null);
        setUser(null);
      });
    }

    setLoading(false);

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession) {
        const compact = {
          access_token: newSession.access_token,
          refresh_token: newSession.refresh_token,
          expires_at: newSession.expires_at
        };
        setSession(compact);
        storage.set("session", compact);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = (sessionData, userData) => {
    setSession(sessionData);
    setUser(userData);
    storage.set("session", sessionData);
    storage.set("user", userData);
  };

  const updateUser = (updates) => {
    setUser((prev) => {
      const merged = { ...prev, ...updates };
      storage.set("user", merged);
      return merged;
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    storage.clear();
    setSession(null);
    setUser(null);
  };

  return { session, user, loading, login, updateUser, logout };
}

import { useState, useEffect } from "react";
import { storage } from "../lib/storage";
import { apiPost } from "../lib/api";

export function useAdminAuth() {
  const [token, setToken] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = storage.get("token");
    const savedAdmin = storage.get("admin");
    const isValidAdmin = !!savedAdmin && typeof savedAdmin === "object" && savedAdmin.role === "admin";
    if (savedToken && isValidAdmin) {
      setToken(savedToken);
      setAdmin(savedAdmin);
    } else if (savedToken || savedAdmin) {
      storage.clear();
    }
    setLoading(false);
  }, []);

  async function login(phone, otp) {
    const data = await apiPost("/admin/auth/login", { phone, otp });
    storage.set("token", data.token);
    storage.set("admin", data.user);
    setToken(data.token);
    setAdmin(data.user);
    return data;
  }

  function logout() {
    storage.clear();
    setToken(null);
    setAdmin(null);
  }

  return { token, admin, loading, login, logout };
}

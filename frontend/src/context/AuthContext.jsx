import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, workerAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'worker' | 'admin' | null
  const [loading, setLoading] = useState(true);

  // On mount: rehydrate from localStorage token
  useEffect(() => {
    const token = localStorage.getItem('gigshield_token');
    const storedRole = localStorage.getItem('gigshield_role');
    if (token && storedRole) {
      setRole(storedRole);
      if (storedRole === 'worker') {
        workerAPI.getMe()
          .then((res) => setUser(res.data.worker || res.data))
          .catch(() => {
            localStorage.removeItem('gigshield_token');
            localStorage.removeItem('gigshield_role');
            setRole(null);
          })
          .finally(() => setLoading(false));
      } else {
        // Admin: decode basic info from token or use stored name
        const adminName = localStorage.getItem('gigshield_admin_name');
        setUser({ name: adminName || 'Admin', role: 'admin' });
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login(email, password);
    const { token, worker } = res.data;
    localStorage.setItem('gigshield_token', token);
    localStorage.setItem('gigshield_role', 'worker');
    setRole('worker');
    setUser(worker);
    toast.success(`Welcome back, ${worker.name}!`);
    return worker;
  }, []);

  const adminLogin = useCallback(async (email, password) => {
    const res = await authAPI.adminLogin(email, password);
    const { token, admin } = res.data;
    localStorage.setItem('gigshield_token', token);
    localStorage.setItem('gigshield_role', 'admin');
    localStorage.setItem('gigshield_admin_name', admin?.name || 'Admin');
    setRole('admin');
    setUser(admin || { name: 'Admin', role: 'admin' });
    toast.success('Admin login successful');
    return admin;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('gigshield_token');
    localStorage.removeItem('gigshield_role');
    localStorage.removeItem('gigshield_admin_name');
    setUser(null);
    setRole(null);
    toast.success('Logged out successfully');
  }, []);

  const register = useCallback(async (formData) => {
    const res = await authAPI.register(formData);
    const { token, worker } = res.data;
    localStorage.setItem('gigshield_token', token);
    localStorage.setItem('gigshield_role', 'worker');
    setRole('worker');
    setUser(worker);
    toast.success(`Welcome to GigShield, ${worker.name}!`);
    return worker;
  }, []);

  const value = { user, role, loading, login, adminLogin, logout, register };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;

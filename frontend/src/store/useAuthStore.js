import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  aadhaarVerified: false,
  platformLinked: false,

  login: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null, isAuthenticated: false, aadhaarVerified: false, platformLinked: false });
  },

  setAadhaarVerified: () => set({ aadhaarVerified: true }),
  setPlatformLinked: () => set({ platformLinked: true })
}));

export default useAuthStore;

import axios from 'axios';
import useAuthStore from '../store/useAuthStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/onboarding';
    }
    return Promise.reject(error);
  }
);

// Auth
export const sendOtp = (phone) => api.post('/auth/send-otp', { phone });
export const verifyOtp = (phone, otp) => api.post('/auth/verify-otp', { phone, otp });
export const verifyAadhaarMock = (userId, aadhaarNumber) => api.post('/auth/aadhaar-mock', { userId, aadhaarNumber });
export const linkPlatform = (userId, platform, platformId) => api.post('/auth/link-platform', { userId, platform, platformId });

// Policy
export const getPlans = () => api.get('/policies/plans');
export const subscribePlan = (planType, upiHandle) => api.post('/policies/subscribe', { planType, upiHandle });
export const getActivePolicy = () => api.get('/policies/active');
export const cancelPolicy = () => api.post('/policies/cancel');

// Claims & Triggers
export const getClaims = (status) => api.get(`/claims${status ? `?status=${status}` : ''}`);
export const getLiveTriggers = () => api.get('/triggers/live');

// Payouts
export const getPayoutHistory = () => api.get('/payouts/history');

// Admin
export const getAdminClaims = (status, limit=50) => api.get(`/claims/admin/all?limit=${limit}${status ? `&status=${status}` : ''}`);
export const getAdminFlaggedClaims = () => api.get('/claims/admin/flagged');
export const reviewClaim = (id, action, adminNote) => api.patch(`/claims/admin/${id}/review`, { action, adminNote });

export const getAdminAnalytics = () => api.get('/analytics');
export const getAdminAnalyticsTriggers = () => api.get('/analytics/triggers');
export const getAdminAnalyticsClaims = () => api.get('/analytics/claims-vs-premiums');
export const getAdminAnalyticsPlans = () => api.get('/analytics/plans');
export const getAdminFraudStats = () => api.get('/analytics/fraud/stats');
export const getAdminForecast = () => api.get('/analytics/forecast');

export default api;

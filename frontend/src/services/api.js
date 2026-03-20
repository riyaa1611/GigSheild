import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('gigshield_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('gigshield_token');
      localStorage.removeItem('gigshield_role');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ──────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  adminLogin: (email, password) =>
    api.post('/auth/admin/login', { email, password }),

  register: (formData) =>
    api.post('/auth/register', formData),
};

// ─── Worker ────────────────────────────────────────────────────────────────
export const workerAPI = {
  getMe: () => api.get('/workers/me'),
  getDashboard: () => api.get('/workers/me/dashboard'),
  updateProfile: (data) => api.put('/workers/me', data),
};

// ─── Policy ────────────────────────────────────────────────────────────────
export const policyAPI = {
  list: () => api.get('/policies'),
  create: (data) => api.post('/policies', data),
  deactivate: (id) => api.put(`/policies/${id}/deactivate`),
  previewPremium: () => api.get('/policies/preview'),
};

// ─── Claims ────────────────────────────────────────────────────────────────
export const claimsAPI = {
  list: () => api.get('/claims'),
  getById: (id) => api.get(`/claims/${id}`),
};

// ─── Payouts ───────────────────────────────────────────────────────────────
export const payoutsAPI = {
  list: () => api.get('/payouts'),
};

// ─── Admin ─────────────────────────────────────────────────────────────────
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getClaims: (filters) => api.get('/admin/claims', { params: filters }),
  overrideClaim: (id, status) => api.patch(`/admin/claims/${id}/override`, { status }),
  getWorkers: () => api.get('/admin/workers'),
  getZones: () => api.get('/admin/zones'),
};

// ─── Triggers ──────────────────────────────────────────────────────────────
export const triggerAPI = {
  getActive: () => api.get('/triggers/active'),
  setCurfew: (zoneId, active) => api.post('/triggers/curfew', { zone_id: zoneId, active }),
  setFlood: (zoneId, active) => api.post('/triggers/flood', { zone_id: zoneId, active }),
  checkZone: (zoneId) => api.get(`/triggers/zone/${zoneId}`),
};

export default api;

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import WorkerDashboard from './pages/WorkerDashboard';
import PoliciesPage from './pages/PoliciesPage';
import ClaimsPage from './pages/ClaimsPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminClaimsPage from './pages/AdminClaimsPage';
import LoadingSpinner from './components/shared/LoadingSpinner';

function RootRedirect() {
  const { user, role, loading } = useAuth();
  if (loading) return <LoadingSpinner message="Loading GigShield..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
}

function ProtectedWorker({ children }) {
  const { user, role, loading } = useAuth();
  if (loading) return <LoadingSpinner message="Loading..." />;
  if (!user || role !== 'worker') return <Navigate to="/login" replace />;
  return children;
}

function ProtectedAdmin({ children }) {
  const { user, role, loading } = useAuth();
  if (loading) return <LoadingSpinner message="Loading..." />;
  if (!user || role !== 'admin') return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedWorker>
            <WorkerDashboard />
          </ProtectedWorker>
        }
      />
      <Route
        path="/policies"
        element={
          <ProtectedWorker>
            <PoliciesPage />
          </ProtectedWorker>
        }
      />
      <Route
        path="/claims"
        element={
          <ProtectedWorker>
            <ClaimsPage />
          </ProtectedWorker>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedAdmin>
            <AdminDashboard />
          </ProtectedAdmin>
        }
      />
      <Route
        path="/admin/claims"
        element={
          <ProtectedAdmin>
            <AdminClaimsPage />
          </ProtectedAdmin>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

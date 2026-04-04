import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/useAuthStore';

// Pages
import { Onboarding } from './pages/Onboarding';
import { Plans } from './pages/Plans';
import { Dashboard } from './pages/Dashboard';
import { Payouts } from './pages/Payouts';
import { Profile } from './pages/Profile';

// Admin Pages
import { AdminLayout } from './pages/admin/layout/AdminLayout';
import { TriggerMap } from './pages/admin/TriggerMap';
import { ClaimsQueue } from './pages/admin/ClaimsQueue';
import { Analytics } from './pages/admin/Analytics';
import { FraudMonitor } from './pages/admin/FraudMonitor';
import { ForecastMap } from './pages/admin/ForecastMap';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/onboarding" />;
  return children;
};

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="antialiased selection:bg-indigo-500/30">
        <Toaster 
          position="top-center" 
          toastOptions={{
            style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' }
          }} 
        />
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/onboarding" element={<Onboarding />} />
          
          <Route path="/plans" element={
            <ProtectedRoute><Plans /></ProtectedRoute>
          } />
          
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          
          <Route path="/payouts" element={
            <ProtectedRoute><Payouts /></ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute><Profile /></ProtectedRoute>
          } />
          
          <Route path="/admin" element={<AdminLayout />}>
             <Route index element={<Navigate to="/admin/map" replace />} />
             <Route path="map" element={<TriggerMap />} />
             <Route path="claims" element={<ClaimsQueue />} />
             <Route path="analytics" element={<Analytics />} />
             <Route path="fraud" element={<FraudMonitor />} />
             <Route path="forecast" element={<ForecastMap />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

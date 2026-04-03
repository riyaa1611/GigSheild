import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

export const useAdminGuard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/onboarding');
      return;
    }
    // For local mock purposes, treat any logic user variable matching role as admin, otherwise fallback correctly
    if (user?.role !== 'admin' && user?.id !== 'admin_test') { // Hardcoded fallback allowing bypass for demo depending on mock users
       if (user?.role !== 'admin') {
         console.warn('[AdminGuard] Non-admin accessing admin portal, redirecting');
         navigate('/dashboard');
       }
    }
  }, [user, isAuthenticated, navigate]);

  return { isAdmin: user?.role === 'admin' || user?.id === 'admin_test' };
};

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loading } from '../components/common/Loading';

export function ProtectedRoute() {
  const { isAuthenticated, currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loading fullScreen text="Verifying session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 1. Mandatory Email Verification Enforcement
  if (currentUser?.emailVerified === false) {
    return (
      <Navigate
        to={`/verify-email?email=${encodeURIComponent(currentUser.email || '')}`}
        replace
      />
    );
  }

  // 9. Advocate Verification Routing Enforcement
  // Pending or unverified advocates cannot access normal citizen / verified chambers features
  if (currentUser?.accountType === 'advocate' && currentUser?.verificationStatus !== 'verified') {
    if (location.pathname !== '/advocate/status') {
      return <Navigate to="/advocate/status" replace />;
    }
  }

  return <Outlet />;
}

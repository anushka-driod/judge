import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loading } from '../components/common/Loading';

export function ProtectedRoute({ allowedRoles }) {
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

  const isAdv = currentUser?.role === 'lawyer' || currentUser?.role === 'advocate' || currentUser?.accountType === 'advocate';
  const isVer = (currentUser?.verificationStatus === 'verified' || currentUser?.verification_status === 'VERIFIED');
  const isAdmin = currentUser?.role === 'admin';

  // 2. Unapproved Advocates Routing: Pending/rejected/suspended advocates cannot access citizen or advocate chambers
  if (isAdv && !isVer && !isAdmin) {
    if (location.pathname !== '/advocate/status' && location.pathname !== '/lawyer/verification-status') {
      return <Navigate to="/advocate/status" replace />;
    }
  }

  // 3. Approved Advocates navigating to status page redirect to chambers
  if (isAdv && isVer && (location.pathname === '/advocate/status' || location.pathname === '/lawyer/verification-status')) {
    return <Navigate to="/lawyer/dashboard" replace />;
  }

  // 4. Role Guard Enforcement
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = isAdmin ? 'admin' : (isAdv ? 'lawyer' : 'user');
    if (!allowedRoles.includes(userRole) && !isAdmin) {
      if (isAdv) {
        return <Navigate to={isVer ? '/lawyer/dashboard' : '/advocate/status'} replace />;
      }
      return <Navigate to="/chat" replace />;
    }
  }

  return <Outlet />;
}

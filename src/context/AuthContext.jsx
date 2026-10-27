import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { Alert } from '../components/common/Alert';

const AuthContext = createContext(null);

function normalizeUser(user) {
  if (!user) return null;
  const rawRole = (user.role || '').toLowerCase();
  const rawAccountType = (user.accountType || '').toLowerCase();
  const rawStatus = String(user.verification_status || user.verificationStatus || '').toUpperCase();

  const isAdvocateRole = rawRole === 'lawyer' || rawRole === 'advocate' || rawAccountType === 'advocate';
  const isAdminRole = rawRole === 'admin';

  let role = 'user';
  let accountType = 'candidate';
  if (isAdminRole) {
    role = 'admin';
    accountType = 'admin';
  } else if (isAdvocateRole) {
    role = 'lawyer';
    accountType = 'advocate';
  }

  let verificationStatus = 'verified';
  if (isAdvocateRole) {
    if (rawStatus === 'VERIFIED' || rawStatus === 'ACTIVE') {
      verificationStatus = 'verified';
    } else if (rawStatus === 'REJECTED') {
      verificationStatus = 'rejected';
    } else if (rawStatus === 'SUSPENDED') {
      verificationStatus = 'suspended';
    } else {
      verificationStatus = 'pending';
    }
  }

  return {
    ...user,
    role,
    accountType,
    verificationStatus,
    verification_status: verificationStatus.toUpperCase(),
  };
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const setUser = (user) => {
    setCurrentUser(normalizeUser(user));
    if (user) setAuthError('');
  };

  const refreshUser = async () => {
    const storedToken = localStorage.getItem('vidhisetu_auth_token') || localStorage.getItem('earnlaw_auth_token');
    if (!storedToken) {
      setUser(null);
      setAuthError('');
      return null;
    }

    try {
      const user = await authService.getCurrentUser();
      setUser(user);
      setAuthError('');
      return user;
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        localStorage.removeItem('vidhisetu_auth_token');
        localStorage.removeItem('earnlaw_auth_token');
        localStorage.removeItem('vidhisetu_user_profile');
        setUser(null);
        setAuthError('');
      } else {
        setAuthError(err.message || 'Unable to restore your session because the backend is unavailable.');
      }
      return null;
    }
  };

  useEffect(() => {
    async function initAuth() {
      try {
        await refreshUser();
      } finally {
        setLoading(false);
      }
    }
    initAuth();
  }, []);

  const login = async (emailOrPhone, password) => {
    const res = await authService.login(emailOrPhone, password);
    if (res?.user) {
      setUser(res.user);
    }
    return res;
  };

  const register = async (userData) => {
    const res = await authService.register(userData);
    return res;
  };

  const verifyEmail = async (email, otp) => {
    const res = await authService.verifyEmail(email, otp);
    if (res?.user) {
      setUser(res.user);
    }
    return res;
  };

  const resendOtp = async (email, channel) => {
    return authService.resendOtp(email, channel);
  };

  const googleAuth = async (googleProfile) => {
    const res = await authService.googleAuth(googleProfile);
    if (res.user) {
      setUser(res.user);
    }
    return res;
  };

  const completeGoogleProfile = async (profileData) => {
    const res = await authService.completeGoogleProfile(profileData);
    if (res?.user) {
      setUser(res.user);
    }
    return res;
  };

  const forgotPassword = async (email) => {
    return authService.forgotPassword(email);
  };

  const resetPassword = async (email, otp, newPassword) => {
    return authService.resetPassword(email, otp, newPassword);
  };

  const updateProfile = async (profileData) => {
    const res = await authService.updateProfile(profileData);
    if (res?.user) {
      setUser(res.user);
    }
    return res;
  };

  const changePassword = async (passwordData) => {
    return authService.changePassword(passwordData);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setAuthError('');
    }
  };

  // Helper flags
  const isAuthenticated = !!currentUser;
  const isEmailVerified = currentUser ? currentUser.emailVerified !== false : false;
  const isCandidate = currentUser?.role === 'user' || currentUser?.accountType === 'candidate';
  const isAdvocate = currentUser?.role === 'lawyer' || currentUser?.role === 'advocate' || currentUser?.accountType === 'advocate';
  const isVerifiedAdvocate = isAdvocate && (currentUser?.verificationStatus === 'verified' || currentUser?.verification_status === 'VERIFIED');
  const isAdmin = currentUser?.role === 'admin';
  const advocateStatus = currentUser?.verificationStatus || (currentUser?.verification_status ? currentUser.verification_status.toLowerCase() : 'pending');

  const value = {
    currentUser,
    setCurrentUser: setUser,
    isAuthenticated,
    isEmailVerified,
    isCandidate,
    isAdvocate,
    isVerifiedAdvocate,
    isAdmin,
    advocateStatus,
    loading,
    authError,
    login,
    register,
    verifyEmail,
    resendOtp,
    googleAuth,
    completeGoogleProfile,
    forgotPassword,
    resetPassword,
    updateProfile,
    changePassword,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {authError && (
        <Alert type="danger" title="Authentication service unavailable" onClose={() => setAuthError('')}>
          {authError}{' '}
          <button type="button" onClick={refreshUser}>Retry</button>
        </Alert>
      )}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

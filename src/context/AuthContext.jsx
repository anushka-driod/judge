import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
      return user;
    } catch (err) {
      // Clear stale token so browser does not repeatedly error
      localStorage.removeItem('vidhisetu_auth_token');
      localStorage.removeItem('earnlaw_auth_token');
      setCurrentUser(null);
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
      setCurrentUser(res.user);
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
      setCurrentUser(res.user);
    }
    return res;
  };

  const sendOtp = async (phoneOrData) => {
    return authService.sendOtp(phoneOrData);
  };

  const verifyOtp = async (verifyData) => {
    const res = await authService.verifyOtp(verifyData);
    if (res?.user) {
      setCurrentUser(res.user);
    }
    return res;
  };

  const resendOtp = async (emailOrPhone) => {
    return authService.resendOtp(emailOrPhone);
  };

  const googleAuth = async (googleProfile) => {
    const res = await authService.googleAuth(googleProfile);
    if (!res.isNewUser && res.user) {
      setCurrentUser(res.user);
    }
    return res;
  };

  const completeGoogleProfile = async (profileData) => {
    const res = await authService.completeGoogleProfile(profileData);
    if (res?.user) {
      setCurrentUser(res.user);
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
      setCurrentUser(res.user);
    }
    return res;
  };

  const changePassword = async (passwordData) => {
    return authService.changePassword(passwordData);
  };

  const logout = async () => {
    await authService.logout();
    setCurrentUser(null);
  };

  // Helper flags
  const isAuthenticated = !!currentUser;
  const isEmailVerified = currentUser ? currentUser.emailVerified !== false : false;
  const isCandidate = currentUser?.accountType === 'candidate';
  const isAdvocate = currentUser?.accountType === 'advocate';
  const isVerifiedAdvocate = isAdvocate && currentUser?.verificationStatus === 'verified';
  const isAdmin = currentUser?.accountType === 'admin' || currentUser?.role === 'admin';
  const advocateStatus = currentUser?.verificationStatus || 'pending';

  const value = {
    currentUser,
    setCurrentUser,
    isAuthenticated,
    isEmailVerified,
    isCandidate,
    isAdvocate,
    isVerifiedAdvocate,
    isAdmin,
    advocateStatus,
    loading,
    login,
    register,
    sendOtp,
    verifyOtp,
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

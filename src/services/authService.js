import { request } from './api';
import { mockCurrentUser } from '../data/mockData';

// Ephemeral OTP store for mock fallback mode (keyed by email)
const mockOtpStorage = new Map();

export const authService = {
  /**
   * Log in an existing user with email/phone & password.
   * If email is unverified, server returns 403 { requiresVerification: true, email }.
   */
  async login(emailOrPhone, password) {
    const res = await request(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ emailOrPhone, password }),
      },
      () => {
        // Local mock fallback
        if (!emailOrPhone) throw new Error('Please enter your email or phone number');
        if (emailOrPhone === 'unverified@example.com') {
          const generatedOtp = '582914';
          mockOtpStorage.set(emailOrPhone.toLowerCase(), generatedOtp);
          const err = new Error('Please verify your email before continuing.');
          err.status = 403;
          err.data = { requiresVerification: true, email: emailOrPhone, otpPreview: generatedOtp };
          throw err;
        }

        const user = {
          ...mockCurrentUser,
          email: emailOrPhone,
          accountType: emailOrPhone.includes('advocate') ? 'advocate' : 'candidate',
          verificationStatus: emailOrPhone.includes('advocate') ? 'verified' : undefined,
          emailVerified: true,
        };

        const token = `vst_token_${user.id}_${Date.now()}`;
        localStorage.setItem('vidhisetu_auth_token', token);
        localStorage.setItem('earnlaw_auth_token', token);
        return { token, user };
      }
    );

    if (res?.token) {
      localStorage.setItem('vidhisetu_auth_token', res.token);
      localStorage.setItem('earnlaw_auth_token', res.token);
      if (res.user) {
        try {
          localStorage.setItem('vidhisetu_user_profile', JSON.stringify(res.user));
        } catch (_) {}
      }
    }
    return res;
  },

  /**
   * Register a new user (Candidate or Advocate).
   * Creates an account with emailVerified = false and triggers OTP verification.
   */
  async register(userData) {
    return request(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(userData),
      },
      () => {
        // Fallback mock: generate a realistic 6-digit OTP and store it
        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const normEmail = (userData.email || '').toLowerCase().trim();
        mockOtpStorage.set(normEmail, generatedOtp);

        return {
          success: true,
          email: userData.email,
          accountType: userData.accountType || 'candidate',
          otpPreview: generatedOtp,
          message: 'Account created! Verification code sent to your email.',
        };
      }
    );
  },

  /**
   * Verify email address using 6-digit OTP code.
   */
  async verifyEmail(email, otp) {
    const res = await request(
      '/auth/verify-email',
      {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
      },
      () => {
        // Fallback mock: strictly validate against the actual OTP stored for this email
        const normEmail = (email || '').toLowerCase().trim();
        const expectedOtp = mockOtpStorage.get(normEmail);

        if (!expectedOtp || String(otp).trim() !== String(expectedOtp).trim()) {
          throw new Error('Invalid verification code. Please check and try again.');
        }

        // Clean up OTP on success
        mockOtpStorage.delete(normEmail);

        const user = {
          ...mockCurrentUser,
          email,
          emailVerified: true,
        };
        const token = `vst_token_${Date.now()}`;
        localStorage.setItem('vidhisetu_auth_token', token);
        localStorage.setItem('earnlaw_auth_token', token);
        return { success: true, token, user, message: 'Email verified!' };
      }
    );

    if (res?.token) {
      localStorage.setItem('vidhisetu_auth_token', res.token);
      localStorage.setItem('earnlaw_auth_token', res.token);
    }
    return res;
  },

  /**
   * Resend 6-digit OTP verification code with rate limit countdown.
   */
  async resendOtp(emailOrPhone) {
    const payload = typeof emailOrPhone === 'string'
      ? (emailOrPhone.includes('@') ? { email: emailOrPhone } : { phone: emailOrPhone })
      : emailOrPhone;
    return request(
      '/auth/resend-otp',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => {
        return {
          success: true,
          message: 'A new 6-digit verification code has been sent.',
        };
      }
    );
  },

  /**
   * Send 6-digit OTP to mobile phone or email
   */
  async sendOtp(phoneOrData) {
    const payload = typeof phoneOrData === 'string' ? { phone: phoneOrData } : phoneOrData;
    return request(
      '/auth/send-otp',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => {
        return {
          success: true,
          maskedPhone: payload.phone ? `+91 ******${payload.phone.slice(-4)}` : null,
          expiresInSeconds: 300,
          message: 'Verification code dispatched.',
        };
      }
    );
  },

  /**
   * Verify OTP and complete authentication
   */
  async verifyOtp(verifyData) {
    const res = await request(
      '/auth/verify-otp',
      {
        method: 'POST',
        body: JSON.stringify(verifyData),
      },
      () => {
        const token = `vst_token_${Date.now()}`;
        localStorage.setItem('vidhisetu_auth_token', token);
        localStorage.setItem('earnlaw_auth_token', token);
        return {
          success: true,
          token,
          user: { ...mockCurrentUser, phone: verifyData.phone, emailVerified: true },
          message: 'OTP verified successfully!',
        };
      }
    );

    if (res?.token) {
      localStorage.setItem('vidhisetu_auth_token', res.token);
      localStorage.setItem('earnlaw_auth_token', res.token);
    }
    return res;
  },

  /**
   * Social Authentication (Continue with Google).
   * Sends Google credential or verified profile payload to backend.
   * Backend returns { isNewUser: boolean, token, user }.
   */
  async googleAuth(googlePayload) {
    const res = await request(
      '/auth/google',
      {
        method: 'POST',
        body: JSON.stringify(googlePayload),
      }
    );

    if (res?.token) {
      localStorage.setItem('vidhisetu_auth_token', res.token);
      localStorage.setItem('earnlaw_auth_token', res.token);
      if (res.user) {
        localStorage.setItem('vidhisetu_user_profile', JSON.stringify(res.user));
      }
    }
    return res;
  },

  /**
   * Complete profile for new user authenticated via Google.
   */
  async completeGoogleProfile(profileData) {
    const res = await request(
      '/auth/google/complete',
      {
        method: 'POST',
        body: JSON.stringify(profileData),
      }
    );

    if (res?.token) {
      localStorage.setItem('vidhisetu_auth_token', res.token);
      localStorage.setItem('earnlaw_auth_token', res.token);
      if (res.user) {
        localStorage.setItem('vidhisetu_user_profile', JSON.stringify(res.user));
      }
    }
    return res;
  },

  /**
   * Request password reset code to registered email.
   */
  async forgotPassword(email) {
    return request(
      '/auth/forgot-password',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      },
      () => ({
        success: true,
        email,
        resetPreview: '123456',
        message: 'Password reset code has been sent.',
      })
    );
  },

  /**
   * Submit OTP and new password to complete recovery.
   */
  async resetPassword(email, otp, newPassword) {
    return request(
      '/auth/reset-password',
      {
        method: 'POST',
        body: JSON.stringify({ email, otp, newPassword }),
      },
      () => ({
        success: true,
        message: 'Password reset successful!',
      })
    );
  },

  /**
   * Admin: List all advocate registration applications.
   */
  async getAdvocateApplications() {
    return request('/admin/advocates', {}, () => [
      {
        id: 'lawyer-pending-01',
        name: 'Adv. Vikram Malhotra',
        email: 'vikram.malhotra@example.com',
        phone: '+91 99887 66554',
        accountType: 'advocate',
        emailVerified: true,
        verificationStatus: 'pending',
        city: 'Mumbai',
        state: 'Maharashtra',
        advocateDetails: {
          barCouncil: 'Bar Council of Maharashtra & Goa',
          enrollmentNumber: 'MAH/4590/2018',
          enrollmentState: 'Maharashtra',
          enrollmentYear: 2018,
          practiceAreas: ['Property & RERA', 'Civil Disputes'],
          experienceYears: 8,
          officeAddress: 'Fort Chambers, Mumbai - 400001',
          documents: [
            { id: 'doc-1', name: 'Bar_Certificate_Vikram.pdf', type: 'Bar Enrollment Certificate', verified: false },
            { id: 'doc-2', name: 'Bar_ID_Vikram.pdf', type: 'Bar Council ID', verified: false },
          ],
        },
      },
    ]);
  },

  /**
   * Admin: Update advocate verification status (verified, rejected, requires_information).
   */
  async updateAdvocateStatus(advocateId, status, remarks) {
    return request(
      `/admin/advocates/${advocateId}/status`,
      {
        method: 'POST',
        body: JSON.stringify({ status, remarks }),
      },
      () => ({
        success: true,
        message: `Advocate status set to ${status}`,
      })
    );
  },

  /**
   * Update user profile information (Name, Phone, City, State, Location, Avatar).
   */
  async updateProfile(profileData) {
    return request(
      '/auth/profile',
      {
        method: 'PUT',
        body: JSON.stringify(profileData),
      },
      () => {
        const existing = (() => {
          try {
            const saved = localStorage.getItem('vidhisetu_user_profile');
            return saved ? JSON.parse(saved) : mockCurrentUser;
          } catch {
            return mockCurrentUser;
          }
        })();
        const updated = {
          ...existing,
          ...profileData,
        };
        try {
          localStorage.setItem('vidhisetu_user_profile', JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        return { success: true, user: updated, message: 'Profile updated successfully!' };
      }
    );
  },

  /**
   * Change password API placeholder.
   * Frontend validation & clean service ready for backend integration.
   */
  async changePassword(passwordData) {
    return request(
      '/auth/change-password',
      {
        method: 'POST',
        body: JSON.stringify(passwordData),
      },
      () => {
        if (!passwordData?.currentPassword) {
          throw new Error('Please enter your current password.');
        }
        if (!passwordData?.newPassword || passwordData.newPassword.length < 6) {
          throw new Error('New password must be at least 6 characters long.');
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
          throw new Error('New password and confirmation do not match.');
        }
        return {
          success: true,
          message: 'Password updated successfully! Next time please use your new password.',
        };
      }
    );
  },

  /**
   * Get active authenticated user session.
   */
  async getCurrentUser() {
    const token = localStorage.getItem('vidhisetu_auth_token') || localStorage.getItem('earnlaw_auth_token');
    if (!token) return null;

    const getSavedProfile = () => {
      try {
        const saved = localStorage.getItem('vidhisetu_user_profile');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed.id || parsed.email)) return parsed;
        }
      } catch (_) {}
      return null;
    };

    // If it's a mock token, return saved profile or fallback
    if (token.startsWith('vst_token_') || token.startsWith('mock_')) {
      const savedUser = getSavedProfile();
      if (savedUser) return savedUser;
    }

    try {
      const res = await request('/auth/me', {}, () => {
        return { user: getSavedProfile() || mockCurrentUser };
      });
      const user = res?.user || res;
      if (user && (user.id || user.email)) {
        try {
          localStorage.setItem('vidhisetu_user_profile', JSON.stringify(user));
        } catch (_) {}
        return user;
      }
      return getSavedProfile();
    } catch (err) {
      const saved = getSavedProfile();
      if (saved) return saved;
      if (err.status === 401 || err.status === 403) {
        localStorage.removeItem('vidhisetu_auth_token');
        localStorage.removeItem('earnlaw_auth_token');
        localStorage.removeItem('vidhisetu_user_profile');
      }
      return null;
    }
  },

  /**
   * Terminate user session.
   */
  async logout() {
    try {
      await request('/auth/logout', { method: 'POST' }).catch(() => null);
    } finally {
      localStorage.removeItem('vidhisetu_auth_token');
      localStorage.removeItem('earnlaw_auth_token');
      localStorage.removeItem('vidhisetu_user_profile');
    }
    return true;
  },
};

import { request } from './api';

function persistSession(result) {
  if (!result?.token) return;
  localStorage.setItem('vidhisetu_auth_token', result.token);
  localStorage.setItem('earnlaw_auth_token', result.token);
  if (result.user) {
    localStorage.setItem('vidhisetu_user_profile', JSON.stringify(result.user));
  }
}

export const authService = {
  async login(emailOrPhone, password) {
    const result = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrPhone, password }),
    });
    persistSession(result);
    return result;
  },

  async register(userData) {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async verifyEmail(email, otp) {
    const result = await request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
    persistSession(result);
    return result;
  },

  async resendOtp(email, channel = 'both') {
    const payload = typeof email === 'string' ? { email, channel } : email;
    return request('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async googleAuth(googlePayload) {
    const result = await request('/auth/google', {
      method: 'POST',
      body: JSON.stringify(googlePayload),
    });
    persistSession(result);
    return result;
  },

  async completeGoogleProfile(profileData) {
    const result = await request('/auth/google/complete', {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
    persistSession(result);
    return result;
  },

  async forgotPassword(email) {
    return request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(email, otp, newPassword) {
    return request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword }),
    });
  },

  async getAdvocateApplications() {
    return request('/admin/advocates');
  },

  async updateAdvocateStatus(advocateId, status, remarks) {
    return request(`/admin/advocates/${advocateId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, remarks }),
    });
  },

  async retryAdvocateStatusNotification(advocateId) {
    return request(`/admin/advocates/${advocateId}/retry-status-notification`, {
      method: 'POST',
    });
  },

  async updateProfile(profileData) {
    const result = await request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    if (result?.user) {
      localStorage.setItem('vidhisetu_user_profile', JSON.stringify(result.user));
    }
    return result;
  },

  async changePassword(passwordData) {
    return request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(passwordData),
    });
  },

  async getCurrentUser() {
    const token = localStorage.getItem('vidhisetu_auth_token') || localStorage.getItem('earnlaw_auth_token');
    if (!token) return null;

    try {
      const result = await request('/auth/me');
      const user = result?.user || result;
      if (user && (user.id || user.email)) {
        localStorage.setItem('vidhisetu_user_profile', JSON.stringify(user));
        return user;
      }
      return null;
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        localStorage.removeItem('vidhisetu_auth_token');
        localStorage.removeItem('earnlaw_auth_token');
        localStorage.removeItem('vidhisetu_user_profile');
      }
      throw err;
    }
  },

  async logout() {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('vidhisetu_auth_token');
      localStorage.removeItem('earnlaw_auth_token');
      localStorage.removeItem('vidhisetu_user_profile');
    }
    return true;
  },
};

import AuthService from '../services/authService.js';
import UserModel from '../models/userModel.js';

export const AuthController = {
  /**
   * POST /api/auth/register
   */
  async register(req, res) {
    try {
      const result = await AuthService.register(req.body);
      res.status(201).json(result);
    } catch (err) {
      res.status(err.status || 500).json({
        error: err.message || 'Registration failed.',
      });
    }
  },

  /**
   * POST /api/auth/login
   */
  async login(req, res) {
    try {
      const { emailOrPhone, email, phone, password } = req.body;
      const targetIdentifier = emailOrPhone || email || phone;

      const reqMeta = {
        ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await AuthService.login(targetIdentifier, password, reqMeta);
      res.json(result);
    } catch (err) {
      const status = err.status || 500;
      const responseBody = {
        error: err.message || 'Login failed.',
      };
      if (err.data) {
        Object.assign(responseBody, err.data);
      }
      res.status(status).json(responseBody);
    }
  },

  /**
   * POST /api/auth/verify-email
   */
  async verifyEmail(req, res) {
    try {
      const { email, otp } = req.body;
      const result = await AuthService.verifyEmail(email, otp);
      res.json(result);
    } catch (err) {
      res.status(err.status || 400).json({
        error: err.message || 'Verification failed.',
        ...(err.data || {}),
      });
    }
  },

  /**
   * POST /api/auth/send-otp
   * Generates and dispatches OTP via SMS / Email
   */
  async sendOtp(req, res) {
    try {
      const { phone, email, purpose } = req.body;
      const result = await AuthService.sendOtp({ phone, email, purpose });
      res.json(result);
    } catch (err) {
      res.status(err.status || 400).json({
        error: err.message || 'Failed to dispatch OTP.',
        code: err.code,
        maskedPhone: err.maskedPhone,
        ...(err.data || {}),
      });
    }
  },

  /**
   * POST /api/auth/verify-otp
   * Verifies OTP and returns auth session
   */
  async verifyOtp(req, res) {
    try {
      const { phone, email, otp } = req.body;
      const result = await AuthService.verifyOtp({ phone, email, otp });
      res.json(result);
    } catch (err) {
      res.status(err.status || 400).json({
        error: err.message || 'OTP verification failed.',
        code: err.code,
        ...(err.data || {}),
      });
    }
  },

  /**
   * POST /api/auth/resend-otp
   */
  async resendOtp(req, res) {
    try {
      const { email, phone, channel = 'both' } = req.body;
      let result;
      if (phone) {
        result = await AuthService.sendOtp({ phone, email, purpose: 'resend' });
      } else {
        result = await AuthService.resendOtp(email, channel);
      }
      res.json(result);
    } catch (err) {
      res.status(err.status || 400).json({
        error: err.message || 'Resending verification code failed.',
        code: err.code,
        ...(err.data || {}),
      });
    }
  },

  /**
   * GET /api/auth/me
   */
  async getMe(req, res) {
    try {
<<<<<<< HEAD
      const user = await AuthService.getCurrentUser(req.user.id, req.user);
=======
      const user = await AuthService.getCurrentUser(req.user.id);
>>>>>>> origin/main
      res.json({ user });
    } catch (err) {
      res.status(err.status || 500).json({
        error: err.message || 'Could not fetch user profile.',
      });
    }
  },

  /**
   * GET /api/auth/login-history (for security review)
   */
  async getLoginHistory(req, res) {
    try {
      const logs = await UserModel.getLoginLogs(req.user.email, 10);
      res.json({ logs });
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve login history.' });
    }
  },

  /**
<<<<<<< HEAD
   * POST /api/auth/google
   * Authenticate via Google Identity Services / Google OAuth
   */
  async googleAuth(req, res) {
    try {
      const result = await AuthService.googleAuth(req.body);
      res.json(result);
    } catch (err) {
      res.status(err.status || 400).json({
        error: err.message || 'Google authentication failed.',
      });
    }
  },

  /**
   * POST /api/auth/google/complete
   * Complete advocate/candidate onboarding for Google sign-in
   */
  async completeGoogleProfile(req, res) {
    try {
      const result = await AuthService.completeGoogleProfile(req.body);
      res.json(result);
    } catch (err) {
      res.status(err.status || 400).json({
        error: err.message || 'Failed to complete profile.',
      });
    }
  },

  /**
   * POST /api/auth/forgot-password
   */
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      const result = await AuthService.forgotPassword(email);
      res.json(result);
    } catch (err) {
      res.status(err.status || 400).json({
        error: err.message || 'Password reset request failed.',
      });
    }
  },

  /**
   * POST /api/auth/reset-password
   */
  async resetPassword(req, res) {
    try {
      const { email, otp, newPassword } = req.body;
      const result = await AuthService.resetPassword(email, otp, newPassword);
      res.json(result);
    } catch (err) {
      res.status(err.status || 400).json({
        error: err.message || 'Password reset failed.',
      });
    }
  },

  /**
   * PUT /api/auth/profile
   */
  async updateProfile(req, res) {
    try {
      const result = await AuthService.updateProfile(req.user.id, req.body);
      res.json(result);
    } catch (err) {
      res.status(err.status || 400).json({
        error: err.message || 'Profile update failed.',
      });
    }
  },

  /**
   * POST /api/auth/change-password
   */
  async changePassword(req, res) {
    try {
      const result = await AuthService.changePassword(req.user.id, req.body);
      res.json(result);
    } catch (err) {
      res.status(err.status || 400).json({
        error: err.message || 'Failed to change password.',
      });
    }
  },

  /**
=======
>>>>>>> origin/main
   * POST /api/auth/logout
   */
  async logout(req, res) {
    res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  },
};

export default AuthController;

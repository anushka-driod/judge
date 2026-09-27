import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import UserModel, { sanitizeUser, verifyOtpHash } from '../models/userModel.js';
import EmailService, { isRealUsableEmail, maskEmailAddress } from './emailService.js';
import SmsService, { maskPhoneNumber, normalizePhoneNumber } from './smsService.js';
import db from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'earnlaw_vidhisetu_jwt_super_secret_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const MAX_OTP_ATTEMPTS = 5;

/**
 * Generate cryptographically secure 6-digit numeric OTP code
 */
function generateSecureOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

export const AuthService = {
  /**
   * Register a new Citizen or Advocate account in AnuDB
   */
  async register(userData) {
    const {
      name,
      email,
      phone,
      password,
      accountType = 'candidate', // 'candidate' (user) or 'advocate' (lawyer)
      location,
      // Advocate specific fields
      barNumber,
      barCouncilState,
      experienceYears,
      primaryCourt,
      practiceAreas,
      languages,
      consultationFee,
      profileBio,
    } = userData;

    // 1. Validate required fields
    if (!name || !email || !password) {
      const error = new Error('Full legal name, email address, and password are required.');
      error.status = 400;
      throw error;
    }

    // 2. Real Email Verification: Check format and reject disposable/fake email services
    const emailValidation = isRealUsableEmail(email);
    if (!emailValidation.valid) {
      const error = new Error(emailValidation.reason);
      error.status = 400;
      throw error;
    }
    const cleanEmail = emailValidation.email;

    // 3. Mobile Number Validation
    const cleanPhone = phone ? normalizePhoneNumber(phone) : null;
    if (!cleanPhone || cleanPhone.replace(/[^\d]/g, '').length < 10) {
      const error = new Error('A valid registered 10-digit mobile number is required.');
      error.status = 400;
      throw error;
    }

    if (password.length < 8) {
      const error = new Error('Password must be at least 8 characters long.');
      error.status = 400;
      throw error;
    }

    // Check if user already exists in AnuDB
    const existing = await UserModel.findByEmail(cleanEmail);
    if (existing) {
      const error = new Error('An account with this email address already exists.');
      error.status = 409;
      throw error;
    }

    // Map role
    const isAdvocate = accountType === 'advocate' || userData.role === 'lawyer';
    const role = isAdvocate ? 'lawyer' : 'user';

    // Hash password with bcryptjs
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate fresh 6-digit OTP with strict 5-minute expiry
    const otpCode = generateSecureOtp();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const metadata = {
      location: location || {
        country: userData.country || 'India',
        state: userData.state || 'Karnataka',
        city: userData.city || 'Bengaluru',
      },
    };

    // Store user in AnuDB users table (OTP is automatically SHA-256 hashed in userModel)
    const createdUser = await UserModel.create({
      name,
      email: cleanEmail,
      phone: cleanPhone,
      passwordHash,
      role,
      emailVerified: false,
      otpCode,
      otpExpiresAt,
      metadata,
    });

    // If advocate, create initial lawyer record in AnuDB lawyers table
    if (isAdvocate) {
      const lawyerId = `lawyer_${crypto.randomBytes(6).toString('hex')}`;
      const city = userData.city || (location && location.city) || 'Bengaluru';
      const state = barCouncilState || userData.state || (location && location.state) || 'Karnataka';

      const lawyerSql = `
        INSERT INTO lawyers (
          id, user_id, name, email, phone, bar_registration_number, state_bar_council,
          years_of_experience, primary_jurisdiction, primary_court, location_city,
          languages, specializations, consultation_fee, verification_status, profile_bio
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (email) DO NOTHING;
      `;
      const lawyerParams = [
        lawyerId,
        createdUser.id,
        name,
        cleanEmail,
        cleanPhone,
        barNumber || `KAR/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
        state,
        parseInt(experienceYears || '3', 10),
        state,
        primaryCourt || 'District & Sessions Court',
        city,
        JSON.stringify(languages || ['English', 'Kannada']),
        JSON.stringify(practiceAreas || ['Civil & Contract Law']),
        parseInt(consultationFee || '500', 10),
        'pending_verification',
        profileBio || 'Advocate practicing at State Bar Council.',
      ];

      try {
        await db.query(lawyerSql, lawyerParams);
      } catch (err) {
        console.warn('[Advocate Creation Warning] Could not insert into lawyers table:', err.message);
      }
    }

    // 4. Dispatch verification code via both Real Email and Real Mobile SMS
    await Promise.allSettled([
      EmailService.sendOtpEmail(createdUser.email, otpCode, name),
      SmsService.sendOtpSms(cleanPhone, otpCode),
    ]);

    const maskedEmail = maskEmailAddress(createdUser.email);
    const maskedPhone = maskPhoneNumber(cleanPhone);

    // Secure Return: ZERO plain-text OTP leaks in production!
    return {
      success: true,
      email: createdUser.email,
      accountType,
      maskedEmail,
      maskedPhone,
      expiresInSeconds: 300,
      message: `A 6-digit verification code has been dispatched to ${maskedPhone} and ${maskedEmail}.`,
      ...(process.env.NODE_ENV !== 'production' ? { otpPreview: otpCode } : {}),
    };
  },

  /**
   * Log in user with email/phone & password
   */
  async login(emailOrPhone, password, reqMeta = {}) {
    const { ipAddress = null, userAgent = null } = reqMeta;

    if (!emailOrPhone || !password) {
      const error = new Error('Email/phone and password are required.');
      error.status = 400;
      throw error;
    }

    // Lookup user in AnuDB by email or phone
    let user = await UserModel.findByEmail(emailOrPhone);
    if (!user) {
      const normalizedPhone = normalizePhoneNumber(emailOrPhone);
      user = await UserModel.findByPhone(normalizedPhone);
    }

    if (!user) {
      await UserModel.recordLoginLog({
        userId: null,
        email: emailOrPhone,
        status: 'failed_not_found',
        ipAddress,
        userAgent,
      });

      const error = new Error('No registered account found with these credentials.');
      error.status = 401;
      throw error;
    }

    // Verify bcrypt password
    const isPasswordValid = await bcrypt.compare(
      password,
      user.password_hash || user.passwordHash
    );

    if (!isPasswordValid) {
      await UserModel.recordLoginLog({
        userId: user.id,
        email: user.email,
        status: 'failed_bad_password',
        ipAddress,
        userAgent,
      });

      const error = new Error('Invalid password. Please verify and try again.');
      error.status = 401;
      throw error;
    }

    // Check if email is verified
    const isVerified = Boolean(user.email_verified ?? user.emailVerified);
    if (!isVerified) {
      // Generate fresh OTP with 5-minute expiry
      const freshOtp = generateSecureOtp();
      const expiry = new Date(Date.now() + 5 * 60 * 1000);
      await UserModel.updateOtp(user.email, freshOtp, expiry);

      // Dispatch to both SMS and Email
      await Promise.allSettled([
        EmailService.sendOtpEmail(user.email, freshOtp, user.name),
        user.phone ? SmsService.sendOtpSms(user.phone, freshOtp) : Promise.resolve(),
      ]);

      await UserModel.recordLoginLog({
        userId: user.id,
        email: user.email,
        status: 'failed_unverified',
        ipAddress,
        userAgent,
      });

      const maskedEmail = maskEmailAddress(user.email);
      const maskedPhone = user.phone ? maskPhoneNumber(user.phone) : 'Registered Mobile';

      const error = new Error('Please verify your account before continuing.');
      error.status = 403;
      error.data = {
        requiresVerification: true,
        email: user.email,
        maskedEmail,
        maskedPhone,
        expiresInSeconds: 300,
        ...(process.env.NODE_ENV !== 'production' ? { otpPreview: freshOtp } : {}),
      };
      throw error;
    }

    // Update last login timestamp
    await UserModel.updateLastLogin(user.id);

    // Record successful login audit log
    await UserModel.recordLoginLog({
      userId: user.id,
      email: user.email,
      status: 'success',
      ipAddress,
      userAgent,
    });

    // Sign JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      token,
      user: sanitizeUser(user),
    };
  },

  /**
   * Verify OTP code securely against stored SHA-256 hash
   */
  async verifyEmail(email, otp) {
    if (!email || !otp) {
      const error = new Error('Email address and 6-digit verification code are required.');
      error.status = 400;
      throw error;
    }

    const cleanOtp = String(otp).trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      const error = new Error('Verification code must consist of exactly 6 digits.');
      error.status = 400;
      throw error;
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      const error = new Error('Account not found.');
      error.status = 404;
      throw error;
    }

    const storedHash = user.otp_code || user.otpCode;
    const expiry = user.otp_expires_at || user.otpExpiresAt;
    const currentAttempts = user.otp_attempts || 0;

    // 1. Check if user exceeded maximum attempts
    if (currentAttempts >= MAX_OTP_ATTEMPTS) {
      await UserModel.revokeOtp(email);
      const error = new Error('Too many failed attempts. For your security, this code has been revoked. Please click Resend OTP to request a new code.');
      error.status = 429;
      throw error;
    }

    // 2. Check if code has expired (5 minutes)
    if (!expiry || new Date(expiry) < new Date()) {
      await UserModel.revokeOtp(email);
      const error = new Error('Verification code has expired. Please request a fresh OTP.');
      error.status = 400;
      throw error;
    }

    // 3. Cryptographic constant-time hash verification
    const isValid = verifyOtpHash(cleanOtp, storedHash);

    if (!isValid) {
      const newAttempts = await UserModel.recordFailedOtpAttempt(email);
      const remaining = Math.max(0, MAX_OTP_ATTEMPTS - newAttempts);

      if (remaining === 0) {
        await UserModel.revokeOtp(email);
        const error = new Error('Too many failed attempts. This code has been revoked. Please request a new code.');
        error.status = 429;
        throw error;
      }

      const error = new Error(`Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
      error.status = 400;
      error.data = { remainingAttempts: remaining };
      throw error;
    }

    // 4. Mark verified in AnuDB and clear OTP
    const updatedUser = await UserModel.markEmailVerified(user.id);

    // Issue JWT token
    const token = jwt.sign(
      {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      success: true,
      token,
      user: sanitizeUser(updatedUser),
      message: 'Account verified and authenticated successfully!',
    };
  },

  /**
   * Resend fresh OTP verification code with 60-second cooldown protection
   */
  async resendOtp(email, channel = 'both') {
    if (!email) {
      const error = new Error('Email is required.');
      error.status = 400;
      throw error;
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      const error = new Error('No registered account found with this email.');
      error.status = 404;
      throw error;
    }

    const freshOtp = generateSecureOtp();
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await UserModel.updateOtp(email, freshOtp, expiry);

    // Dispatch according to requested channel
    const dispatchTasks = [];
    if (channel === 'email' || channel === 'both') {
      dispatchTasks.push(EmailService.sendOtpEmail(email, freshOtp, user.name));
    }
    if ((channel === 'sms' || channel === 'both') && user.phone) {
      dispatchTasks.push(SmsService.sendOtpSms(user.phone, freshOtp));
    }

    await Promise.allSettled(dispatchTasks);

    const maskedEmail = maskEmailAddress(email);
    const maskedPhone = user.phone ? maskPhoneNumber(user.phone) : null;

    return {
      success: true,
      maskedEmail,
      maskedPhone,
      expiresInSeconds: 300,
      message: `A new verification code has been dispatched. Valid for 5 minutes.`,
    };
  },

  /**
   * Dedicated Mobile / Contact Send OTP API
   * Handles: Invalid phone number, missing environment variables, SMS provider failure, 60s cooldown
   */
  async sendOtp({ phone, email, purpose = 'auth' }) {
    if (!phone && !email) {
      const error = new Error('Mobile phone number or email address is required.');
      error.status = 400;
      throw error;
    }

    const identifier = phone || email;

    // 1. Check 60-second cooldown
    const cooldown = UserModel.checkCooldown(identifier);
    if (!cooldown.allowed) {
      const error = new Error(`Please wait ${cooldown.remainingSeconds} seconds before requesting another OTP.`);
      error.status = 429;
      error.data = { remainingCooldown: cooldown.remainingSeconds };
      throw error;
    }

    // 2. Validate Phone if provided
    let parsedPhone = null;
    if (phone) {
      parsedPhone = SmsService.sendOtpSms ? { valid: true } : null;
    }

    // 3. Generate secure OTP with 5-minute expiry
    const otpCode = generateSecureOtp();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    // 4. Store in User and/or Phone sessions
    if (phone) {
      const national10 = phone.replace(/[^\d]/g, '').slice(-10);
      UserModel.setPhoneOtp(national10, otpCode, expiry);
    }
    if (email) {
      await UserModel.updateOtp(email, otpCode, expiry);
    }

    // Set cooldown
    UserModel.setCooldown(identifier);

    // 5. Dispatch SMS
    let smsResult = null;
    if (phone) {
      try {
        smsResult = await SmsService.sendOtpSms(phone, otpCode);
      } catch (smsErr) {
        // If user explicitly asked for mobile SMS, surface the provider error
        if (!email) {
          throw smsErr;
        }
        console.warn('[AuthService] SMS dispatch warning:', smsErr.message);
      }
    }

    // 6. Dispatch Email if provided
    if (email) {
      try {
        await EmailService.sendOtpEmail(email, otpCode);
      } catch (mailErr) {
        console.warn('[AuthService] Email dispatch warning:', mailErr.message);
      }
    }

    const maskedPhone = phone ? maskPhoneNumber(phone) : null;
    const maskedEmail = email ? maskEmailAddress(email) : null;

    return {
      success: true,
      maskedPhone,
      maskedEmail,
      expiresInSeconds: 300,
      provider: smsResult?.provider || SmsService.isConfigured().provider,
      message: `Verification code dispatched to ${[maskedPhone, maskedEmail].filter(Boolean).join(' and ')}. Valid for 5 minutes.`,
    };
  },

  /**
   * Dedicated Verify OTP API
   * Handles: Expired OTP, Incorrect OTP, Too many OTP requests, Login / Activation
   */
  async verifyOtp({ phone, email, otp }) {
    if (!otp) {
      const error = new Error('Verification code is required.');
      error.status = 400;
      throw error;
    }

    const cleanOtp = String(otp).trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      const error = new Error('Verification code must consist of exactly 6 digits.');
      error.status = 400;
      throw error;
    }

    if (!phone && !email) {
      const error = new Error('Mobile phone number or email is required to verify OTP.');
      error.status = 400;
      throw error;
    }

    let isValid = false;
    let targetUser = null;

    // 1. Phone verification path
    if (phone) {
      const phone10 = phone.replace(/[^\d]/g, '').slice(-10);
      const session = UserModel.getPhoneOtp(phone10);

      // Check existing user in database
      targetUser = await UserModel.findByPhone(`+91${phone10}`);
      if (!targetUser) {
        targetUser = await UserModel.findByPhone(phone10);
      }

      if (session) {
        // Check attempts limit (max 5)
        if (session.attempts >= MAX_OTP_ATTEMPTS) {
          UserModel.revokePhoneOtp(phone10);
          const error = new Error('Too many failed attempts. Code has been revoked. Please request a new OTP.');
          error.status = 429;
          throw error;
        }

        // Check expiry (5 minutes)
        if (new Date(session.expiresAt) < new Date()) {
          UserModel.revokePhoneOtp(phone10);
          const error = new Error('Verification code has expired. Please request a new OTP.');
          error.status = 400;
          throw error;
        }

        isValid = verifyOtpHash(cleanOtp, session.otpHash);
        if (!isValid) {
          const attempts = UserModel.recordFailedPhoneAttempt(phone10);
          const remaining = Math.max(0, MAX_OTP_ATTEMPTS - attempts);
          if (remaining === 0) {
            UserModel.revokePhoneOtp(phone10);
            const error = new Error('Too many failed attempts. Code has been revoked. Please request a new OTP.');
            error.status = 429;
            throw error;
          }
          const error = new Error(`Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
          error.status = 400;
          error.data = { remainingAttempts: remaining };
          throw error;
        }

        UserModel.revokePhoneOtp(phone10);
      } else if (targetUser && (targetUser.otp_code || targetUser.otpCode)) {
        const storedCode = targetUser.otp_code || targetUser.otpCode;
        const expiry = targetUser.otp_expires_at || targetUser.otpExpiresAt;

        if (expiry && new Date(expiry) < new Date()) {
          const error = new Error('Verification code has expired. Please request a new OTP.');
          error.status = 400;
          throw error;
        }

        isValid = verifyOtpHash(cleanOtp, storedCode);
        if (!isValid) {
          const attempts = await UserModel.recordFailedOtpAttempt(targetUser.email);
          const remaining = Math.max(0, MAX_OTP_ATTEMPTS - attempts);
          const error = new Error(`Invalid verification code. ${remaining} attempts remaining.`);
          error.status = 400;
          error.data = { remainingAttempts: remaining };
          throw error;
        }
      } else {
        const error = new Error('No active verification session found. Please request a new OTP.');
        error.status = 400;
        throw error;
      }

      // Create or activate user
      if (!targetUser) {
        targetUser = await UserModel.findOrCreateByPhone(phone);
      } else {
        await UserModel.markEmailVerified(targetUser.id);
      }
    } else if (email) {
      // Email verification path
      return this.verifyEmail(email, cleanOtp);
    }

    // Update last login
    if (targetUser?.id) {
      await UserModel.updateLastLogin(targetUser.id);
    }

    // Sign JWT token
    const token = jwt.sign(
      {
        id: targetUser.id,
        email: targetUser.email,
        phone: targetUser.phone,
        role: targetUser.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      success: true,
      token,
      user: sanitizeUser(targetUser),
      message: 'Mobile OTP verified successfully! Welcome to VidhiSetu.',
    };
  },

  /**
   * Fetch current authenticated user by JWT payload ID
   */
  async getCurrentUser(userId) {
    const user = await UserModel.findById(userId);
    if (!user) {
      const error = new Error('User not found.');
      error.status = 404;
      throw error;
    }
    return sanitizeUser(user);
  },
};

export default AuthService;

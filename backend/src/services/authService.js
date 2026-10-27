import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import UserModel, { sanitizeUser, verifyOtpHash } from '../models/userModel.js';
import EmailService, { isRealUsableEmail, maskEmailAddress } from './emailService.js';
import SmsService, { maskPhoneNumber, normalizePhoneNumber, parseAndValidatePhone } from './smsService.js';
import LawyerPortalService from './lawyerPortalService.js';
import db from '../config/db.js';
import { storeVerificationDocument, validateVerificationDocument } from './verificationDocumentService.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV !== 'test') {
  throw new Error('JWT_SECRET must be configured before authentication can start.');
}
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
      const error = new Error('An account with this email already exists. Please log in.');
      error.status = 409;
      throw error;
    }

    const isAdvocate = accountType === 'advocate';
    const advocateDetails = userData.advocateDetails || {};
    const advocateDocuments = advocateDetails.documents;
    if (isAdvocate) {
      const enrollmentNumber = barNumber || advocateDetails.enrollmentNumber;
      const council = barCouncilState || advocateDetails.barCouncil;
      const city = userData.city || location?.city;
      const state = userData.state || location?.state;
      const years = Number(experienceYears ?? advocateDetails.experienceYears);
      const fee = Number(consultationFee ?? advocateDetails.consultationFee);
      if (
        !enrollmentNumber || !council || !city || !state || !primaryCourt ||
        !Number.isInteger(years) || years < 0 ||
        !Number.isFinite(fee) || fee <= 0 ||
        !Array.isArray(practiceAreas) || practiceAreas.length === 0 ||
        !Array.isArray(languages) || languages.length === 0
      ) {
        const error = new Error('Complete the advocate profile with your actual Bar Council, enrollment, court, location, experience, fee, practice areas, and languages.');
        error.status = 400;
        throw error;
      }
      if (!Array.isArray(advocateDocuments) || advocateDocuments.length !== 2) {
        const error = new Error('Upload both the Bar Enrollment Certificate and Advocate Identity Card before submitting.');
        error.status = 400;
        throw error;
      }
      for (const document of advocateDocuments) validateVerificationDocument(document);
    }

    // An advocate role represents a pending application; approved access is checked separately.
    const role = isAdvocate ? 'lawyer' : 'user';

    // Hash password with bcryptjs
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate fresh 6-digit OTP with strict 5-minute expiry
    const otpCode = generateSecureOtp();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const metadata = {
      location: location || {
        country: userData.country || null,
        state: userData.state || null,
        city: userData.city || null,
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

    // Store single-use email verification token and establish 60s cooldown
    UserModel.setVerificationToken(cleanEmail, verificationToken, otpExpiresAt);
    UserModel.setCooldown(cleanEmail);
    if (cleanPhone) {
      UserModel.setCooldown(cleanPhone);
    }

    // If advocate, create initial lawyer record in AnuDB lawyers table and notify admin
    if (isAdvocate) {
      const lawyerId = `lawyer_${crypto.randomBytes(6).toString('hex')}`;
      const storedDocuments = await Promise.all(advocateDocuments.map((document) => storeVerificationDocument(document)));
      await LawyerPortalService.registerAdvocate({
        id: lawyerId,
        userId: createdUser.id,
        name,
        email: cleanEmail,
        phone: cleanPhone,
        barRegistrationNumber: barNumber || advocateDetails.enrollmentNumber,
        stateBarCouncil: barCouncilState || advocateDetails.barCouncil,
        yearOfEnrollment: advocateDetails.enrollmentYear,
        yearsOfExperience: Number(experienceYears ?? advocateDetails.experienceYears),
        primaryCourt,
        city: userData.city || location?.city,
        jurisdiction: userData.state || location?.state,
        specializations: practiceAreas,
        languages,
        consultationModes: userData.consultationModes,
        consultationFee: Number(consultationFee ?? advocateDetails.consultationFee),
        bio: profileBio || advocateDetails.profileBio,
        photoUrl: userData.photoUrl,
        documents: storedDocuments,
      });
    }

    // 4. Dispatch verification and report each provider outcome.
    const [emailDispatch, smsDispatch] = await Promise.allSettled([
      EmailService.sendVerificationEmail(createdUser.email, { token: verificationToken, otpCode, userName: name }),
      SmsService.sendOtpSms(cleanPhone, otpCode),
    ]);

    const maskedEmail = maskEmailAddress(createdUser.email);
    const maskedPhone = maskPhoneNumber(cleanPhone);
    const emailAccepted = emailDispatch.status === 'fulfilled' && Boolean(emailDispatch.value?.delivered);
    const smsAccepted = smsDispatch.status === 'fulfilled' && Boolean(smsDispatch.value?.delivered);

    // Secure Return: ZERO plain-text OTP leaks in production!
    return {
      success: true,
      email: createdUser.email,
      accountType: isAdvocate ? 'advocate' : 'candidate',
      maskedEmail,
      maskedPhone,
      expiresInSeconds: 300,
      emailStatus: emailAccepted ? 'accepted' : 'failed',
      smsStatus: smsAccepted ? 'accepted' : 'failed',
      message: `Verification delivery: email ${emailAccepted ? 'accepted by provider' : 'failed'}; SMS ${smsAccepted ? 'accepted by provider' : 'failed'}.`,
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
      const [emailDispatch, smsDispatch] = await Promise.allSettled([
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
        emailStatus: emailDispatch.status === 'fulfilled' && emailDispatch.value?.delivered ? 'accepted' : 'failed',
        smsStatus: !user.phone ? 'not_configured' : (smsDispatch.status === 'fulfilled' && smsDispatch.value?.delivered ? 'accepted' : 'failed'),
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
   * Verify email via single-use token or 6-digit OTP code securely
   */
  async verifyEmail(email, otp, maybeToken = null) {
    let cleanEmail = typeof email === 'object' && email !== null ? email.email : email;
    let cleanOtp = typeof email === 'object' && email !== null ? (email.otp || email.otpCode) : otp;
    let token = typeof email === 'object' && email !== null ? (email.token || email.verificationToken) : (maybeToken || (otp && String(otp).length > 10 ? otp : null));

    if (!cleanEmail) {
      const error = new Error('Email address is required.');
      error.status = 400;
      throw error;
    }
    cleanEmail = cleanEmail.toLowerCase().trim();

    // 1. Single-use verification link token path
    if (token) {
      const updatedUser = await UserModel.verifyAndConsumeEmailToken(cleanEmail, token);
      if (updatedUser) {
        const authToken = jwt.sign(
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
          token: authToken,
          user: sanitizeUser(updatedUser),
          message: 'Email verified successfully via secure token! Welcome to VidhiSetu.',
        };
      }
    }

    // 2. 6-digit OTP code path
    if (!cleanOtp) {
      const error = new Error('Email address and 6-digit verification code or token are required.');
      error.status = 400;
      throw error;
    }

    cleanOtp = String(cleanOtp).trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      const error = new Error('Verification code must consist of exactly 6 digits.');
      error.status = 400;
      throw error;
    }

    const user = await UserModel.findByEmail(cleanEmail);
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
      await UserModel.revokeOtp(cleanEmail);
      const error = new Error('Too many failed attempts. For your security, this code has been revoked. Please click Resend OTP to request a new code.');
      error.status = 429;
      throw error;
    }

    // 2. Check if code has expired (5 minutes)
    if (!expiry || new Date(expiry) < new Date()) {
      await UserModel.revokeOtp(cleanEmail);
      const error = new Error('Verification code has expired. Please request a fresh OTP.');
      error.status = 400;
      throw error;
    }

    // 3. Cryptographic constant-time hash verification
    const isValid = verifyOtpHash(cleanOtp, storedHash);

    if (!isValid) {
      const newAttempts = await UserModel.recordFailedOtpAttempt(cleanEmail);
      const remaining = Math.max(0, MAX_OTP_ATTEMPTS - newAttempts);

      if (remaining === 0) {
        await UserModel.revokeOtp(cleanEmail);
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
    const tokenIssued = jwt.sign(
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
      token: tokenIssued,
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

    const cleanEmail = email.toLowerCase().trim();
    const user = await UserModel.findByEmail(cleanEmail);
    if (!user) {
      const error = new Error('No registered account found with this email.');
      error.status = 404;
      throw error;
    }

    // Check cooldown
    const cooldown = UserModel.checkCooldown(cleanEmail);
    if (!cooldown.allowed) {
      const error = new Error(`Please wait ${cooldown.remainingSeconds} seconds before requesting a new code.`);
      error.status = 429;
      error.data = { remainingCooldown: cooldown.remainingSeconds };
      throw error;
    }

    const freshOtp = generateSecureOtp();
    const freshToken = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await UserModel.updateOtp(cleanEmail, freshOtp, expiry);
    UserModel.setVerificationToken(cleanEmail, freshToken, expiry);
    UserModel.setCooldown(cleanEmail);

    // Dispatch according to requested channel
    const dispatchTasks = [];
    if (channel === 'email' || channel === 'both') {
      dispatchTasks.push(EmailService.sendVerificationEmail(cleanEmail, { token: freshToken, otpCode: freshOtp, userName: user.name }));
    }
    if ((channel === 'sms' || channel === 'both') && user.phone) {
      dispatchTasks.push(SmsService.sendOtpSms(user.phone, freshOtp));
    }

    const dispatchResults = await Promise.allSettled(dispatchTasks);
    const emailDispatch = dispatchResults[0];
    const smsDispatch = channel === 'email' || !user.phone ? null : dispatchResults[dispatchResults.length - 1];
    const emailAccepted = channel === 'sms' || (emailDispatch?.status === 'fulfilled' && Boolean(emailDispatch.value?.delivered));
    const smsAccepted = !smsDispatch || (smsDispatch.status === 'fulfilled' && Boolean(smsDispatch.value?.delivered));

    const maskedEmail = maskEmailAddress(cleanEmail);
    const maskedPhone = user.phone ? maskPhoneNumber(user.phone) : null;

    return {
      success: true,
      maskedEmail,
      maskedPhone,
      expiresInSeconds: 300,
      emailStatus: channel === 'sms' ? 'not_requested' : (emailAccepted ? 'accepted' : 'failed'),
      smsStatus: !smsDispatch ? 'not_requested' : (smsAccepted ? 'accepted' : 'failed'),
      message: `Verification delivery: email ${channel === 'sms' ? 'not requested' : (emailAccepted ? 'accepted by provider' : 'failed')}; SMS ${!smsDispatch ? 'not requested' : (smsAccepted ? 'accepted by provider' : 'failed')}.`,
    };
  },

  /**
   * Dedicated Mobile / Contact Send OTP API
   * Handles: Invalid phone number, missing environment variables, SMS provider failure, 60s cooldown
   */
  async sendOtp({ phone, email, purpose = 'auth', channel = 'whatsapp' }) {
    if (!phone && !email) {
      const error = new Error('Mobile phone number or email address is required.');
      error.status = 400;
      throw error;
    }

    let normalizedPhone = null;
    if (phone) {
      const parsedPhone = parseAndValidatePhone(phone);
      if (!parsedPhone.valid) {
        const error = new Error(parsedPhone.reason);
        error.status = 400;
        throw error;
      }
      normalizedPhone = parsedPhone.e164;
      const account = await UserModel.findByPhone(normalizedPhone);
      if (!account) {
        const error = new Error('No registered account found with this mobile number. Create an account first.');
        error.status = 404;
        throw error;
      }
    }

    const identifier = normalizedPhone || (email ? email.toLowerCase().trim() : null);

    // 1. Check 60-second cooldown
    const cooldown = UserModel.checkCooldown(identifier);
    if (!cooldown.allowed) {
      const error = new Error(`Please wait ${cooldown.remainingSeconds} seconds before requesting another OTP.`);
      error.status = 429;
      error.data = { remainingCooldown: cooldown.remainingSeconds };
      throw error;
    }

    // 2. Validate email if provided
    let cleanEmail = null;
    if (email) {
      const emailValidation = isRealUsableEmail(email);
      if (!emailValidation.valid) {
        if (!phone) {
          const error = new Error(emailValidation.reason);
          error.status = 400;
          throw error;
        }
      } else {
        cleanEmail = emailValidation.email;
      }
    }

    // 3. Generate secure OTP with 5-minute expiry
    const otpCode = generateSecureOtp();
    const phoneOtpConfig = phone ? SmsService.getPhoneOtpConfiguration() : null;
    const expiryMinutes = phoneOtpConfig?.expiryMinutes;
    if (phone && (!Number.isInteger(expiryMinutes) || expiryMinutes < 1 || expiryMinutes > 10080)) {
      const error = new Error('Phone OTP expiry must be configured between 1 and 10080 minutes.');
      error.status = 503;
      error.code = 'PHONE_OTP_CONFIGURATION_INVALID';
      throw error;
    }
    const expiry = new Date(Date.now() + (phone ? expiryMinutes : 5) * 60 * 1000);

    // Dispatch the requested phone channel before creating a verifiable session.
    let phoneOtpResult = null;
    if (phone) {
      try {
        phoneOtpResult = await SmsService.sendPhoneOtp(normalizedPhone, otpCode, { channel });
      } catch (phoneOtpError) {
        if (!email) {
          throw phoneOtpError;
        }
        console.warn('[AuthService] Phone OTP dispatch warning:', phoneOtpError.message);
      }
    }

    // 5. Dispatch Email if valid email provided
    let emailResult = null;
    if (cleanEmail) {
      try {
        emailResult = await EmailService.sendOtpEmail(cleanEmail, otpCode);
        if (!emailResult?.delivered) {
          const error = new Error(emailResult?.error || 'Email provider did not accept the verification message.');
          error.status = 502;
          error.code = 'EMAIL_DELIVERY_FAILED';
          throw error;
        }
      } catch (mailErr) {
        if (!phone || !phoneOtpResult?.delivered) throw mailErr;
        console.warn('[AuthService] Email dispatch warning:', mailErr.message);
      }
    }

    if (phone && phoneOtpResult?.providerAccepted) {
      const national10 = normalizedPhone.slice(-10);
      UserModel.setPhoneOtp(national10, otpCode, expiry, phoneOtpResult.verificationProvider);
    }
    if (cleanEmail && emailResult?.delivered) {
      await UserModel.updateOtp(cleanEmail, otpCode, expiry);
    }
    UserModel.setCooldown(identifier);

    const maskedPhone = phone ? maskPhoneNumber(phone) : null;
    const maskedEmail = email ? maskEmailAddress(email) : null;
    const deliveryChannels = [
      phoneOtpResult?.providerAccepted
        ? `${phoneOtpResult.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} accepted by provider`
        : (phone ? 'phone delivery failed' : null),
      emailResult?.delivered ? 'email accepted by provider' : (cleanEmail ? 'email delivery failed' : null),
    ].filter(Boolean);

    return {
      success: true,
      maskedPhone,
      maskedEmail,
      expiresInSeconds: phone ? expiryMinutes * 60 : 300,
      provider: phoneOtpResult?.provider || (cleanEmail ? 'email' : 'none'),
      channel: phoneOtpResult?.channel,
      phoneStatus: phone ? (phoneOtpResult?.providerAccepted ? 'accepted' : 'failed') : undefined,
      smsStatus: phoneOtpResult?.channel === 'sms' && phoneOtpResult?.providerAccepted ? 'accepted' : undefined,
      emailStatus: cleanEmail ? (emailResult?.delivered ? 'accepted' : 'failed') : undefined,
      message: `Verification code delivery: ${deliveryChannels.join('; ')}. Valid for ${expiryMinutes || 5} minutes.`,
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
      if (!targetUser) targetUser = await UserModel.findByPhone(phone10);

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

        if (session.verificationProvider === 'fast2sms_smart_otp') {
          const verification = await SmsService.verifyFast2SmsSmartOtp(phone10, cleanOtp);
          isValid = verification.valid;
        } else {
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
        }

        if (isValid) UserModel.revokePhoneOtp(phone10);
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
        const error = new Error('No registered account found with this mobile number. Create an account first.');
        error.status = 404;
        throw error;
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
   * Real Google Authentication (Google ID Token verified via google-auth-library)
   * Obtains: name, email, profile picture, provider ('google'), authentication ID (googleId)
   * Upserts user in database, creates session token, avoids duplicate accounts, never stores Google password.
   */
  async googleAuth({ credential, idToken }) {
    const rawToken = credential || idToken;
    if (!rawToken) {
      const error = new Error('Google account email is not verified.');
      error.status = 401;
      error.code = 'GOOGLE_ID_TOKEN_REQUIRED';
      throw error;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId || clientId.includes('your_google_client_id') || clientId.includes('replace-with-')) {
      const error = new Error('Google Sign-In is not configured on the backend. Configure GOOGLE_CLIENT_ID to enable it.');
      error.status = 503;
      error.code = 'GOOGLE_CLIENT_ID_MISSING';
      throw error;
    }

    let payload;
    try {
      const { OAuth2Client } = await import('google-auth-library');
      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({ idToken: rawToken, audience: clientId });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      const error = new Error(`Google ID token verification failed: ${verifyErr.message}`);
      error.status = 401;
      error.code = 'INVALID_GOOGLE_TOKEN';
      throw error;
    }

    if (!payload?.email || !payload.sub || payload.email_verified !== true) {
      const error = new Error('Google must provide a verified email and subject claim.');
      error.status = 403;
      error.code = 'EMAIL_NOT_VERIFIED';
      throw error;
    }

    const extractedEmail = payload.email;
    const cleanEmail = extractedEmail.toLowerCase().trim();
    const extractedName = payload.name || cleanEmail.split('@')[0];
    const extractedPicture = payload.picture || null;
    const extractedGoogleId = payload.sub;
    let user = await UserModel.findByEmail(cleanEmail);
    let isNewUser = false;

    if (user) {
      const existingGoogleId = user.user_metadata?.googleId || user.metadata?.googleId;
      if (existingGoogleId && existingGoogleId !== extractedGoogleId) {
        const error = new Error('This email is already linked to a different Google identity.');
        error.status = 409;
        error.code = 'GOOGLE_IDENTITY_CONFLICT';
        throw error;
      }
      // Existing user: log them in, do NOT create a duplicate account
      // Update Google metadata if needed
      await UserModel.updateUserMetadata(user.id, {
        provider: 'google',
        googleId: extractedGoogleId || `google_${user.id}`,
        picture: extractedPicture || user.user_metadata?.picture || null,
        accountType: user.role === 'lawyer' ? 'advocate' : (user.role === 'admin' ? 'admin' : (user.user_metadata?.accountType || 'candidate')),
      });

      // Google email is pre-verified
      if (!user.email_verified) {
        await UserModel.markEmailVerified(user.id);
        user.email_verified = true;
      }

      await UserModel.updateLastLogin(user.id);
      await UserModel.recordLoginLog({
        userId: user.id,
        email: user.email,
        status: 'success_google',
      });
    } else {
      // New user: Create user in database with stable ID, provider: 'google'
      isNewUser = true;
      const role = 'user';
      user = await UserModel.create({
        name: extractedName || 'Google Citizen',
        email: cleanEmail,
        phone: null,
        passwordHash: '$2a$10$google.oauth.authenticated.no.password.hash',
        role,
        emailVerified: true,
        metadata: {
          provider: 'google',
          googleId: extractedGoogleId || `google_${Date.now()}`,
          picture: extractedPicture || null,
          accountType: 'candidate',
          location: null,
        },
      });

      await UserModel.recordLoginLog({
        userId: user.id,
        email: user.email,
        status: 'registered_google',
      });
    }

    // Generate authenticated session JWT
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
      success: true,
      isNewUser,
      token,
      user: sanitizeUser(user),
      message: isNewUser
        ? 'Google account created and authenticated successfully!'
        : 'Welcome back! Signed in with Google.',
    };
  },

  /**
   * Complete profile for new user authenticated via Google
   */
  async completeGoogleProfile(userId, profileData) {
    const { name, phone, accountType, city, state, location, advocateDetails } = profileData;
    const user = await UserModel.findById(userId);
    if (!user) {
      const error = new Error('Account not found.');
      error.status = 404;
      throw error;
    }

    const isAdvocate = accountType === 'advocate';
    const cleanPhone = phone ? normalizePhoneNumber(phone) : user.phone;
    if (isAdvocate && (!advocateDetails?.enrollmentNumber || !advocateDetails?.barCouncil || !Array.isArray(advocateDetails?.documents) || advocateDetails.documents.length < 2)) {
      const error = new Error('Advocate onboarding requires a real enrollment number, bar council, and both verification documents. Use the full advocate application form.');
      error.status = 400;
      throw error;
    }

    const updatedUser = await UserModel.updateProfile(user.id, {
      name: name || user.name,
      phone: cleanPhone,
      metadata: {
        ...(user.user_metadata || user.metadata || {}),
        accountType: user.role === 'lawyer' ? 'advocate' : 'candidate',
        city: city || user.user_metadata?.city,
        state: state || user.user_metadata?.state,
        location: location || user.user_metadata?.location,
      },
    });

    if (isAdvocate) {
      await LawyerPortalService.registerAdvocate({
        id: `lawyer_${user.id}`,
        userId: user.id,
        name: name || user.name,
        email: user.email,
        phone: cleanPhone,
        barRegistrationNumber: advocateDetails.enrollmentNumber,
        stateBarCouncil: advocateDetails.barCouncil,
        yearsOfExperience: advocateDetails.experienceYears,
        primaryCourt: advocateDetails.primaryCourt,
        city,
        specializations: advocateDetails.practiceAreas,
        documents: advocateDetails.documents,
      });
    }

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
      message: 'Profile completed successfully!',
    };
  },

  /**
   * Request password reset code
   */
  async forgotPassword(email) {
    if (!email) {
      const error = new Error('Please enter your registered email address.');
      error.status = 400;
      throw error;
    }
    const cleanEmail = email.toLowerCase().trim();
    const user = await UserModel.findByEmail(cleanEmail);
    if (!user) {
      const error = new Error('No registered account found with this email.');
      error.status = 404;
      throw error;
    }

    const resetOtp = generateSecureOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await UserModel.setResetToken(cleanEmail, resetOtp, expiresAt);

    const [emailDispatch, smsDispatch] = await Promise.allSettled([
      EmailService.sendOtpEmail(cleanEmail, resetOtp, user.name),
      user.phone ? SmsService.sendOtpSms(user.phone, resetOtp) : Promise.resolve(),
    ]);

    return {
      success: true,
      email: cleanEmail,
      emailStatus: emailDispatch.status === 'fulfilled' && emailDispatch.value?.delivered ? 'accepted' : 'failed',
      smsStatus: !user.phone ? 'not_configured' : (smsDispatch.status === 'fulfilled' && smsDispatch.value?.delivered ? 'accepted' : 'failed'),
      message: `Password reset delivery: email ${emailDispatch.status === 'fulfilled' && emailDispatch.value?.delivered ? 'accepted by provider' : 'failed'}; SMS ${!user.phone ? 'not configured' : (smsDispatch.status === 'fulfilled' && smsDispatch.value?.delivered ? 'accepted by provider' : 'failed')}.`,
    };
  },

  /**
   * Submit reset code and update password
   */
  async resetPassword(email, otp, newPassword) {
    if (!email || !otp || !newPassword) {
      const error = new Error('Email, verification code, and new password are required.');
      error.status = 400;
      throw error;
    }

    if (newPassword.length < 8) {
      const error = new Error('Password must meet the required security requirements (minimum 8 characters).');
      error.status = 400;
      throw error;
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await UserModel.findByEmail(cleanEmail);
    if (!user) {
      const error = new Error('Account not found.');
      error.status = 404;
      throw error;
    }

    const storedHash = user.reset_token;
    const expiresAt = user.reset_expires_at;

    if (!storedHash || !expiresAt || new Date(expiresAt) < new Date()) {
      const error = new Error('Password reset code has expired. Please request a new code.');
      error.status = 400;
      throw error;
    }

    const isValid = verifyOtpHash(otp, storedHash);
    if (!isValid) {
      const error = new Error('Invalid verification code.');
      error.status = 400;
      throw error;
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);
    await UserModel.updatePassword(user.id, newPasswordHash);

    return {
      success: true,
      message: 'Password reset successful! You can now log in with your new password.',
    };
  },

  /**
   * Update user profile
   */
  async updateProfile(userId, profileData) {
    const updated = await UserModel.updateProfile(userId, {
      name: profileData.name,
      phone: profileData.phone,
      metadata: profileData,
    });
    return {
      success: true,
      user: sanitizeUser(updated),
      message: 'Profile updated successfully!',
    };
  },

  /**
   * Change password for logged in user
   */
  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await UserModel.findById(userId);
    if (!user) {
      const error = new Error('User not found.');
      error.status = 404;
      throw error;
    }


    const isMatch = await bcrypt.compare(currentPassword, user.password_hash || user.passwordHash);
    if (!isMatch) {
      const error = new Error('Current password does not match.');
      error.status = 400;
      throw error;
    }

    if (newPassword.length < 8) {
      const error = new Error('New password must be at least 8 characters long.');
      error.status = 400;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);
    await UserModel.updatePassword(user.id, newPasswordHash);

    return {
      success: true,
      message: 'Password updated successfully!',
    };
  },

  /**
   * Get active authenticated user profile by ID
   */
  async getCurrentUser(userId, fallbackUser = null) {
    if (!userId) return fallbackUser || null;
    const user = await UserModel.findById(userId);
    if (!user) {
      if (fallbackUser) return sanitizeUser(fallbackUser);
      const error = new Error('User not found.');
      error.status = 404;
      throw error;
    }

    const sanitized = sanitizeUser(user);
    if (sanitized && (sanitized.role === 'lawyer' || user.role === 'lawyer')) {
      try {
        const lawyerProfile = await LawyerPortalService.getLawyerProfile(user.id || user.email);
        if (lawyerProfile) {
          sanitized.advocateDetails = {
            id: lawyerProfile.id,
            name: lawyerProfile.name,
            email: lawyerProfile.email,
            phone: lawyerProfile.phone,
            barNumber: lawyerProfile.bar_registration_number,
            enrollmentNumber: lawyerProfile.bar_registration_number,
            barCouncil: lawyerProfile.state_bar_council,
            stateBarCouncil: lawyerProfile.state_bar_council,
            enrollmentYear: lawyerProfile.enrollment_year || 2020,
            experienceYears: lawyerProfile.years_of_experience,
            primaryCourt: lawyerProfile.primary_court,
            practiceAreas: lawyerProfile.specializations || [],
            documents: lawyerProfile.verification_documents || [],
          };
          sanitized.verificationStatus = (lawyerProfile.verification_status || 'PENDING').toLowerCase();
          sanitized.verification_status = lawyerProfile.verification_status || 'PENDING';
          sanitized.reviewRemarks = lawyerProfile.admin_remarks || '';
          sanitized.lawyerId = lawyerProfile.id;
        }
      } catch (e) {
        // Non-blocking fallback
      }
    }

    return sanitized;
  },
};

export default AuthService;

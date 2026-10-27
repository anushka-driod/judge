import crypto from 'node:crypto';
import db from '../config/db.js';
import { loadUsersFromDisk, saveUsersToDisk } from '../utils/fileStore.js';

// Fallback in-memory storage (backed by disk persistence for server restarts)
const memoryUsers = new Map();
try {
  const diskUsers = loadUsersFromDisk();
  for (const u of diskUsers) {
    if (u && u.email) {
      memoryUsers.set(u.email.toLowerCase().trim(), u);
    }
  }
} catch (e) {
  console.warn('[UserModel] Failed to load users from disk store:', e.message);
}

const memoryLoginLogs = [];
const phoneOtpSessions = new Map();
const otpRequestCooldowns = new Map();
const emailVerificationTokens = new Map(); // tokenHash -> { email, expiresAt }

const OTP_SALT = process.env.JWT_SECRET;
if (!OTP_SALT && process.env.NODE_ENV !== 'test') {
  throw new Error('JWT_SECRET must be configured before OTP verification can start.');
}

/**
 * Computes a secure SHA-256 cryptographic hash of the plain OTP code.
 * Never store or expose plain text OTPs.
 */
export function hashOtp(plainOtp) {
  if (!plainOtp) return null;
  return crypto.createHash('sha256').update(`${String(plainOtp).trim()}:${OTP_SALT}`).digest('hex');
}

/**
 * Constant-time comparison between entered OTP and stored hash
 */
export function verifyOtpHash(plainOtp, storedHash) {
  if (!plainOtp || !storedHash) return false;
  const computedHash = hashOtp(plainOtp);
  const bufA = Buffer.from(computedHash, 'hex');
  const bufB = Buffer.from(storedHash, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Helper to sanitize sensitive fields before returning to client/controllers
export function sanitizeUser(u) {
  if (!u) return null;
  const {
    password_hash,
    passwordHash,
    otp_code,
    otpCode,
    otp_expires_at,
    otpExpiresAt,
    otp_attempts,
    otpAttempts,
    reset_token,
    resetToken,
    reset_expires_at,
    resetExpiresAt,
    ...safe
  } = u;

  const metadata = safe.user_metadata || safe.metadata || {};

  return {
    id: safe.id,
    name: safe.name,
    email: safe.email,
    phone: safe.phone,
    role: safe.role || 'user',
    accountType: safe.role === 'lawyer' ? 'advocate' : (safe.role === 'admin' ? 'admin' : (metadata.accountType || 'candidate')),
    emailVerified: Boolean(safe.email_verified ?? safe.emailVerified),
    lastLoginAt: safe.last_login_at || safe.lastLoginAt || null,
    provider: metadata.provider || (safe.password_hash?.includes('google') ? 'google' : 'local'),
    picture: metadata.picture || metadata.avatar || null,
    metadata,
    createdAt: safe.created_at || safe.createdAt,
    updatedAt: safe.updated_at || safe.updatedAt,
  };
}

export const UserModel = {
  /**
   * Create a new registered user with hashed OTP
   */
  async create({ id, name, email, phone, passwordHash, role = 'user', emailVerified = false, otpCode, otpExpiresAt, metadata = {} }) {
    const userId = id || `usr_${crypto.randomBytes(8).toString('hex')}`;
    const now = new Date();
    const otpHash = otpCode ? hashOtp(otpCode) : null;

    const sql = `
      INSERT INTO users (
        id, name, email, phone, password_hash, role, email_verified, otp_code, otp_expires_at, user_metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `;
    const params = [
      userId,
      name,
      email.toLowerCase().trim(),
      phone || null,
      passwordHash,
      role,
      emailVerified,
      otpHash,
      otpExpiresAt || null,
      JSON.stringify(metadata),
      now,
      now,
    ];

    try {
      const result = await db.query(sql, params);
      if (result.rows && result.rows.length > 0) {
        return result.rows[0];
      }
    } catch (dbErr) {
      // If live DB has table constraints or is offline, fallback seamlessly to memory layer
    }

    // Memory store fallback
    const userRecord = {
      id: userId,
      name,
      email: email.toLowerCase().trim(),
      phone: phone || null,
      password_hash: passwordHash,
      role,
      email_verified: emailVerified,
      otp_code: otpHash,
      otp_expires_at: otpExpiresAt || null,
      otp_attempts: 0,
      user_metadata: metadata,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    memoryUsers.set(userRecord.email, userRecord);
    saveUsersToDisk(memoryUsers);
    return userRecord;
  },

  /**
   * Find user by email
   */
  async findByEmail(email) {
    if (!email) return null;
    const normalized = email.toLowerCase().trim();

    try {
      const sql = `SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1;`;
      const result = await db.query(sql, [normalized]);
      if (result.rows && result.rows.length > 0) {
        return result.rows[0];
      }
    } catch (e) {}

    return memoryUsers.get(normalized) || null;
  },

  /**
   * Find user by phone number
   */
  async findByPhone(phone) {
    if (!phone) return null;
    const cleanPhone = phone.trim();

    try {
      const sql = `SELECT * FROM users WHERE phone = $1 LIMIT 1;`;
      const result = await db.query(sql, [cleanPhone]);
      if (result.rows && result.rows.length > 0) {
        return result.rows[0];
      }
    } catch (e) {}

    for (const u of memoryUsers.values()) {
      if (u.phone === cleanPhone) return u;
    }
    return null;
  },

  /**
   * Find user by ID
   */
  async findById(id) {
    if (!id) return null;

    try {
      const sql = `SELECT * FROM users WHERE id = $1 LIMIT 1;`;
      const result = await db.query(sql, [id]);
      if (result.rows && result.rows.length > 0) {
        return result.rows[0];
      }
    } catch (e) {}

    for (const u of memoryUsers.values()) {
      if (u.id === id) return u;
    }
    return null;
  },

  /**
   * Mark email verified and clear OTP
   */
  async markEmailVerified(userId) {
    const now = new Date();
    try {
      const sql = `
        UPDATE users
        SET email_verified = TRUE, otp_code = NULL, otp_expires_at = NULL, updated_at = $2
        WHERE id = $1
        RETURNING *;
      `;
      const result = await db.query(sql, [userId, now]);
      if (result.rows && result.rows.length > 0) {
        return result.rows[0];
      }
    } catch (e) {}

    // Fallback update
    for (const u of memoryUsers.values()) {
      if (u.id === userId) {
        u.email_verified = true;
        u.otp_code = null;
        u.otp_expires_at = null;
        u.otp_attempts = 0;
        u.updated_at = now.toISOString();
        saveUsersToDisk(memoryUsers);
        return u;
      }
    }
    return null;
  },

  /**
   * Update OTP with secure SHA-256 hash and 5-minute expiry, resetting failed attempts
   */
  async updateOtp(email, plainOtp, expiresAt) {
    const normalized = email.toLowerCase().trim();
    const now = new Date();
    const otpHash = hashOtp(plainOtp);

    try {
      const sql = `
        UPDATE users
        SET otp_code = $1, otp_expires_at = $2, updated_at = $3
        WHERE LOWER(email) = $4
        RETURNING *;
      `;
      const result = await db.query(sql, [otpHash, expiresAt, now, normalized]);
      if (result.rows && result.rows.length > 0) {
        return result.rows[0];
      }
    } catch (e) {}

    const u = memoryUsers.get(normalized);
    if (u) {
      u.otp_code = otpHash;
      u.otp_expires_at = expiresAt;
      u.otp_attempts = 0;
      u.updated_at = now.toISOString();
      saveUsersToDisk(memoryUsers);
      return u;
    }
    return null;
  },

  /**
   * Increments the incorrect attempt counter for an OTP verification
   */
  async recordFailedOtpAttempt(email) {
    const normalized = email.toLowerCase().trim();
    const u = memoryUsers.get(normalized);
    if (u) {
      u.otp_attempts = (u.otp_attempts || 0) + 1;
      return u.otp_attempts;
    }
    return 1;
  },

  /**
   * Invalidate / revoke OTP on excessive failed attempts
   */
  async revokeOtp(email) {
    const normalized = email.toLowerCase().trim();
    try {
      const sql = `UPDATE users SET otp_code = NULL, otp_expires_at = NULL WHERE LOWER(email) = $1;`;
      await db.query(sql, [normalized]);
    } catch (e) {}

    const u = memoryUsers.get(normalized);
    if (u) {
      u.otp_code = null;
      u.otp_expires_at = null;
      u.otp_attempts = 0;
    }
  },

  /**
   * Set single-use email verification token (SHA-256 hashed)
   */
  setVerificationToken(email, plainToken, expiresAt) {
    if (!email || !plainToken) return;
    const tokenHash = hashOtp(plainToken);
    emailVerificationTokens.set(tokenHash, {
      email: email.toLowerCase().trim(),
      expiresAt: expiresAt || new Date(Date.now() + 5 * 60 * 1000),
    });
  },

  /**
   * Verify and consume single-use email verification token (single use: immediately deleted)
   */
  async verifyAndConsumeEmailToken(email, plainToken) {
    if (!email || !plainToken) return null;
    const cleanEmail = email.toLowerCase().trim();
    const tokenHash = hashOtp(plainToken);
    const session = emailVerificationTokens.get(tokenHash);

    if (!session || session.email !== cleanEmail) {
      return null;
    }

    if (new Date(session.expiresAt) < new Date()) {
      emailVerificationTokens.delete(tokenHash);
      const error = new Error('Email verification link has expired. Please request a new verification email.');
      error.status = 400;
      throw error;
    }

    // Single-use guarantee: consume immediately
    emailVerificationTokens.delete(tokenHash);

    const user = await this.findByEmail(cleanEmail);
    if (user) {
      await this.markEmailVerified(user.id);
      return await this.findById(user.id);
    }
    return null;
  },

  /**
   * Check resend / request cooldown (60 seconds)
   */
  checkCooldown(identifier) {
    const key = String(identifier).toLowerCase().trim();
    const lastTime = otpRequestCooldowns.get(key);
    if (lastTime) {
      const elapsed = Math.floor((Date.now() - lastTime) / 1000);
      if (elapsed < 60) {
        return { allowed: false, remainingSeconds: 60 - elapsed };
      }
    }
    return { allowed: true, remainingSeconds: 0 };
  },

  /**
   * Set cooldown timestamp
   */
  setCooldown(identifier) {
    const key = String(identifier).toLowerCase().trim();
    otpRequestCooldowns.set(key, Date.now());
  },

  /**
   * Store phone OTP session (strictly SHA-256 hashed, never plain text)
   */
  setPhoneOtp(phone10, plainOtp, expiresAt, verificationProvider = 'local') {
    const key = String(phone10).slice(-10);
    phoneOtpSessions.set(key, {
      phone: key,
      otpHash: hashOtp(plainOtp),
      expiresAt: expiresAt || new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
      verificationProvider,
    });
  },

  /**
   * Verify phone OTP using constant-time hash comparison and enforce single-use revocation
   */
  verifyPhoneOtp(phone10, plainOtp) {
    const key = String(phone10).slice(-10);
    const session = phoneOtpSessions.get(key);
    if (!session) {
      return { valid: false, reason: 'No active verification session found for this mobile number.' };
    }
    if (new Date(session.expiresAt) < new Date()) {
      phoneOtpSessions.delete(key);
      return { valid: false, reason: 'Verification code has expired. Please request a new OTP.' };
    }
    if ((session.attempts || 0) >= 3) {
      phoneOtpSessions.delete(key);
      return { valid: false, reason: 'Maximum verification attempts exceeded. Please request a new OTP.' };
    }
    const matches = verifyOtpHash(plainOtp, session.otpHash);
    if (!matches) {
      session.attempts = (session.attempts || 0) + 1;
      return { valid: false, reason: 'Invalid verification code.', remainingAttempts: 3 - session.attempts };
    }
    // Single-use: delete immediately on success
    phoneOtpSessions.delete(key);
    return { valid: true };
  },

  /**
   * Get phone OTP session
   */
  getPhoneOtp(phone10) {
    const key = String(phone10).slice(-10);
    return phoneOtpSessions.get(key) || null;
  },

  /**
   * Record failed phone OTP attempt
   */
  recordFailedPhoneAttempt(phone10) {
    const key = String(phone10).slice(-10);
    const session = phoneOtpSessions.get(key);
    if (session) {
      session.attempts = (session.attempts || 0) + 1;
      return session.attempts;
    }
    return 1;
  },

  /**
   * Revoke phone OTP session
   */
  revokePhoneOtp(phone10) {
    const key = String(phone10).slice(-10);
    phoneOtpSessions.delete(key);
  },

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(userId) {
    const now = new Date();
    try {
      const sql = `UPDATE users SET last_login_at = $1 WHERE id = $2;`;
      await db.query(sql, [now, userId]);
    } catch (e) {}

    for (const u of memoryUsers.values()) {
      if (u.id === userId) {
        u.last_login_at = now.toISOString();
        break;
      }
    }
  },

  /**
   * Record login audit log in AnuDB
   */
  async recordLoginLog({ userId, email, status, ipAddress, userAgent }) {
    const now = new Date();
    try {
      const sql = `
        INSERT INTO user_login_logs (user_id, email, status, ip_address, user_agent, login_at)
        VALUES ($1, $2, $3, $4, $5, $6);
      `;
      await db.query(sql, [
        userId || null,
        email.toLowerCase().trim(),
        status,
        ipAddress || null,
        userAgent || null,
        now,
      ]);
    } catch (e) {}

    memoryLoginLogs.push({
      id: memoryLoginLogs.length + 1,
      user_id: userId || null,
      userId: userId || null,
      email: email.toLowerCase().trim(),
      status,
      ip_address: ipAddress || null,
      ipAddress: ipAddress || null,
      user_agent: userAgent || null,
      userAgent: userAgent || null,
      login_at: now.toISOString(),
      loginAt: now.toISOString(),
    });
  },

  /**
   * Get recent login logs for audit
   */
  async getLoginLogs(email, limit = 10) {
    try {
      const sql = `
        SELECT * FROM user_login_logs
        WHERE LOWER(email) = $1
        ORDER BY login_at DESC
        LIMIT $2;
      `;
      const result = await db.query(sql, [email.toLowerCase().trim(), limit]);
      if (result.rows && result.rows.length > 0) {
        return result.rows;
      }
    } catch (e) {}

    return memoryLoginLogs
      .filter((l) => l.email === email.toLowerCase().trim())
      .slice(-limit)
      .reverse();
  },


  /**
   * Update user metadata (e.g. Google profile info, provider, location)
   */
  async updateUserMetadata(userId, newMetadata = {}) {
    const user = await this.findById(userId);
    if (!user) return null;

    const merged = {
      ...(user.user_metadata || user.metadata || {}),
      ...newMetadata,
    };
    const now = new Date();

    try {
      const sql = `UPDATE users SET user_metadata = $1, updated_at = $2 WHERE id = $3 RETURNING *;`;
      const result = await db.query(sql, [JSON.stringify(merged), now, userId]);
      if (result.rows && result.rows.length > 0) {
        return result.rows[0];
      }
    } catch (e) {}

    user.user_metadata = merged;
    user.updated_at = now.toISOString();
    saveUsersToDisk(memoryUsers);
    return user;
  },

  /**
   * Update general profile fields (name, phone, metadata)
   */
  async updateProfile(userId, { name, phone, metadata = {} }) {
    const user = await this.findById(userId);
    if (!user) return null;

    const updatedName = name || user.name;
    const updatedPhone = phone !== undefined ? phone : user.phone;
    const updatedMeta = {
      ...(user.user_metadata || user.metadata || {}),
      ...metadata,
    };
    const now = new Date();

    try {
      const sql = `
        UPDATE users
        SET name = $1, phone = $2, user_metadata = $3, updated_at = $4
        WHERE id = $5
        RETURNING *;
      `;
      const result = await db.query(sql, [updatedName, updatedPhone, JSON.stringify(updatedMeta), now, userId]);
      if (result.rows && result.rows.length > 0) {
        return result.rows[0];
      }
    } catch (e) {}

    user.name = updatedName;
    user.phone = updatedPhone;
    user.user_metadata = updatedMeta;
    user.updated_at = now.toISOString();
    saveUsersToDisk(memoryUsers);
    return user;
  },

  /**
   * Update password hash
   */
  async updatePassword(userId, passwordHash) {
    const now = new Date();
    try {
      const sql = `UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3 RETURNING *;`;
      const result = await db.query(sql, [passwordHash, now, userId]);
      if (result.rows && result.rows.length > 0) {
        return result.rows[0];
      }
    } catch (e) {}

    const user = await this.findById(userId);
    if (user) {
      user.password_hash = passwordHash;
      user.updated_at = now.toISOString();
      saveUsersToDisk(memoryUsers);
      return user;
    }
    return null;
  },

  /**
   * Set password reset token/OTP
   */
  async setResetToken(email, plainToken, expiresAt) {
    const normalized = email.toLowerCase().trim();
    const tokenHash = hashOtp(plainToken);
    const now = new Date();

    try {
      const sql = `
        UPDATE users
        SET reset_token = $1, reset_expires_at = $2, updated_at = $3
        WHERE LOWER(email) = $4
        RETURNING *;
      `;
      const result = await db.query(sql, [tokenHash, expiresAt, now, normalized]);
      if (result.rows && result.rows.length > 0) {
        return result.rows[0];
      }
    } catch (e) {}

    const user = await this.findByEmail(normalized);
    if (user) {
      user.reset_token = tokenHash;
      user.reset_expires_at = expiresAt;
      user.updated_at = now.toISOString();
      saveUsersToDisk(memoryUsers);
      return user;
    }
    return null;
  },

};

export default UserModel;

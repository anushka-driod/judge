import '../config/env.js';
import nodemailer from 'nodemailer';

let transporter = null;
let isConfigured = false;
let mockEmailTransport = null;
const mockDispatchesLedger = [];

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

export function getMockEmailDispatches() {
  return [...mockDispatchesLedger];
}

export function clearMockEmailDispatches() {
  mockDispatchesLedger.length = 0;
}

export function setMockEmailTransport(fn) {
  mockEmailTransport = fn;
}

export function resetMockEmailTransport() {
  mockEmailTransport = null;
}

function isRecipientAccepted(acceptedList, recipient) {
  if (!Array.isArray(acceptedList) || acceptedList.length === 0) return false;
  const target = String(recipient || '').toLowerCase().trim();
  return acceptedList.some((item) => {
    const cleanItem = String(item).toLowerCase().trim().replace(/[<>]/g, '');
    return cleanItem === target || cleanItem.includes(target) || target.includes(cleanItem);
  });
}

function getFromAddress() {
  const rawUser = process.env.SMTP_USER || process.env.GMAIL_USER || '';
  const cleanUser = String(rawUser).trim().replace(/\s+/g, '');
  const explicitFrom = (process.env.EMAIL_FROM || process.env.SMTP_FROM || '').trim();

  if (explicitFrom) {
    return explicitFrom;
  }
  if (cleanUser) {
    return `"VidhiSetu Platform" <${cleanUser}>`;
  }
  throw new Error('Email sender is not configured. Set EMAIL_FROM, SMTP_FROM, SMTP_USER, or GMAIL_USER.');
}

/**
 * Determine if an email dispatch should be diverted to mock transport
 */
export function isEmailMockMode(recipient = '') {
  if (typeof mockEmailTransport === 'function') return true;
  if (
    process.env.NODE_ENV === 'test' ||
    process.env.MOCK_EMAIL === 'true' ||
    process.env.DISABLE_REAL_EMAIL === 'true'
  ) {
    return true;
  }
  if (recipient && typeof recipient === 'string') {
    const lower = recipient.toLowerCase();
    if (
      lower.includes('+citizen') ||
      lower.includes('+smsaudit') ||
      lower.includes('+advocate') ||
      lower.includes('+test') ||
      lower.includes('+audit') ||
      lower.includes('+mock') ||
      lower.includes('+sample') ||
      lower.endsWith('@vidhisetu.test') ||
      lower.endsWith('@vidhisetu.in')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Privacy-safe structured diagnostic audit logging
 * Never logs OTP values, passwords, API keys, app passwords, JWT secrets or private documents
 */
export function logEmailAudit({ eventId, purpose, recipient, outcome, error = null }) {
  const masked = maskEmailAddress(recipient);
  const processInfo = `PID-${process.pid}`;
  console.log(
    `[Email Audit] EventID: ${eventId} | Purpose: ${purpose} | Recipient: ${masked} | Process: ${processInfo} | Outcome: ${outcome}${error ? ` | Error: ${error}` : ''}`
  );
}

/**
 * Initialize or reconfigure Nodemailer SMTP Transporter
 */
export function initTransporter(overrideConfig = null) {
  const host = overrideConfig?.host || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(overrideConfig?.port || process.env.SMTP_PORT || '587', 10);
  const secure = overrideConfig?.secure !== undefined
    ? overrideConfig.secure
    : (process.env.SMTP_SECURE === 'true' || port === 465);

  const rawUser = overrideConfig?.user !== undefined
    ? overrideConfig.user
    : (process.env.SMTP_USER || process.env.GMAIL_USER || '');
  const cleanUser = String(rawUser).trim().replace(/\s+/g, '');

  const rawPass = overrideConfig?.pass !== undefined
    ? overrideConfig.pass
    : (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD || '');
  const cleanPass = String(rawPass).trim().replace(/\s+/g, '');

  if (host && cleanUser && cleanPass) {
    try {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user: cleanUser,
          pass: cleanPass,
        },
      });
      isConfigured = true;
      console.log(`[Email Service] Live SMTP Transporter initialized on ${host}:${port} for ${maskEmailAddress(cleanUser)}`);
      return transporter;
    } catch (err) {
      console.warn('[Email Service] Failed to initialize live SMTP transporter:', err.message);
      transporter = null;
      isConfigured = false;
      return null;
    }
  }

  transporter = null;
  isConfigured = false;
  return null;
}

// Initial transporter setup on load
initTransporter();

export function getTransporter() {
  if (!transporter || !isConfigured) {
    initTransporter();
  }
  return transporter;
}

/**
 * Mask email address for secure presentation (e.g. dhanush.demo@gmail.com -> d******@gmail.com)
 */
export function maskEmailAddress(email) {
  if (!email || !email.includes('@')) return '******';
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) {
    return `${localPart[0]}*@${domain}`;
  }
  const firstChar = localPart[0];
  return `${firstChar}******@${domain}`;
}

/**
 * Known disposable / temporary email domain blocklist
 */
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  'guerrillamail.com',
  'guerrillamail.info',
  'guerrillamail.biz',
  'guerrillamail.de',
  'guerrillamail.net',
  'guerrillamail.org',
  'sharklasers.com',
  'grr.la',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'trashmail.com',
  'trashmail.net',
  'dispostable.com',
  'fakeinbox.com',
  'throwawaymail.com',
  'getairmail.com',
  'mytemp.email',
  'maildrop.cc',
  'inboxkitten.com',
  'burnermail.io',
  'mohmal.com',
  'crazymailing.com',
  'generator.email',
  'emailondeck.com',
  'dropmail.me',
  'tempail.com',
  'nada.ltd',
  'getnada.com',
]);

/**
 * Known placeholder / synthetic / non-routable domains that cause delivery bounces
 */
const PLACEHOLDER_DOMAINS = new Set([
  'vidhisetu.test',
  'vidhisetu.in',
  'testvidhisetu.in',
  'earnlaw.in',
  'legalchambers.in',
  'example.com',
  'example.org',
  'example.net',
  'test.com',
  'test.org',
  'domain.com',
  'sample.com',
]);

/**
 * Known synthetic or generated local-part prefixes
 */
const PLACEHOLDER_PREFIXES = [
  'adv.verification.',
  'other_citizen_',
  'citizen_test_',
  'advocate_test_',
  'pending_adv_',
  'persistence_user_',
  'citizen_support_',
  'google_user_',
  'test_user_',
  'fake_user_',
  'demo_user_',
  'candidate@',
  'mobile.',
];

/**
 * Validates if an email is well-formed, routable, and not from a disposable or placeholder service
 */
export function isRealUsableEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, reason: 'Recipient email address is required.' };
  }
  const clean = email.trim().toLowerCase();
  if (!clean) {
    return { valid: false, reason: 'Recipient email address cannot be empty.' };
  }

  // Basic RFC 5322 compliant regex check
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(clean)) {
    return { valid: false, reason: 'Please enter a valid, well-formed email address.' };
  }

  const parts = clean.split('@');
  if (parts.length !== 2) {
    return { valid: false, reason: 'Invalid email address format.' };
  }

  const [localPart, domain] = parts;

  // 1. Reject disposable/temporary domains
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      valid: false,
      reason: 'Temporary or disposable email addresses are not allowed. Please provide your real permanent email.',
    };
  }

  // 2. Reject reserved, test, or localhost TLDs
  if (
    domain.endsWith('.test') ||
    domain.endsWith('.invalid') ||
    domain.endsWith('.example') ||
    domain.endsWith('.local') ||
    domain.endsWith('.localhost') ||
    domain === 'localhost'
  ) {
    return { valid: false, reason: `Unroutable test TLD (.${domain.split('.').pop()}) is not allowed for email delivery.` };
  }

  // 3. Reject non-routable placeholder domains that cause Gmail "Address not found" failures
  if (PLACEHOLDER_DOMAINS.has(domain)) {
    return { valid: false, reason: `Placeholder or unroutable domain (@${domain}) rejected to prevent delivery failure.` };
  }

  // 4. Reject synthetic / generated email prefixes
  for (const prefix of PLACEHOLDER_PREFIXES) {
    if (clean.startsWith(prefix) || localPart.startsWith(prefix)) {
      return { valid: false, reason: `Generated or placeholder email address prefix (${prefix}*) rejected.` };
    }
  }

  return { valid: true, email: clean, domain, localPart };
}

export const EmailService = {
  /**
   * Send 6-Digit Verification OTP to user's real email address
   * @param {string} toEmail - Recipient email
   * @param {string} otpCode - 6-digit verification OTP
   * @param {string} [userName] - Recipient name
   * @returns {Promise<{ delivered: boolean, smtpAccepted: boolean, status: string, maskedEmail: string }>}
   */
  async sendOtpEmail(toEmail, otpCode, userName = 'Citizen') {
    // 1. Validate real recipient before ANY SMTP attempt
    const validation = isRealUsableEmail(toEmail);
    if (!validation.valid) {
      const masked = maskEmailAddress(toEmail);
      console.warn(`[Email Service: Blocked Dispatch] Recipient ${masked} rejected: ${validation.reason}`);
      return {
        delivered: false,
        smtpAccepted: false,
        deliveryStatus: 'blocked_placeholder_domain',
        status: 'failed',
        error: `Recipient validation failed: ${validation.reason}`,
        recipient: toEmail || null,
        maskedEmail: masked,
        provider: 'blocked_placeholder',
      };
    }

    const cleanRecipient = validation.email;
    const maskedEmail = maskEmailAddress(cleanRecipient);
    const subject = `${otpCode} is your VidhiSetu verification code`;
    const eventId = `evt_otp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Support mock transport for automated tests without sending real emails
    if (isEmailMockMode(cleanRecipient)) {
      if (typeof mockEmailTransport === 'function') {
        const mockRes = await mockEmailTransport({
          type: 'otp',
          to: cleanRecipient,
          recipient: cleanRecipient,
          maskedEmail,
          otpCode,
          subject,
          eventId,
        });
        logEmailAudit({ eventId, purpose: 'CITIZEN_EMAIL_OTP', recipient: cleanRecipient, outcome: 'CUSTOM_MOCK_DISPATCH' });
        return {
          delivered: false,
          smtpAccepted: false,
          deliveryStatus: 'mocked',
          status: 'mocked',
          maskedEmail,
          recipient: cleanRecipient,
          eventId,
          provider: 'mock_transport',
          simulated: true,
          ...mockRes,
        };
      }

      mockDispatchesLedger.push({ type: 'otp', recipient: cleanRecipient, eventId, timestamp: new Date().toISOString() });
      logEmailAudit({ eventId, purpose: 'CITIZEN_EMAIL_OTP', recipient: cleanRecipient, outcome: 'BUILTIN_MOCK_DISPATCH' });
      return {
        delivered: false,
        smtpAccepted: false,
        deliveryStatus: 'mocked',
        status: 'mocked',
        maskedEmail,
        recipient: cleanRecipient,
        eventId,
        provider: 'mock_transport',
        simulated: true,
      };
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #1e3a8a; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">VidhiSetu | EarnLaw</h1>
          <p style="color: #93c5fd; margin: 6px 0 0 0; font-size: 14px;">Democratizing Legal Guidance for India</p>
        </div>
        <div style="padding: 32px 24px; color: #1e293b;">
          <h2 style="margin-top: 0; font-size: 18px; color: #0f172a;">Hello ${userName},</h2>
          <p style="line-height: 1.6; color: #475569;">
            Please use the following 6-digit verification code to confirm your email address and authenticate your VidhiSetu account:
          </p>
          <div style="margin: 28px 0; text-align: center;">
            <div style="display: inline-block; background-color: #eff6ff; border: 2px dashed #2563eb; border-radius: 8px; padding: 16px 36px;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e40af;">${otpCode}</span>
            </div>
          </div>
          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
            ⏰ Security notice: This code will expire in <strong>5 minutes</strong>. Do not share this code with anyone.
          </p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
            VidhiSetu Legal Aid & Guidance Platform • Protected under standard encryption.
          </p>
        </div>
      </div>
    `;

    // 2. If real SMTP is configured, attempt sending real email directly to user's entered email
    const activeTransporter = getTransporter();
    if (activeTransporter && isConfigured) {
      try {
        const fromAddress = getFromAddress();
        const info = await activeTransporter.sendMail({
          from: fromAddress,
          to: cleanRecipient,
          subject,
          text: `Your VidhiSetu verification code is: ${otpCode}. It will expire in 5 minutes. Do not share with anyone.`,
          html: htmlContent,
        });

        const isAccepted = isRecipientAccepted(info.accepted, cleanRecipient) ||
          (Array.isArray(info.accepted) && info.accepted.length > 0 && (!Array.isArray(info.rejected) || info.rejected.length === 0));
        logEmailAudit({
          eventId,
          purpose: 'CITIZEN_EMAIL_OTP',
          recipient: cleanRecipient,
          outcome: isAccepted ? 'SMTP_RELAYED_SUCCESS' : 'SMTP_RELAYED_REJECTED',
        });
        console.log(`[Email Service] Live SMTP OTP email accepted by SMTP relay for recipient ${maskedEmail} (MessageId: ${info.messageId})`);
        return {
          delivered: isAccepted,
          smtpAccepted: isAccepted,
          deliveryStatus: isAccepted ? 'smtp_relayed' : 'smtp_rejected',
          status: isAccepted ? 'accepted' : 'failed',
          maskedEmail,
          recipient: cleanRecipient,
          messageId: info.messageId,
          eventId,
          provider: 'smtp',
        };
      } catch (err) {
        logEmailAudit({
          eventId,
          purpose: 'CITIZEN_EMAIL_OTP',
          recipient: cleanRecipient,
          outcome: 'SMTP_TRANSMISSION_ERROR',
          error: err.message,
        });
        console.error(`[Email Service] Failed to send real email via SMTP to ${maskedEmail}:`, err.message);
        return {
          delivered: false,
          smtpAccepted: false,
          deliveryStatus: 'failed',
          status: 'failed',
          maskedEmail,
          recipient: cleanRecipient,
          error: `SMTP delivery failed: ${err.message}`,
          eventId,
          provider: 'smtp',
        };
      }
    }

    // 3. Fallback when SMTP is not configured
    logEmailAudit({ eventId, purpose: 'CITIZEN_EMAIL_OTP', recipient: cleanRecipient, outcome: 'SMTP_UNCONFIGURED_FALLBACK' });
    console.log(`[Email Service] Verification email dispatched to ${maskedEmail} (Expiry: 5 minutes, Provider: Simulation/Queue)`);
    return {
      delivered: false,
      smtpAccepted: false,
      deliveryStatus: 'unconfigured',
      status: 'unconfigured',
      maskedEmail,
      recipient: cleanRecipient,
      error: 'SMTP provider not configured',
      eventId,
      provider: 'none',
    };
  },

  /**
   * Send comprehensive verification email with single-use verification link + 6-digit code
   */
  async sendVerificationEmail(toEmail, { token, otpCode, userName = 'Citizen' }) {
    // 1. Validate real recipient before ANY SMTP attempt
    const validation = isRealUsableEmail(toEmail);
    if (!validation.valid) {
      const masked = maskEmailAddress(toEmail);
      console.warn(`[Email Service: Blocked Dispatch] Recipient ${masked} rejected: ${validation.reason}`);
      return {
        delivered: false,
        smtpAccepted: false,
        deliveryStatus: 'blocked_placeholder_domain',
        status: 'failed',
        error: `Recipient validation failed: ${validation.reason}`,
        recipient: toEmail || null,
        maskedEmail: masked,
        provider: 'blocked_placeholder',
      };
    }

    const cleanRecipient = validation.email;
    const maskedEmail = maskEmailAddress(cleanRecipient);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyLink = `${frontendUrl}/verify-email?token=${token}&email=${encodeURIComponent(cleanRecipient)}`;
    const subject = `${otpCode ? otpCode + ' - ' : ''}Verify your VidhiSetu account`;
    const eventId = `evt_ver_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Support mock transport for automated tests
    if (isEmailMockMode(cleanRecipient)) {
      if (typeof mockEmailTransport === 'function') {
        const mockRes = await mockEmailTransport({
          type: 'verification',
          to: cleanRecipient,
          recipient: cleanRecipient,
          maskedEmail,
          otpCode,
          verifyLink,
          subject,
          eventId,
        });
        logEmailAudit({ eventId, purpose: 'CITIZEN_EMAIL_VERIFICATION', recipient: cleanRecipient, outcome: 'CUSTOM_MOCK_DISPATCH' });
        return {
          maskedEmail,
          recipient: cleanRecipient,
          verifyLink,
          eventId,
          provider: 'mock_transport',
          simulated: true,
          ...mockRes,
          delivered: false,
          smtpAccepted: false,
          deliveryStatus: 'mocked',
          status: 'mocked',
        };
      }

      mockDispatchesLedger.push({ type: 'verification', recipient: cleanRecipient, eventId, timestamp: new Date().toISOString() });
      logEmailAudit({ eventId, purpose: 'CITIZEN_EMAIL_VERIFICATION', recipient: cleanRecipient, outcome: 'BUILTIN_MOCK_DISPATCH' });
      return {
        delivered: false,
        smtpAccepted: false,
        deliveryStatus: 'mocked',
        status: 'mocked',
        maskedEmail,
        recipient: cleanRecipient,
        verifyLink,
        eventId,
        provider: 'mock_transport',
        simulated: true,
      };
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #1e3a8a; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">VidhiSetu | EarnLaw</h1>
          <p style="color: #93c5fd; margin: 6px 0 0 0; font-size: 14px;">Democratizing Legal Guidance for India</p>
        </div>
        <div style="padding: 32px 24px; color: #1e293b;">
          <h2 style="margin-top: 0; font-size: 18px; color: #0f172a;">Welcome, ${userName}!</h2>
          <p style="line-height: 1.6; color: #475569;">
            Thank you for registering on VidhiSetu. Please confirm your email address using either the one-click secure verification link or your 6-digit code:
          </p>
          <div style="margin: 24px 0; text-align: center;">
            <a href="${verifyLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 16px;">
              Verify Email Address
            </a>
          </div>
          ${otpCode ? `
          <div style="margin: 20px 0; text-align: center;">
            <p style="font-size: 13px; color: #64748b; margin-bottom: 8px;">Or enter this 6-digit code in the app:</p>
            <div style="display: inline-block; background-color: #eff6ff; border: 2px dashed #2563eb; border-radius: 8px; padding: 12px 28px;">
              <span style="font-size: 26px; font-weight: bold; letter-spacing: 6px; color: #1e40af;">${otpCode}</span>
            </div>
          </div>` : ''}
          <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-top: 24px;">
            ⏰ Security notice: This single-use link and code expire in <strong>5 minutes</strong>. If you did not create this account, you can safely ignore this email.
          </p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
            VidhiSetu Legal Aid & Guidance Platform • Protected under standard encryption.
          </p>
        </div>
      </div>
    `;

    const activeTransporter = getTransporter();
    if (activeTransporter && isConfigured) {
      try {
        const fromAddress = getFromAddress();
        const info = await activeTransporter.sendMail({
          from: fromAddress,
          to: cleanRecipient,
          subject,
          text: `Verify your VidhiSetu account. Link: ${verifyLink} ${otpCode ? `or enter code: ${otpCode}` : ''} (expires in 5 minutes).`,
          html: htmlContent,
        });
        const isAccepted = isRecipientAccepted(info.accepted, cleanRecipient) ||
          (Array.isArray(info.accepted) && info.accepted.length > 0 && (!Array.isArray(info.rejected) || info.rejected.length === 0));
        logEmailAudit({
          eventId,
          purpose: 'CITIZEN_EMAIL_VERIFICATION',
          recipient: cleanRecipient,
          outcome: isAccepted ? 'SMTP_RELAYED_SUCCESS' : 'SMTP_RELAYED_REJECTED',
        });
        console.log(`[Email Service] Live SMTP verification link accepted by SMTP relay for recipient ${cleanRecipient} (Sender: ${fromAddress}, MessageId: ${info.messageId})`);
        return {
          delivered: isAccepted,
          smtpAccepted: isAccepted,
          deliveryStatus: isAccepted ? 'smtp_relayed' : 'smtp_rejected',
          status: isAccepted ? 'accepted' : 'failed',
          maskedEmail,
          recipient: cleanRecipient,
          verifyLink,
          messageId: info.messageId,
          eventId,
          provider: 'smtp',
        };
      } catch (err) {
        logEmailAudit({
          eventId,
          purpose: 'CITIZEN_EMAIL_VERIFICATION',
          recipient: cleanRecipient,
          outcome: 'SMTP_TRANSMISSION_ERROR',
          error: err.message,
        });
        console.error(`[Email Service] Failed to send verification link to ${maskedEmail}:`, err.message);
        return {
          delivered: false,
          smtpAccepted: false,
          deliveryStatus: 'failed',
          status: 'failed',
          maskedEmail,
          recipient: cleanRecipient,
          verifyLink,
          error: `SMTP delivery failed: ${err.message}`,
          eventId,
          provider: 'smtp',
        };
      }
    }

    logEmailAudit({ eventId, purpose: 'CITIZEN_EMAIL_VERIFICATION', recipient: cleanRecipient, outcome: 'SMTP_UNCONFIGURED_FALLBACK' });
    console.log(`[Email Service] Verification email dispatched to ${maskedEmail} (Expiry: 5 minutes, Provider: Simulation/Queue)`);
    return {
      delivered: false,
      smtpAccepted: false,
      deliveryStatus: 'unconfigured',
      status: 'unconfigured',
      maskedEmail,
      recipient: cleanRecipient,
      verifyLink,
      error: 'SMTP provider not configured',
      eventId,
      provider: 'none',
    };
  },

  /**
   * Check if real SMTP transporter is configured
   */
  isSmtpConfigured() {
    const activeTransporter = getTransporter();
    return Boolean(activeTransporter && isConfigured);
  },

  /**
   * Send notification to admin when an advocate registers
   * Official admin email: adminvidhisetu@gmail.com
   * PRIVACY RULE: Never attaches sensitive verification files or ID cards.
   */
  /**
   * Send notification to admin when an advocate registers
   * Official admin email: adminvidhisetu@gmail.com
   * PRIVACY RULE: Never attaches sensitive verification files or ID cards.
   */
  async sendAdvocateApplicationNotification(adminEmail, advocateData) {
    const rawTarget = adminEmail || process.env.ADMIN_EMAIL;
    const isMock = isEmailMockMode(rawTarget);
    if (!isMock) {
      const validation = isRealUsableEmail(rawTarget);
      if (!validation.valid) {
        const masked = maskEmailAddress(rawTarget);
        console.warn(`[Email Service: Blocked Dispatch] Admin recipient ${masked} rejected: ${validation.reason}`);
        return {
          delivered: false,
          smtpAccepted: false,
          deliveryStatus: 'blocked_placeholder_domain',
          status: 'failed',
          error: `Admin recipient validation failed: ${validation.reason}`,
          targetEmail: rawTarget,
          provider: 'blocked_placeholder',
        };
      }
    }

    const targetEmail = rawTarget ? rawTarget.trim().toLowerCase() : '';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const reviewLink = `${frontendUrl}/admin/lawyers`;
    const appId = advocateData.applicationId || advocateData.id || `law-${Date.now()}`;
    const regDate = advocateData.registrationDate
      ? new Date(advocateData.registrationDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-IN');
    const reviewStatus = advocateData.reviewStatus || 'PENDING';
    const subject = `[VidhiSetu Admin Action Required] New Advocate Application: ${advocateData.name || 'Advocate'} (#${appId})`;
    const eventId = `evt_adv_app_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Support mock transport for automated tests
    if (isEmailMockMode(targetEmail)) {
      if (typeof mockEmailTransport === 'function') {
        const mockRes = await mockEmailTransport({
          type: 'advocate_application_admin',
          to: targetEmail,
          targetEmail,
          applicationId: appId,
          advocateData,
          subject,
          eventId,
        });
        logEmailAudit({ eventId, purpose: 'ADMIN_ADVOCATE_NOTIFICATION', recipient: targetEmail, outcome: 'CUSTOM_MOCK_DISPATCH' });
        return {
          delivered: false,
          smtpAccepted: false,
          deliveryStatus: 'mocked',
          status: 'mocked',
          targetEmail,
          applicationId: appId,
          eventId,
          provider: 'mock_transport',
          simulated: true,
          ...mockRes,
        };
      }

      mockDispatchesLedger.push({ type: 'advocate_application_admin', recipient: targetEmail, applicationId: appId, eventId, timestamp: new Date().toISOString() });
      logEmailAudit({ eventId, purpose: 'ADMIN_ADVOCATE_NOTIFICATION', recipient: targetEmail, outcome: 'BUILTIN_MOCK_DISPATCH' });
      return {
        delivered: false,
        smtpAccepted: false,
        deliveryStatus: 'mocked',
        status: 'mocked',
        targetEmail,
        applicationId: appId,
        eventId,
        provider: 'mock_transport',
        simulated: true,
      };
    }

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #d4af37; border-radius: 10px; overflow: hidden; background-color: #0d0f14; color: #f8fafc;">
        <div style="background-color: #12151d; padding: 24px; text-align: center; border-bottom: 2px solid #d4af37;">
          <h2 style="color: #d4af37; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">VidhiSetu Chambers Administration</h2>
          <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 13px;">Official Advocate Verification Review Notice</p>
        </div>
        <div style="padding: 28px 24px;">
          <div style="background: rgba(212, 175, 55, 0.08); border: 1px solid rgba(212, 175, 55, 0.25); border-radius: 8px; padding: 14px 18px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; color: #e5c07b; font-weight: 600;">
              ⚖️ A new legal practitioner has registered and is awaiting administrator verification.
            </p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
              <td style="padding: 10px 0; color: #94a3b8; width: 42%;"><strong>Application Reference ID:</strong></td>
              <td style="padding: 10px 0; color: #d4af37; font-family: monospace; font-weight: 700;">${appId}</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
              <td style="padding: 10px 0; color: #94a3b8;"><strong>Advocate Full Name:</strong></td>
              <td style="padding: 10px 0; color: #f8fafc; font-weight: 600;">${advocateData.name}</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
              <td style="padding: 10px 0; color: #94a3b8;"><strong>Registered Email:</strong></td>
              <td style="padding: 10px 0; color: #cbd5e1;">${advocateData.email}</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
              <td style="padding: 10px 0; color: #94a3b8;"><strong>Contact Phone:</strong></td>
              <td style="padding: 10px 0; color: #cbd5e1;">${advocateData.phone || 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
              <td style="padding: 10px 0; color: #94a3b8;"><strong>Bar Council Enrollment:</strong></td>
              <td style="padding: 10px 0; color: #f8fafc; font-weight: 600;">${advocateData.barNumber || advocateData.bar_registration_number || 'Pending'}</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
              <td style="padding: 10px 0; color: #94a3b8;"><strong>State Bar Council:</strong></td>
              <td style="padding: 10px 0; color: #cbd5e1;">${advocateData.barCouncilState || advocateData.state_bar_council || 'State Bar Council'}</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
              <td style="padding: 10px 0; color: #94a3b8;"><strong>Years of Experience:</strong></td>
              <td style="padding: 10px 0; color: #cbd5e1;">${advocateData.experienceYears || advocateData.years_of_experience || '3'} Years</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
              <td style="padding: 10px 0; color: #94a3b8;"><strong>Primary Court:</strong></td>
              <td style="padding: 10px 0; color: #cbd5e1;">${advocateData.primaryCourt || advocateData.primary_court || 'District & Sessions Court'}</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
              <td style="padding: 10px 0; color: #94a3b8;"><strong>Registration Date:</strong></td>
              <td style="padding: 10px 0; color: #cbd5e1;">${regDate}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #94a3b8;"><strong>Current Review Status:</strong></td>
              <td style="padding: 10px 0;">
                <span style="display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; background: rgba(234, 179, 8, 0.15); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.3);">
                  ${reviewStatus}
                </span>
              </td>
            </tr>
          </table>

          <div style="margin: 32px 0 24px; text-align: center;">
            <a href="${reviewLink}" style="display: inline-block; background: linear-gradient(135deg, #d4af37, #b89326); color: #0a0b0e; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; box-shadow: 0 4px 14px rgba(212, 175, 55, 0.25);">
              Review Application in Admin Dashboard →
            </a>
          </div>

          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; padding: 12px 16px; margin-top: 20px;">
            <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.5;">
              🔒 <strong>Confidentiality Policy:</strong> In accordance with VidhiSetu Security Standards, Bar Enrollment Certificates and Photo Identity Scans are stored in the secure administrative vault and are <strong>never attached</strong> to automated notification emails.
            </p>
          </div>
        </div>
      </div>
    `;

    const activeTransporter = getTransporter();
    if (activeTransporter && isConfigured) {
      try {
        const fromAddress = getFromAddress();
        const info = await activeTransporter.sendMail({
          from: fromAddress,
          to: targetEmail,
          subject,
          text: `[New Advocate Application] ID: ${appId} | Name: ${advocateData.name} | Email: ${advocateData.email} | Bar: ${advocateData.barNumber} | Status: ${reviewStatus}. Review at: ${reviewLink}`,
          html: htmlContent,
        });
        const isAccepted = isRecipientAccepted(info.accepted, targetEmail) ||
          (Array.isArray(info.accepted) && info.accepted.length > 0 && (!Array.isArray(info.rejected) || info.rejected.length === 0));
        logEmailAudit({
          eventId,
          purpose: 'ADMIN_ADVOCATE_NOTIFICATION',
          recipient: targetEmail,
          outcome: isAccepted ? 'SMTP_RELAYED_SUCCESS' : 'SMTP_RELAYED_REJECTED',
        });
        console.log(`[Email Service] Advocate registration notification accepted by SMTP provider for admin ${maskEmailAddress(targetEmail)}. MessageId: ${info.messageId}`);
        return {
          delivered: isAccepted,
          smtpAccepted: isAccepted,
          deliveryStatus: isAccepted ? 'smtp_relayed' : 'smtp_rejected',
          status: isAccepted ? 'accepted' : 'failed',
          messageId: info.messageId,
          eventId,
          provider: 'smtp',
          targetEmail,
          applicationId: appId,
        };
      } catch (err) {
        logEmailAudit({
          eventId,
          purpose: 'ADMIN_ADVOCATE_NOTIFICATION',
          recipient: targetEmail,
          outcome: 'SMTP_TRANSMISSION_ERROR',
          error: err.message,
        });
        console.error(`[Email Service] SMTP transmission error sending notification to ${maskEmailAddress(targetEmail)}:`, err.message);
        return {
          delivered: false,
          smtpAccepted: false,
          deliveryStatus: 'failed',
          status: 'failed',
          error: `SMTP transmission failed: ${err.message}`,
          eventId,
          provider: 'smtp',
          targetEmail,
          applicationId: appId,
        };
      }
    } else {
      logEmailAudit({ eventId, purpose: 'ADMIN_ADVOCATE_NOTIFICATION', recipient: targetEmail, outcome: 'SMTP_UNCONFIGURED_FALLBACK' });
      console.warn(`[Email Service] SMTP not configured. Notification for advocate application ${appId} queued as failed delivery (Target: ${maskEmailAddress(targetEmail)}).`);
      return {
        delivered: false,
        smtpAccepted: false,
        deliveryStatus: 'unconfigured',
        status: 'failed',
        error: 'SMTP provider unconfigured (missing SMTP_HOST, SMTP_USER, SMTP_PASS in backend/.env)',
        eventId,
        provider: 'none',
        targetEmail,
        applicationId: appId,
      };
    }
  },

  /**
   * Send notification to advocate when admin reviews/approves/rejects/suspends application
   */
  async sendAdvocateStatusUpdateEmail(lawyerEmail, { name, status, remarks = '' }) {
    const isMock = isEmailMockMode(lawyerEmail);
    if (!isMock) {
      const validation = isRealUsableEmail(lawyerEmail);
      if (!validation.valid) {
        const masked = maskEmailAddress(lawyerEmail);
        console.warn(`[Email Service: Blocked Dispatch] Advocate status recipient ${masked} rejected: ${validation.reason}`);
        return {
          delivered: false,
          smtpAccepted: false,
          deliveryStatus: 'blocked_placeholder_domain',
          status: 'failed',
          error: `Advocate recipient validation failed: ${validation.reason}`,
          recipient: lawyerEmail || null,
          maskedEmail: masked,
          provider: 'blocked_placeholder',
        };
      }
    }

    const cleanEmail = lawyerEmail ? lawyerEmail.trim().toLowerCase() : '';
    const maskedEmail = maskEmailAddress(cleanEmail);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const statusPageUrl = `${frontendUrl}/lawyer/verification-status`;
    const chamberUrl = `${frontendUrl}/lawyer/dashboard`;

    let headline = 'Application Status Updated';
    let bannerColor = '#2563eb';
    let statusText = status;
    let description = '';
    let actionButton = '';

    switch (String(status).toUpperCase()) {
      case 'VERIFIED':
        headline = 'Advocate Credentials Verified';
        bannerColor = '#16a34a';
        statusText = 'VERIFIED';
        description = 'Congratulations! Your Bar Council enrollment and documentation have been formally verified by the VidhiSetu administrative panel. Your Advocate Chambers access is now fully activated.';
        actionButton = `<a href="${chamberUrl}" style="display: inline-block; background-color: #16a34a; color: #ffffff; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px;">Enter Advocate Chambers</a>`;
        break;
      case 'UNDER_REVIEW':
        headline = 'Application Under Formal Review';
        bannerColor = '#d97706';
        statusText = 'UNDER_REVIEW';
        description = 'Your Bar Council enrollment details are currently being cross-referenced with official state bar council records.';
        actionButton = `<a href="${statusPageUrl}" style="display: inline-block; background-color: #d97706; color: #ffffff; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px;">View Application Status</a>`;
        break;
      case 'REJECTED':
        headline = 'Advocate Application Status: Rejected';
        bannerColor = '#dc2626';
        statusText = 'REJECTED';
        description = 'We regret to inform you that your advocate application could not be verified at this time.';
        actionButton = `<a href="${statusPageUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px;">Review Remarks & Re-apply</a>`;
        break;
      case 'SUSPENDED':
        headline = 'Chambers Access Suspended';
        bannerColor = '#b91c1c';
        statusText = 'SUSPENDED';
        description = 'Your VidhiSetu advocate chamber access has been temporarily suspended pending administrative inquiry.';
        actionButton = `<a href="${statusPageUrl}" style="display: inline-block; background-color: #b91c1c; color: #ffffff; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px;">Contact Support</a>`;
        break;
      default: // PENDING / MORE_INFO_NEEDED
        headline = 'Additional Information Required';
        bannerColor = '#d97706';
        statusText = status;
        description = 'The administrative verification committee requires additional information or documents to complete your verification.';
        actionButton = `<a href="${statusPageUrl}" style="display: inline-block; background-color: #d97706; color: #ffffff; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px;">Upload Requested Details</a>`;
        break;
    }

    const subject = `[VidhiSetu] Advocate Verification Status: ${statusText}`;
    const eventId = `evt_adv_stat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Support mock transport for automated tests
    if (isEmailMockMode(cleanEmail)) {
      if (typeof mockEmailTransport === 'function') {
        const mockRes = await mockEmailTransport({
          type: 'advocate_status_update',
          to: cleanEmail,
          recipient: cleanEmail,
          maskedEmail,
          status: statusText,
          subject,
          eventId,
        });
        logEmailAudit({ eventId, purpose: 'ADVOCATE_STATUS_UPDATE', recipient: cleanEmail, outcome: 'CUSTOM_MOCK_DISPATCH' });
        return {
          delivered: false,
          smtpAccepted: false,
          deliveryStatus: 'mocked',
          status: 'mocked',
          recipient: cleanEmail,
          maskedEmail,
          statusText,
          eventId,
          provider: 'mock_transport',
          simulated: true,
          ...mockRes,
        };
      }

      mockDispatchesLedger.push({ type: 'advocate_status_update', recipient: cleanEmail, status: statusText, eventId, timestamp: new Date().toISOString() });
      logEmailAudit({ eventId, purpose: 'ADVOCATE_STATUS_UPDATE', recipient: cleanEmail, outcome: 'BUILTIN_MOCK_DISPATCH' });
      return {
        delivered: false,
        smtpAccepted: false,
        deliveryStatus: 'mocked',
        status: 'mocked',
        recipient: cleanEmail,
        maskedEmail,
        statusText,
        eventId,
        provider: 'mock_transport',
        simulated: true,
      };
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: ${bannerColor}; padding: 22px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px;">${headline}</h2>
          <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0 0; font-size: 13px;">VidhiSetu Bar Verification Council</p>
        </div>
        <div style="padding: 28px 24px; color: #1e293b;">
          <h3 style="margin-top: 0; color: #0f172a;">Dear Adv. ${escapeHtml(name || 'Counsel')},</h3>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">${description}</p>
          ${remarks ? `
          <div style="background-color: #f8fafc; border-left: 4px solid ${bannerColor}; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px; color: #334155;"><strong>Administrative Remarks:</strong></p>
            <p style="margin: 6px 0 0 0; font-size: 14px; color: #0f172a;">${escapeHtml(remarks)}</p>
          </div>` : ''}
          <div style="margin: 28px 0; text-align: center;">
            ${actionButton}
          </div>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
            VidhiSetu Legal Aid & Chambers Administration • Protected under standard encryption.
          </p>
        </div>
      </div>
    `;

    const activeTransporter = getTransporter();
    if (activeTransporter && isConfigured) {
      try {
        const fromAddress = getFromAddress();
        const info = await activeTransporter.sendMail({
          from: fromAddress,
          to: cleanEmail,
          subject,
          text: `Advocate verification status updated to ${statusText}. Remarks: ${remarks || 'None'}`,
          html: htmlContent,
        });
        const isAccepted = isRecipientAccepted(info.accepted, cleanEmail) ||
          (Array.isArray(info.accepted) && info.accepted.length > 0 && (!Array.isArray(info.rejected) || info.rejected.length === 0));
        logEmailAudit({
          eventId,
          purpose: 'ADVOCATE_STATUS_UPDATE',
          recipient: cleanEmail,
          outcome: isAccepted ? 'SMTP_RELAYED_SUCCESS' : 'SMTP_RELAYED_REJECTED',
        });
        console.log(`[Email Service] Status update email accepted by SMTP relay for ${maskedEmail}. MessageId: ${info.messageId}`);
        return {
          delivered: isAccepted,
          smtpAccepted: isAccepted,
          deliveryStatus: isAccepted ? 'smtp_relayed' : 'smtp_rejected',
          status: isAccepted ? 'accepted' : 'failed',
          recipient: cleanEmail,
          messageId: info.messageId,
          eventId,
          provider: 'smtp',
        };
      } catch (err) {
        logEmailAudit({
          eventId,
          purpose: 'ADVOCATE_STATUS_UPDATE',
          recipient: cleanEmail,
          outcome: 'SMTP_TRANSMISSION_ERROR',
          error: err.message,
        });
        console.error(`[Email Service] Failed to send status update email to ${maskedEmail}:`, err.message);
        return {
          delivered: false,
          smtpAccepted: false,
          deliveryStatus: 'failed',
          status: 'failed',
          recipient: cleanEmail,
          error: `SMTP transmission failed: ${err.message}`,
          eventId,
          provider: 'smtp',
        };
      }
    } else {
      logEmailAudit({ eventId, purpose: 'ADVOCATE_STATUS_UPDATE', recipient: cleanEmail, outcome: 'SMTP_UNCONFIGURED_FALLBACK' });
      console.log(`[Email Service] Status update email logged for ${maskedEmail}: Status ${statusText} (SMTP unconfigured)`);
      return {
        delivered: false,
        smtpAccepted: false,
        deliveryStatus: 'unconfigured',
        status: 'failed',
        recipient: cleanEmail,
        error: 'SMTP provider unconfigured in backend/.env',
        eventId,
        provider: 'none',
      };
    }
  },

  /**
   * Dispatch Support Request Notification to Administrator (adminvidhisetu@gmail.com)
   * PRIVACY RULE: Does NOT include private legal conversations.
   */
  async sendSupportNotificationEmail(adminEmail, { requestId, category, subject, description, userEmail, userName, priority }) {
    const rawTarget = adminEmail || process.env.ADMIN_EMAIL;
    const validation = isRealUsableEmail(rawTarget);
    if (!validation.valid) {
      const masked = maskEmailAddress(rawTarget);
      console.warn(`[Email Service: Blocked Dispatch] Support admin recipient ${masked} rejected: ${validation.reason}`);
      return {
        delivered: false,
        smtpAccepted: false,
        deliveryStatus: 'blocked_placeholder_domain',
        status: 'failed',
        error: `Support admin recipient validation failed: ${validation.reason}`,
        targetEmail: rawTarget,
        requestId,
        provider: 'blocked_placeholder',
      };
    }

    const targetEmail = validation.email;
    const emailSubject = `[VidhiSetu Support #${requestId}] (${priority.toUpperCase()}) ${category}: ${subject}`;
    const eventId = `evt_sup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    if (isEmailMockMode(targetEmail)) {
      if (typeof mockEmailTransport === 'function') {
        const mockRes = await mockEmailTransport({
          type: 'support_notification',
          to: targetEmail,
          targetEmail,
          requestId,
          category,
          priority,
          subject,
          eventId,
        });
        logEmailAudit({ eventId, purpose: 'SUPPORT_NOTIFICATION', recipient: targetEmail, outcome: 'CUSTOM_MOCK_DISPATCH' });
        return {
          targetEmail,
          requestId,
          eventId,
          provider: 'mock_transport',
          simulated: true,
          ...mockRes,
          delivered: false,
          smtpAccepted: false,
          deliveryStatus: 'mocked',
          status: 'mocked',
        };
      }

      mockDispatchesLedger.push({ type: 'support_notification', recipient: targetEmail, requestId, eventId, timestamp: new Date().toISOString() });
      logEmailAudit({ eventId, purpose: 'SUPPORT_NOTIFICATION', recipient: targetEmail, outcome: 'BUILTIN_MOCK_DISPATCH' });
      return {
        delivered: false,
        smtpAccepted: false,
        deliveryStatus: 'mocked',
        status: 'mocked',
        targetEmail,
        requestId,
        eventId,
        provider: 'mock_transport',
        simulated: true,
      };
    }

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 22px; text-align: center; border-bottom: 2px solid #d4af37;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px;">New Support Request Filed</h2>
          <p style="color: #d4af37; margin: 4px 0 0 0; font-size: 13px;">ID: ${requestId} • Priority: ${priority.toUpperCase()}</p>
        </div>
        <div style="padding: 24px; color: #1e293b;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 13px; width: 120px;"><strong>Applicant:</strong></td>
              <td style="padding: 8px 0; font-size: 14px; color: #0f172a;">${userName} (${maskEmailAddress(userEmail)})</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 13px;"><strong>Category:</strong></td>
              <td style="padding: 8px 0; font-size: 14px; color: #0f172a;">${category}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 13px;"><strong>Subject:</strong></td>
              <td style="padding: 8px 0; font-size: 14px; color: #0f172a; font-weight: 600;">${subject}</td>
            </tr>
          </table>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #475569; font-weight: 600;">Issue Description:</p>
            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">${description}</p>
          </div>

          <p style="font-size: 12px; color: #94a3b8; margin: 0;">
            Note: In accordance with VidhiSetu Privacy Policy, private legal conversations and client case records are strictly excluded from automated email dispatch.
          </p>
        </div>
      </div>
    `;

    const activeTransporter = getTransporter();
    if (activeTransporter && isConfigured) {
      try {
        const fromAddress = getFromAddress();
        const info = await activeTransporter.sendMail({
          from: fromAddress,
          to: targetEmail,
          subject: emailSubject,
          text: `Support Request #${requestId}\nCategory: ${category}\nUser: ${userName} (${maskEmailAddress(userEmail)})\nSubject: ${subject}\n\nDescription:\n${description}`,
          html: htmlContent,
        });
        const isAccepted = isRecipientAccepted(info.accepted, targetEmail) ||
          (Array.isArray(info.accepted) && info.accepted.length > 0 && (!Array.isArray(info.rejected) || info.rejected.length === 0));
        logEmailAudit({
          eventId,
          purpose: 'SUPPORT_NOTIFICATION',
          recipient: targetEmail,
          outcome: isAccepted ? 'SMTP_RELAYED_SUCCESS' : 'SMTP_RELAYED_REJECTED',
        });
        console.log(`[Email Service] Support notification email accepted by SMTP relay for admin ${maskEmailAddress(targetEmail)} (#${requestId}). MessageId: ${info.messageId}`);
        return {
          delivered: isAccepted,
          smtpAccepted: isAccepted,
          deliveryStatus: isAccepted ? 'smtp_relayed' : 'smtp_rejected',
          status: isAccepted ? 'accepted' : 'failed',
          messageId: info.messageId,
          eventId,
          provider: 'smtp',
          requestId,
        };
      } catch (err) {
        logEmailAudit({
          eventId,
          purpose: 'SUPPORT_NOTIFICATION',
          recipient: targetEmail,
          outcome: 'SMTP_TRANSMISSION_ERROR',
          error: err.message,
        });
        console.error(`[Email Service] SMTP error sending support notification #${requestId}:`, err.message);
        return {
          delivered: false,
          smtpAccepted: false,
          deliveryStatus: 'failed',
          status: 'failed',
          error: err.message,
          eventId,
          provider: 'smtp',
          requestId,
        };
      }
    } else {
      logEmailAudit({ eventId, purpose: 'SUPPORT_NOTIFICATION', recipient: targetEmail, outcome: 'SMTP_UNCONFIGURED_FALLBACK' });
      console.warn(`[Email Service] SMTP not configured. Support notification #${requestId} queued as failed delivery.`);
      return {
        delivered: false,
        smtpAccepted: false,
        deliveryStatus: 'unconfigured',
        status: 'failed',
        error: 'SMTP provider unconfigured in backend/.env',
        eventId,
        provider: 'none',
        requestId,
      };
    }
  },

  getTransporter() {
    return getTransporter();
  },

  isMockMode(recipient = '') {
    return isEmailMockMode(recipient);
  },

  getMockDispatches() {
    return getMockEmailDispatches();
  },

  clearMockDispatches() {
    clearMockEmailDispatches();
  },

  setMockTransport(fn) {
    setMockEmailTransport(fn);
  },

  resetMockTransport() {
    resetMockEmailTransport();
  },
};

export default EmailService;

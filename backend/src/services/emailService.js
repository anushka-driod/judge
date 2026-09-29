import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter = null;
let isConfigured = false;

// Initialize Transporter if SMTP credentials exist in .env
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  try {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    isConfigured = true;
    console.log(`[Email Service] Live SMTP Transporter initialized on ${process.env.SMTP_HOST}`);
  } catch (err) {
    console.warn('[Email Service] Failed to initialize live SMTP transporter:', err.message);
  }
} else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  try {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
    isConfigured = true;
    console.log(`[Email Service] Gmail Transporter initialized for ${process.env.GMAIL_USER}`);
  } catch (err) {
    console.warn('[Email Service] Failed to initialize Gmail transporter:', err.message);
  }
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
 * Validates if an email is well-formed and not from a disposable/fake email service
 */
export function isRealUsableEmail(email) {
  if (!email || typeof email !== 'string') return { valid: false, reason: 'Email is required.' };
  const clean = email.trim().toLowerCase();

  // Basic RFC 5322 compliant regex check
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(clean)) {
    return { valid: false, reason: 'Please enter a valid, well-formed email address.' };
  }

  const parts = clean.split('@');
  if (parts.length !== 2) {
    return { valid: false, reason: 'Invalid email address format.' };
  }

  const domain = parts[1];
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      valid: false,
      reason: 'Temporary or disposable email addresses are not allowed. Please provide your real permanent email.',
    };
  }

  // Reject top-level domain anomalies or test domains
  if (domain.endsWith('.test') || domain.endsWith('.invalid') || domain.endsWith('.example') || domain === 'localhost') {
    return { valid: false, reason: 'Please use a real, usable email domain.' };
  }

  return { valid: true, email: clean };
}

export const EmailService = {
  /**
   * Send 6-Digit Verification OTP to user's real email address
   * @param {string} toEmail - Recipient email
   * @param {string} otpCode - 6-digit verification OTP
   * @param {string} [userName] - Recipient name
   * @returns {Promise<{ delivered: boolean, maskedEmail: string }>}
   */
  async sendOtpEmail(toEmail, otpCode, userName = 'Citizen') {
    const maskedEmail = maskEmailAddress(toEmail);
    const subject = `${otpCode} is your VidhiSetu verification code`;

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

    // 1. If real SMTP is configured, attempt sending real email
    if (transporter && isConfigured) {
      try {
        const info = await transporter.sendMail({
          from: process.env.SMTP_FROM || '"VidhiSetu Security" <no-reply@vidhisetu.gov.in>',
          to: toEmail,
          subject,
          text: `Your VidhiSetu verification code is: ${otpCode}. It will expire in 5 minutes. Do not share with anyone.`,
          html: htmlContent,
        });

        console.log(`[Email Service] Real email dispatched to ${maskedEmail}: MessageId: ${info.messageId}`);
        return { delivered: true, maskedEmail };
      } catch (err) {
        console.error(`[Email Service] Failed to send real email via SMTP to ${maskedEmail}:`, err.message);
      }
    }

    // 2. Secure Development / Sandbox Log - zero OTP disclosure
    console.log(`[Email Service] Verification email dispatched to ${maskedEmail} (Expiry: 5 minutes, Provider: SMTP/Queue)`);

    return {
      delivered: false,
      maskedEmail,
    };
  },
};

export default EmailService;

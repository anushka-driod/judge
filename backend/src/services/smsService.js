import dotenv from 'dotenv';
dotenv.config();

/**
 * Mask mobile number for secure presentation (e.g. +91 98765 43210 -> +91 ******3210)
 */
export function maskPhoneNumber(phone) {
  if (!phone) return '******';
  const clean = phone.replace(/\s+/g, '');
  if (clean.length <= 4) return '******' + clean;
  const lastFour = clean.slice(-4);
  const prefix = clean.startsWith('+91') ? '+91 ' : (clean.startsWith('+') ? clean.slice(0, 3) + ' ' : '');
  return `${prefix}******${lastFour}`;
}

/**
 * Normalize phone number to E.164 format (+91XXXXXXXXXX)
 */
export function normalizePhoneNumber(phone) {
  if (!phone) return '';
  const parsed = parseAndValidatePhone(phone);
  if (parsed.valid) return parsed.e164;
  const digits = String(phone).replace(/[^\d]/g, '');
  return digits.length >= 10 ? `+91${digits.slice(-10)}` : `+91${digits}`;
}

/**
 * Validate and normalize mobile number into:
 * - e164: +919876543210
 * - national10: 9876543210
 */
export function parseAndValidatePhone(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { valid: false, reason: 'Mobile phone number is required.' };
  }

  const digits = rawPhone.replace(/[^\d]/g, '');

  let national10 = '';
  if (digits.length === 10) {
    national10 = digits;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    national10 = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    national10 = digits.slice(1);
  } else {
    return {
      valid: false,
      reason: `Invalid phone number format. Expected a 10-digit Indian mobile number (e.g. 9876543210 or +919876543210), received ${digits.length} digits.`,
    };
  }

  // Validate Indian mobile starting digit (6, 7, 8, 9)
  if (!/^[6-9]\d{9}$/.test(national10)) {
    return {
      valid: false,
      reason: 'Invalid Indian mobile number. Mobile numbers in India must start with 6, 7, 8, or 9.',
    };
  }

  const e164 = `+91${national10}`;

  return {
    valid: true,
    national10,
    e164,
    formatted: `+91 ${national10.slice(0, 5)} ${national10.slice(5)}`,
    masked: `+91 ******${national10.slice(-4)}`,
  };
}

export const SmsService = {
  /**
   * Check if any real SMS gateway is configured
   */
  isConfigured() {
    const hasFast2Sms = Boolean(process.env.FAST2SMS_API_KEY && process.env.FAST2SMS_API_KEY.trim() && !process.env.FAST2SMS_API_KEY.includes('your_fast2sms'));
    const hasTwilio = Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER &&
      !process.env.TWILIO_ACCOUNT_SID.includes('XXXX')
    );
    const hasCustom = Boolean(process.env.SMS_GATEWAY_URL && !process.env.SMS_GATEWAY_URL.includes('your-sms'));

    return {
      configured: hasFast2Sms || hasTwilio || hasCustom,
      provider: hasFast2Sms ? 'fast2sms' : (hasTwilio ? 'twilio' : (hasCustom ? 'custom' : 'none')),
      hasFast2Sms,
      hasTwilio,
      hasCustom,
    };
  },

  /**
   * Dispatches 6-digit verification OTP to the user's mobile number via configured SMS gateway
   * @param {string} rawPhone - Recipient mobile number
   * @param {string} otpCode - 6-digit verification code
   * @returns {Promise<{ delivered: boolean, provider: string, maskedPhone: string, messageId?: string }>}
   */
  async sendOtpSms(rawPhone, otpCode) {
    const parsed = parseAndValidatePhone(rawPhone);
    if (!parsed.valid) {
      const error = new Error(parsed.reason);
      error.status = 400;
      throw error;
    }

    const { national10, e164, masked } = parsed;
    const config = this.isConfigured();
    const messageText = `Your VidhiSetu verification code is: ${otpCode}. Valid for 5 minutes. Do not share this code with anyone.`;

    // 1. Check Fast2SMS Gateway (Primary Indian SMS Provider)
    if (config.hasFast2Sms) {
      try {
        console.log(`[SMS Service] Attempting Fast2SMS dispatch to ${masked}...`);
        const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            'authorization': process.env.FAST2SMS_API_KEY.trim(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            route: 'otp',
            variables_values: otpCode,
            numbers: national10,
          }),
        });

        const data = await response.json();
        if (data.return === true) {
          console.log(`[SMS Service] Fast2SMS delivered successfully to ${masked}. RequestId: ${data.request_id || 'OK'}`);
          return {
            delivered: true,
            provider: 'fast2sms',
            maskedPhone: masked,
            messageId: data.request_id,
          };
        } else {
          const errMsg = Array.isArray(data.message) ? data.message.join(', ') : (data.message || 'Fast2SMS returned failure.');
          console.error(`[SMS Service] Fast2SMS dispatch failed for ${masked}:`, errMsg);
          const error = new Error(`Fast2SMS delivery failure: ${errMsg}`);
          error.status = 502;
          error.provider = 'fast2sms';
          throw error;
        }
      } catch (err) {
        if (err.status) throw err;
        console.error(`[SMS Service] Fast2SMS network error for ${masked}:`, err.message);
        const error = new Error(`Failed to communicate with Fast2SMS gateway: ${err.message}`);
        error.status = 502;
        throw error;
      }
    }

    // 2. Check Twilio Gateway
    if (config.hasTwilio) {
      try {
        console.log(`[SMS Service] Attempting Twilio dispatch to ${masked} (${e164})...`);
        const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID.trim()}/Messages.json`;
        const auth = Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID.trim()}:${process.env.TWILIO_AUTH_TOKEN.trim()}`
        ).toString('base64');

        const params = new URLSearchParams();
        params.append('To', e164);
        params.append('From', process.env.TWILIO_PHONE_NUMBER.trim());
        params.append('Body', messageText);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        const data = await response.json();
        if (response.ok && data.sid) {
          console.log(`[SMS Service] Twilio SMS dispatched successfully to ${masked}. Message SID: ${data.sid}`);
          return {
            delivered: true,
            provider: 'twilio',
            maskedPhone: masked,
            messageId: data.sid,
          };
        } else {
          const errMsg = data.message || `Twilio HTTP ${response.status}: ${response.statusText}`;
          console.error(`[SMS Service] Twilio dispatch failed for ${masked}:`, errMsg);
          const error = new Error(`Twilio delivery failure: ${errMsg}`);
          error.status = 502;
          error.provider = 'twilio';
          throw error;
        }
      } catch (err) {
        if (err.status) throw err;
        console.error(`[SMS Service] Twilio network error for ${masked}:`, err.message);
        const error = new Error(`Failed to communicate with Twilio gateway: ${err.message}`);
        error.status = 502;
        throw error;
      }
    }

    // 3. Check Custom Gateway
    if (config.hasCustom) {
      try {
        console.log(`[SMS Service] Attempting Custom Gateway dispatch to ${masked}...`);
        const response = await fetch(process.env.SMS_GATEWAY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.SMS_GATEWAY_BEARER ? { 'Authorization': `Bearer ${process.env.SMS_GATEWAY_BEARER}` } : {}),
          },
          body: JSON.stringify({
            phone: e164,
            nationalPhone: national10,
            otp: otpCode,
            message: messageText,
          }),
        });

        if (response.ok) {
          console.log(`[SMS Service] Custom Gateway dispatched successfully to ${masked}`);
          return {
            delivered: true,
            provider: 'custom_gateway',
            maskedPhone: masked,
          };
        } else {
          const text = await response.text();
          console.error(`[SMS Service] Custom Gateway returned error for ${masked}:`, text);
          const error = new Error(`Custom SMS Gateway error: ${text}`);
          error.status = 502;
          throw error;
        }
      } catch (err) {
        if (err.status) throw err;
        console.error(`[SMS Service] Custom Gateway network error for ${masked}:`, err.message);
        const error = new Error(`Failed to communicate with SMS Gateway: ${err.message}`);
        error.status = 502;
        throw error;
      }
    }

    // 4. No SMS Gateway configured in .env
    console.warn(`[SMS Service] No active SMS provider configured in backend/.env for ${masked}.`);
    const error = new Error(
      'SMS Gateway is not configured. To send real SMS to mobile phones, please set FAST2SMS_API_KEY or TWILIO credentials in backend/.env.'
    );
    error.status = 503;
    error.code = 'SMS_PROVIDER_NOT_CONFIGURED';
    error.maskedPhone = masked;
    throw error;
  },
};

export default SmsService;

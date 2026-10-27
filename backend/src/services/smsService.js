import dotenv from 'dotenv';
if (!(process.env.NODE_ENV === 'test' && process.env.VIDHISETU_TEST_MODE === 'isolated')) {
  dotenv.config();
}

let mockTransport = null;
const mockSmsLedger = [];

export function getMockSmsDispatches() {
  return [...mockSmsLedger];
}

export function clearMockSmsDispatches() {
  mockSmsLedger.length = 0;
}

export function isSmsMockMode() {
  if (typeof mockTransport === 'function') return true;
  if (
    process.env.NODE_ENV === 'test' ||
    process.env.MOCK_SMS === 'true' ||
    process.env.DISABLE_REAL_SMS === 'true'
  ) {
    return true;
  }
  return false;
}

export function logSmsAudit({ eventId, purpose, recipient, outcome, error = null }) {
  const masked = maskPhoneNumber(recipient);
  const processInfo = `PID-${process.pid}`;
  console.log(
    `[SMS Audit] EventID: ${eventId} | Purpose: ${purpose} | Recipient: ${masked} | Process: ${processInfo} | Outcome: ${outcome}${error ? ` | Error: ${error}` : ''}`
  );
}

/**
 * Mask mobile number for secure presentation (e.g. +91 98765 43210 -> +91 ******3210)
 */
export function maskPhoneNumber(phone) {
  if (!phone) return '******';
  const clean = String(phone).replace(/\s+/g, '');
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

/**
 * Categorize Fast2SMS error responses safely without leaking raw tokens or PII
 */
export function categorizeFast2SmsError(statusCode, rawMessage) {
  const msg = (Array.isArray(rawMessage) ? rawMessage.join(', ') : String(rawMessage || '')).toLowerCase();

  if (
    statusCode === 999 ||
    msg.includes('100 inr') ||
    msg.includes('transaction') ||
    msg.includes('balance') ||
    msg.includes('credit') ||
    msg.includes('wallet')
  ) {
    return {
      code: 'INSUFFICIENT_CREDITS',
      userMessage: 'SMS gateway balance is insufficient. Minimum transaction/recharge required on provider dashboard.',
    };
  }

  if (
    statusCode === 411 ||
    statusCode === 401 ||
    msg.includes('invalid authorization key') ||
    msg.includes('invalid key') ||
    msg.includes('unauthorized')
  ) {
    return {
      code: 'INVALID_API_KEY',
      userMessage: 'Fast2SMS API key is invalid or unauthorized.',
    };
  }

  if (
    msg.includes('complete website verification') ||
    msg.includes('website verification') ||
    msg.includes('otp message menu') ||
    msg.includes('dlt sms api')
  ) {
    return {
      code: 'UNVERIFIED_OTP_ROUTE',
      userMessage: 'Fast2SMS account requires website verification for OTP route or approval for DLT route.',
    };
  }

  if (statusCode === 429 || msg.includes('limit') || msg.includes('too many')) {
    return {
      code: 'RATE_LIMIT_EXCEEDED',
      userMessage: 'Fast2SMS rate limit exceeded. Please wait before retrying.',
    };
  }

  if (msg.includes('invalid numbers') || msg.includes('number not found') || msg.includes('invalid phone')) {
    return {
      code: 'INVALID_PHONE_NUMBER',
      userMessage: 'Recipient phone number was rejected by Fast2SMS gateway.',
    };
  }

  return {
    code: 'PROVIDER_ERROR',
    userMessage: Array.isArray(rawMessage) ? rawMessage.join(', ') : (rawMessage || 'Fast2SMS returned a delivery error.'),
  };
}

/**
 * Internal fetch dispatcher supporting test mocks
 */
async function executeFetch(url, options) {
  if (typeof mockTransport === 'function') {
    return mockTransport(url, options);
  }
  if (isSmsMockMode()) {
    mockSmsLedger.push({ url, options, timestamp: new Date().toISOString() });
    return {
      ok: true,
      json: async () => ({
        return: true,
        request_id: `mock_fast2sms_${Date.now()}`,
        message: ['SMS simulated via test mock transport.'],
      }),
    };
  }
  return fetch(url, options);
}

export const SmsService = {
  /**
   * Set a mock transport function for testing without sending real SMS messages
   * @param {((url: string, options: any) => Promise<any>) | null} fn
   */
  setMockTransport(fn) {
    mockTransport = fn;
  },

  /**
   * Reset mock transport back to standard fetch
   */
  resetMockTransport() {
    mockTransport = null;
  },

  getPhoneOtpConfiguration() {
    const apiKey = (process.env.FAST2SMS_API_KEY || '').trim();
    const phoneNumberId = (process.env.FAST2SMS_WHATSAPP_PHONE_NUMBER_ID || '').trim();
    const templateName = (process.env.FAST2SMS_WHATSAPP_TEMPLATE_NAME || '').trim();
    const templateLanguage = (process.env.FAST2SMS_WHATSAPP_TEMPLATE_LANGUAGE || '').trim();
    const otpId = (process.env.FAST2SMS_OTP_ID || '').trim();
    const fallbackRequested = process.env.FAST2SMS_WHATSAPP_SMS_FALLBACK === 'true';

    return {
      whatsappConfigured: Boolean(
        apiKey &&
        process.env.FAST2SMS_WHATSAPP_ENABLED === 'true' &&
        phoneNumberId &&
        templateName &&
        templateLanguage
      ),
      smsFallbackConfigured: Boolean(apiKey && otpId && fallbackRequested),
      fallbackRequested,
      otpId,
      apiKey,
      phoneNumberId,
      templateName,
      templateLanguage,
      apiVersion: (process.env.FAST2SMS_WHATSAPP_API_VERSION || 'v26.0').trim(),
      expiryMinutes: Number.parseInt(process.env.FAST2SMS_OTP_EXPIRY_MINUTES || '5', 10),
    };
  },

  async _postFast2Sms(url, apiKey, body, timeoutMessage) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await executeFetch(url, {
        method: 'POST',
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      let data;
      try {
        data = await response.json();
      } catch {
        data = null;
      }
      return { response, data };
    } catch (error) {
      const providerError = new Error(
        error.name === 'AbortError' ? timeoutMessage : 'Could not communicate with Fast2SMS.'
      );
      providerError.status = 502;
      providerError.code = 'FAST2SMS_NETWORK_ERROR';
      throw providerError;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async sendFast2SmsSmartOtp(national10, otpCode, masked, config) {
    if (!config.apiKey || !config.otpId) {
      const error = new Error('Fast2SMS Smart OTP is not configured. Set the backend API key and OTP ID.');
      error.status = 503;
      error.code = 'SMART_OTP_NOT_CONFIGURED';
      throw error;
    }
    if (!Number.isInteger(config.expiryMinutes) || config.expiryMinutes < 1 || config.expiryMinutes > 10080) {
      const error = new Error('Fast2SMS OTP expiry must be configured between 1 and 10080 minutes.');
      error.status = 503;
      error.code = 'SMART_OTP_CONFIGURATION_INVALID';
      throw error;
    }

    const { response, data } = await this._postFast2Sms(
      'https://www.fast2sms.com/dev/otp/send',
      config.apiKey,
      {
        mobile: national10,
        otp_id: config.otpId,
        otp: otpCode,
        otp_expiry: config.expiryMinutes,
        otp_length: 6,
      },
      'Fast2SMS Smart OTP request timed out.'
    );

    if (!response.ok || data?.return !== true || !data?.request_id) {
      const error = new Error('Fast2SMS did not accept the SMS OTP request. Check the API key, OTP ID, and account balance.');
      error.status = response.status >= 500 ? 502 : (response.status === 429 || data?.status_code === 429 ? 429 : 400);
      error.code = error.status === 429 ? 'RATE_LIMIT_EXCEEDED' : 'SMART_OTP_REJECTED';
      error.provider = 'fast2sms';
      throw error;
    }

    return {
      success: true,
      delivered: true,
      providerAccepted: true,
      handsetDelivered: false,
      deliveryStatus: 'submitted_to_gateway',
      provider: 'fast2sms',
      channel: 'sms',
      verificationProvider: 'fast2sms_smart_otp',
      messageId: data.request_id,
      maskedPhone: masked,
      message: 'Fast2SMS accepted the Smart OTP SMS request.',
    };
  },

  async sendFast2SmsWhatsAppOtp(national10, otpCode, masked, config) {
    const url = `https://www.fast2sms.com/dev/whatsapp/${encodeURIComponent(config.apiVersion)}/${encodeURIComponent(config.phoneNumberId)}/messages`;
    const { response, data } = await this._postFast2Sms(
      url,
      config.apiKey,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: `91${national10}`,
        type: 'template',
        template: {
          name: config.templateName,
          language: { code: config.templateLanguage },
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: otpCode }],
            },
            {
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [{ type: 'text', text: otpCode }],
            },
          ],
        },
      },
      'Fast2SMS WhatsApp request timed out.'
    );

    const messageId = data?.messages?.[0]?.id;
    if (!response.ok || !messageId) {
      const error = new Error('Fast2SMS did not accept the WhatsApp OTP request. Check WhatsApp enablement and the approved authentication template.');
      error.status = response.status >= 500 ? 502 : (response.status === 429 ? 429 : 400);
      const providerMessage = String(data?.error?.message || data?.message || '').toLowerCase();
      const templateUnavailable = error.status === 400 && (
        /template.{0,40}(unavailable|not available|not approved|disabled|not configured|not found)/.test(providerMessage) ||
        /whatsapp.{0,40}(not enabled|not configured|unavailable)/.test(providerMessage)
      );
      const invalidRecipient = error.status === 400 && (
        /invalid.{0,30}(recipient|phone|number)/.test(providerMessage) ||
        /(recipient|phone|number).{0,30}invalid/.test(providerMessage)
      );
      error.code = error.status === 429
        ? 'WHATSAPP_RATE_LIMITED'
        : (invalidRecipient
          ? 'WHATSAPP_INVALID_RECIPIENT'
          : (templateUnavailable ? 'WHATSAPP_TEMPLATE_UNAVAILABLE' : 'WHATSAPP_OTP_REJECTED'));
      if (invalidRecipient) {
        error.message = 'Fast2SMS rejected this phone number for WhatsApp delivery. Check the number and WhatsApp account.';
      }
      error.provider = 'fast2sms';
      error.definitiveRejection = templateUnavailable;
      throw error;
    }

    return {
      success: true,
      delivered: true,
      providerAccepted: true,
      handsetDelivered: false,
      deliveryStatus: 'submitted_to_gateway',
      provider: 'fast2sms',
      channel: 'whatsapp',
      verificationProvider: 'local',
      messageId,
      maskedPhone: masked,
      message: 'Fast2SMS accepted the WhatsApp template message.',
    };
  },

  async verifyFast2SmsSmartOtp(national10, otpCode) {
    const config = this.getPhoneOtpConfiguration();
    if (!config.apiKey || !config.otpId) {
      const error = new Error('Fast2SMS Smart OTP verification is not configured.');
      error.status = 503;
      error.code = 'SMART_OTP_NOT_CONFIGURED';
      throw error;
    }

    const { response, data } = await this._postFast2Sms(
      'https://www.fast2sms.com/dev/otp/verify',
      config.apiKey,
      { mobile: national10, otp: otpCode },
      'Fast2SMS Smart OTP verification timed out.'
    );
    if (response.ok && data?.return === true && (!data.status_code || data.status_code === 200)) {
      return { valid: true };
    }
    if (response.status >= 500) {
      const error = new Error('Fast2SMS could not verify the code right now. Please try again.');
      error.status = 502;
      error.code = 'SMART_OTP_VERIFICATION_UNAVAILABLE';
      throw error;
    }
    const error = new Error('The code is invalid, expired, or its verification limit was reached. Request a new OTP.');
    error.status = data?.status_code === 429 ? 429 : 400;
    error.code = data?.status_code === 404 ? 'SMART_OTP_NOT_FOUND' : 'SMART_OTP_INVALID';
    throw error;
  },

  async sendPhoneOtp(rawPhone, otpCode, { channel = 'whatsapp' } = {}) {
    const parsed = parseAndValidatePhone(rawPhone);
    if (!parsed.valid) {
      const error = new Error(parsed.reason);
      error.status = 400;
      error.code = 'INVALID_PHONE_NUMBER';
      throw error;
    }
    if (channel !== 'whatsapp') {
      const error = new Error('Phone login OTP requests must use the WhatsApp channel.');
      error.status = 400;
      error.code = 'UNSUPPORTED_OTP_CHANNEL';
      throw error;
    }

    const config = this.getPhoneOtpConfiguration();
    const fallback = async () => {
      const result = await this.sendFast2SmsSmartOtp(parsed.national10, otpCode, parsed.masked, config);
      return { ...result, fallbackFrom: 'whatsapp' };
    };

    if (!config.whatsappConfigured) {
      if (config.fallbackRequested && config.smsFallbackConfigured) return fallback();
      const error = new Error(
        config.fallbackRequested
          ? 'WhatsApp OTP is not configured and the authorized SMS fallback is incomplete. Set the Fast2SMS OTP ID.'
          : 'WhatsApp OTP is not enabled for this account yet. Configure the Fast2SMS WhatsApp channel and approved authentication template.'
      );
      error.status = 503;
      error.code = 'WHATSAPP_OTP_NOT_CONFIGURED';
      throw error;
    }

    try {
      return await this.sendFast2SmsWhatsAppOtp(parsed.national10, otpCode, parsed.masked, config);
    } catch (error) {
      if (error.definitiveRejection && config.smsFallbackConfigured) return fallback();
      throw error;
    }
  },

  /**
   * Check if any real SMS gateway is configured
   */
  isConfigured() {
    const rawKey = process.env.FAST2SMS_API_KEY;
    const hasFast2Sms = Boolean(rawKey && rawKey.trim() && !rawKey.includes('your_fast2sms'));
    const hasTwilio = Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER &&
      !process.env.TWILIO_ACCOUNT_SID.includes('XXXX')
    );
    const hasCustom = Boolean(process.env.SMS_GATEWAY_URL && !process.env.SMS_GATEWAY_URL.includes('your-sms'));

    const isSimulation = !hasFast2Sms && !hasTwilio && !hasCustom;
    const demoEnabled = false;
    const route = (process.env.FAST2SMS_ROUTE || 'otp').trim().toLowerCase();

    return {
      configured: hasFast2Sms || hasTwilio || hasCustom || demoEnabled,
      hasRealGateway: !isSimulation,
      provider: hasFast2Sms ? 'fast2sms' : (hasTwilio ? 'twilio' : (hasCustom ? 'custom' : (demoEnabled ? 'demo_simulation' : 'none'))),
      hasFast2Sms,
      hasTwilio,
      hasCustom,
      isSimulation,
      demoEnabled,
      route,
    };
  },

  /**
   * Internal Fast2SMS dispatcher adhering to official bulkV2 documentation
   */
  async _sendFast2Sms({ national10, otpCode, masked, messageText, config }) {
    const apiKey = (process.env.FAST2SMS_API_KEY || '').trim();
    if (!apiKey) {
      throw new Error('FAST2SMS_API_KEY is not defined.');
    }

    const route = (process.env.FAST2SMS_ROUTE || 'otp').trim().toLowerCase();
    let requestBody;

    if (route === 'q') {
      // Quick SMS route (Full text message)
      requestBody = {
        route: 'q',
        message: messageText,
        numbers: national10,
      };
    } else if (route === 'dlt') {
      // DLT route (TRAI compliance)
      requestBody = {
        route: 'dlt',
        sender_id: process.env.FAST2SMS_SENDER_ID || '',
        message: process.env.FAST2SMS_DLT_TEMPLATE_ID || '',
        variables_values: String(otpCode).trim(),
        numbers: national10,
      };
    } else {
      // Standard OTP route (default)
      requestBody = {
        route: 'otp',
        variables_values: String(otpCode).trim(),
        numbers: national10,
      };
    }

    console.log(`[SMS Service] Dispatching Fast2SMS (route: ${route}) to ${masked}...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await executeFetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        throw new Error(`Failed to parse Fast2SMS response: ${parseErr.message}`);
      }

      // Fast2SMS success format: { return: true, request_id: "...", message: ["..."] }
      if (data && (data.return === true || (data.status_code === 200 && data.request_id))) {
        const requestId = data.request_id || (Array.isArray(data.message) ? data.message[0] : 'OK');
        console.log(`[SMS Service] Fast2SMS accepted submission for ${masked}. RequestId: ${requestId}`);

        return {
          success: true,
          delivered: true, // Legacy compatibility for boolean callers
          providerAccepted: true, // Specifically distinguishes provider submission
          handsetDelivered: false, // Distinguish gateway submission from confirmed handset delivery
          deliveryStatus: 'submitted_to_gateway',
          provider: 'fast2sms',
          messageId: requestId,
          maskedPhone: masked,
          route,
          message: 'OTP SMS accepted by Fast2SMS gateway for delivery.',
        };
      }

      // Fast2SMS error response format
      const category = categorizeFast2SmsError(data?.status_code, data?.message);
      console.warn(`[SMS Service] Fast2SMS rejected submission (${category.code}) for ${masked}: ${category.userMessage}`);

      const error = new Error(`Fast2SMS submission failure: ${category.userMessage}`);
      error.status = 502;
      error.code = category.code;
      error.provider = 'fast2sms';
      error.maskedPhone = masked;
      throw error;
    } catch (err) {
      clearTimeout(timeoutId);

      if (err.status) throw err; // Re-throw categorized error

      const isAbort = err.name === 'AbortError';
      const errMsg = isAbort ? 'Fast2SMS request timed out after 8 seconds' : err.message;
      console.error(`[SMS Service] Fast2SMS network error for ${masked}:`, errMsg);

      const netErr = new Error(`Failed to communicate with Fast2SMS gateway: ${errMsg}`);
      netErr.status = 502;
      netErr.code = 'NETWORK_ERROR';
      netErr.provider = 'fast2sms';
      throw netErr;
    }
  },

  /**
   * Dispatches 6-digit verification OTP to the user's mobile number via configured SMS gateway
   * @param {string} rawPhone - Recipient mobile number
   * @param {string} otpCode - 6-digit verification code
   * @returns {Promise<{ delivered: boolean, providerAccepted?: boolean, handsetDelivered?: boolean, provider: string, maskedPhone: string, messageId?: string, isDemo?: boolean }>}
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
    // 0. Support test mock mode without real SMS dispatch
    if (typeof mockTransport === 'function' || isSmsMockMode()) {
      mockSmsLedger.push({ phone: e164, national10, otpCode, timestamp: new Date().toISOString() });
      if (typeof mockTransport === 'function') {
        try {
          const mockRes = await mockTransport('https://www.fast2sms.com/dev/bulkV2', {
            method: 'POST',
            body: JSON.stringify({ route: 'otp', variables_values: otpCode, numbers: national10 }),
          });
          const data = mockRes && typeof mockRes.json === 'function' ? await mockRes.json() : mockRes;
          const category = categorizeFast2SmsError(data?.status_code, data?.message);
          return {
            success: Boolean(data?.return),
            delivered: Boolean(data?.return),
            providerAccepted: Boolean(data?.return),
            handsetDelivered: false,
            deliveryStatus: data?.return ? 'submitted_to_gateway' : 'rejected_by_gateway',
            provider: 'fast2sms',
            messageId: data?.request_id || (Array.isArray(data?.message) ? data?.message[0] : 'fast_req_mock'),
            route: (process.env.FAST2SMS_ROUTE || 'otp').trim().toLowerCase(),
            code: category.code,
            error: category.userMessage,
            maskedPhone: masked,
            message: data?.message || [],
          };
        } catch (_) {}
      }
      return {
        success: false,
        delivered: false,
        providerAccepted: false,
        handsetDelivered: false,
        deliveryStatus: 'mocked_unconfigured',
        provider: 'mock_sms',
        maskedPhone: masked,
        message: 'Mock SMS dispatch simulated.',
      };
    }

    // 1. Check Fast2SMS Gateway (Primary Indian SMS Provider)
    if (config.hasFast2Sms) {
      return this._sendFast2Sms({ national10, otpCode, masked, messageText, config });
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

        const response = await executeFetch(endpoint, {
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
            success: true,
            delivered: true,
            providerAccepted: true,
            handsetDelivered: false,
            deliveryStatus: 'submitted_to_gateway',
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
        const response = await executeFetch(process.env.SMS_GATEWAY_URL, {
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
            success: true,
            delivered: true,
            providerAccepted: true,
            handsetDelivered: false,
            deliveryStatus: 'submitted_to_gateway',
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

    // 4. No SMS Gateway configured
    console.warn(`[SMS Service] No active SMS provider configured in backend/.env for ${masked}.`);
    const error = new Error(
      'SMS Gateway is not configured. To send real SMS to mobile phones, please set FAST2SMS_API_KEY or TWILIO credentials in backend/.env.'
    );
    error.status = 503;
    error.code = 'SMS_PROVIDER_NOT_CONFIGURED';
    error.maskedPhone = masked;
    throw error;
  },

  isMockMode() {
    return isSmsMockMode();
  },

  getMockDispatches() {
    return getMockSmsDispatches();
  },

  clearMockDispatches() {
    clearMockSmsDispatches();
  },
};

export default SmsService;

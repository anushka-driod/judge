import './helpers/safeTestEnvironment.js';
process.env.NODE_ENV = 'test';
process.env.MOCK_EMAIL = 'true';
process.env.MOCK_SMS = 'true';
import nodeAssert from 'node:assert/strict';
import dotenv from 'dotenv';
dotenv.config();

import SmsService, {
  maskPhoneNumber,
  normalizePhoneNumber,
  parseAndValidatePhone,
  categorizeFast2SmsError,
} from '../src/services/smsService.js';
import EmailService from '../src/services/emailService.js';
import UserModel, { hashOtp, verifyOtpHash } from '../src/models/userModel.js';

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
    failed++;
  }
}

async function runFast2SmsTests() {
  console.log('\n========================================================================');
  console.log('   VIDHISETU FAST2SMS PHONE OTP & GATEWAY INTEGRATION TEST SUITE');
  console.log('========================================================================\n');

  // --- Suite 1: Phone Number Validation and Normalization ---
  console.log('[Suite 1: Indian Mobile Phone Number Validation & Normalization]');
  
  // 1a: Valid 10-digit number
  const res10 = parseAndValidatePhone('9876543210');
  assert(res10.valid === true, 'Accepts standard 10-digit Indian mobile number');
  assert(res10.national10 === '9876543210', 'Extracts 10-digit national number');
  assert(res10.e164 === '+919876543210', 'Normalizes to E.164 +91 format');
  assert(res10.masked === '+91 ******3210', 'Masks phone number safely');

  // 1b: Valid with +91 prefix and spaces
  const resPlus91 = parseAndValidatePhone('+91 91234 56789');
  assert(resPlus91.valid === true, 'Accepts +91 formatted mobile number with spaces');
  assert(resPlus91.national10 === '9123456789', 'Extracts clean 10 digits from +91 formatted input');

  // 1c: Valid with leading 0
  const resZero = parseAndValidatePhone('09845012345');
  assert(resZero.valid === true, 'Accepts 11-digit number with leading 0');
  assert(resZero.national10 === '9845012345', 'Strips leading 0 properly');

  // 1d: Rejects invalid starting digits (1, 2, 3, 4, 5)
  const resInvalidStart = parseAndValidatePhone('4123456789');
  assert(resInvalidStart.valid === false, 'Rejects mobile number starting with non-Indian prefix (4)');

  // 1e: Rejects non-Indian lengths
  const resShort = parseAndValidatePhone('98765');
  assert(resShort.valid === false, 'Rejects short phone number (< 10 digits)');

  const resLong = parseAndValidatePhone('+1202555012345');
  assert(resLong.valid === false, 'Rejects international / oversized phone number');

  // 1f: Rejects null / empty input safely
  const resNull = parseAndValidatePhone(null);
  assert(resNull.valid === false, 'Fails safely on null phone input');

  // --- Suite 2: Fast2SMS Successful Submission (Mocked) ---
  console.log('\n[Suite 2: Fast2SMS Successful OTP Submission & Delivery Semantics]');

  const mockApiKey = 'mock_fast2sms_api_key_for_testing_1234567890';
  process.env.FAST2SMS_API_KEY = mockApiKey;
  process.env.FAST2SMS_ROUTE = 'otp';

  let capturedUrl = null;
  let capturedOptions = null;

  SmsService.setMockTransport(async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;
    return {
      ok: true,
      json: async () => ({
        return: true,
        request_id: 'fast_req_mock_849201',
        message: ['SMS sent successfully'],
      }),
    };
  });

  const successRes = await SmsService.sendOtpSms('9876543210', '849201');

  // Verify endpoint and authentication header
  assert(capturedUrl === 'https://www.fast2sms.com/dev/bulkV2', 'Dispatches strictly to official bulkV2 endpoint');
  assert(capturedOptions.headers.authorization === mockApiKey, 'Passes Fast2SMS API key in authorization header');

  const parsedBody = JSON.parse(capturedOptions.body);
  assert(parsedBody.route === 'otp', 'Uses official route: otp');
  assert(parsedBody.variables_values === '849201', 'Passes OTP code in variables_values parameter');
  assert(parsedBody.numbers === '9876543210', 'Passes 10-digit national number in numbers parameter');

  // Verify response fields
  assert(successRes.providerAccepted === true, 'Reports providerAccepted: true on Fast2SMS return: true');
  assert(successRes.handsetDelivered === false, 'Distinguishes gateway acceptance from handset delivery (handsetDelivered is false)');
  assert(successRes.deliveryStatus === 'submitted_to_gateway', 'Reports deliveryStatus: submitted_to_gateway');
  assert(successRes.messageId === 'fast_req_mock_849201', 'Captures Fast2SMS request_id');
  assert(successRes.maskedPhone === '+91 ******3210', 'Returns masked phone number');
  assert(successRes.provider === 'fast2sms', 'Identifies provider as fast2sms');

  // --- Suite 3: Fast2SMS Quick SMS Route (Mocked) ---
  console.log('\n[Suite 3: Fast2SMS Quick SMS Route Support]');
  process.env.FAST2SMS_ROUTE = 'q';

  SmsService.setMockTransport(async (url, options) => {
    capturedOptions = options;
    return {
      ok: true,
      json: async () => ({
        return: true,
        request_id: 'fast_quick_mock_991',
        message: ['Message sent successfully'],
      }),
    };
  });

  const quickRes = await SmsService.sendOtpSms('9876543210', '112233');
  const quickBody = JSON.parse(capturedOptions.body);
  assert(quickBody.route === 'q', 'Uses route: q when FAST2SMS_ROUTE=q');
  assert(typeof quickBody.message === 'string' && quickBody.message.includes('112233'), 'Includes full message text on route: q');
  assert(quickRes.route === 'q', 'Result confirms route: q');
  assert(quickRes.providerAccepted === true, 'Quick SMS accepted successfully');

  // Restore route to otp
  process.env.FAST2SMS_ROUTE = 'otp';

  // --- Suite 4: Fast2SMS Error Categorization & Safe Handling ---
  console.log('\n[Suite 4: Fast2SMS Error Handling without False Success Reporting]');

  // 4a: Insufficient balance / transaction required (status 999)
  SmsService.setMockTransport(async () => ({
    ok: true,
    json: async () => ({
      status_code: 999,
      message: 'You need to complete one transaction of 100 INR or more before using API route.',
    }),
  }));

  const cat999 = categorizeFast2SmsError(999, 'You need to complete one transaction of 100 INR or more before using API route.');
  assert(cat999.code === 'INSUFFICIENT_CREDITS', 'Categorizes 999 as INSUFFICIENT_CREDITS');

  await nodeAssert.rejects(
    SmsService.sendOtpSms('9876543210', '554433'),
    (error) => error.code === 'INSUFFICIENT_CREDITS' && error.status === 502
  );
  assert(true, 'Rejects insufficient credits without reporting or simulating delivery');

  // 4b: Invalid API key (status 411)
  SmsService.setMockTransport(async () => ({
    ok: true,
    json: async () => ({
      return: false,
      status_code: 411,
      message: 'Invalid authorization key',
    }),
  }));

  const cat411 = categorizeFast2SmsError(411, 'Invalid authorization key');
  assert(cat411.code === 'INVALID_API_KEY', 'Categorizes 411 as INVALID_API_KEY');

  await nodeAssert.rejects(
    SmsService.sendOtpSms('9876543210', '554433'),
    (error) => error.code === 'INVALID_API_KEY' && error.status === 502
  );
  assert(true, 'Rejects an invalid API key without reporting delivery');

  // 4c: Unverified OTP route (website verification required)
  SmsService.setMockTransport(async () => ({
    ok: true,
    json: async () => ({
      message: 'Before using OTP Message API, complete website verification. Visit OTP Message menu or use DLT SMS API.',
    }),
  }));

  const catUnverified = categorizeFast2SmsError(null, 'Before using OTP Message API, complete website verification. Visit OTP Message menu or use DLT SMS API.');
  assert(catUnverified.code === 'UNVERIFIED_OTP_ROUTE', 'Categorizes unverified website as UNVERIFIED_OTP_ROUTE');

  await nodeAssert.rejects(
    SmsService.sendOtpSms('9876543210', '554433'),
    (error) => error.code === 'UNVERIFIED_OTP_ROUTE' && error.status === 502
  );
  assert(true, 'Rejects an unverified OTP route without reporting delivery');

  // 4d: Rate limit exceeded (status 429)
  SmsService.setMockTransport(async () => ({
    ok: true,
    json: async () => ({
      return: false,
      status_code: 429,
      message: 'Too many requests. Rate limit exceeded.',
    }),
  }));

  const catRate = categorizeFast2SmsError(429, 'Too many requests');
  assert(catRate.code === 'RATE_LIMIT_EXCEEDED', 'Categorizes 429 as RATE_LIMIT_EXCEEDED');

  await nodeAssert.rejects(
    SmsService.sendOtpSms('9876543210', '554433'),
    (error) => error.code === 'RATE_LIMIT_EXCEEDED' && error.status === 502
  );
  assert(true, 'Rejects provider rate limiting without reporting delivery');

  // 4e: Network failure / Timeout
  SmsService.setMockTransport(async () => {
    throw new Error('fetch failed: connect ECONNREFUSED 104.26.10.150:443');
  });

  await nodeAssert.rejects(
    SmsService.sendOtpSms('9876543210', '554433'),
    (error) => error.code === 'NETWORK_ERROR' && error.status === 502
  );
  assert(true, 'Surfaces provider network failure without a success-shaped result');

  // --- Suite 5: Unconfigured Gateway ---
  console.log('\n[Suite 5: Honest Failure when Gateway is Unconfigured]');
  
  delete process.env.FAST2SMS_API_KEY;
  SmsService.resetMockTransport();

  const unconfiguredStatus = SmsService.isConfigured();
  assert(unconfiguredStatus.hasFast2Sms === false, 'Correctly reports hasFast2Sms: false when key is absent');
  assert(unconfiguredStatus.hasRealGateway === false, 'Reports hasRealGateway: false when no real gateway is set');

  await nodeAssert.rejects(
    SmsService.sendOtpSms('9876543210', '998877'),
    (error) => error.code === 'SMS_PROVIDER_NOT_CONFIGURED' && error.status === 503
  );
  assert(true, 'Missing provider configuration fails without a demo OTP');

  // Restore environment key
  process.env.FAST2SMS_API_KEY = 'isolated-test-only-key';

  // --- Suite 6: Isolation & Independence of Email and SMS Delivery ---
  console.log('\n[Suite 6: Independence of Email and Phone OTP Delivery]');

  const testUserEmail = `isolated.${Date.now()}@example.test`;
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@example.test').toLowerCase().trim();
  const senderEmail = (process.env.SMTP_USER || 'sender@example.test').toLowerCase().trim();

  // Email OTP dispatch to exact entered address
  const emailRes = await EmailService.sendOtpEmail(testUserEmail, '654321', 'Audit Citizen');
  assert(emailRes.recipient === testUserEmail, `Email OTP recipient is strictly the user destination (${testUserEmail})`);
  assert(emailRes.recipient !== adminEmail, `Email OTP is not sent to admin (${adminEmail})`);
  assert(emailRes.recipient !== senderEmail, `Email OTP is not sent to sender address (${senderEmail})`);

  // Admin advocate notification dispatch
  const adminNotice = await EmailService.sendAdvocateApplicationNotification(adminEmail, {
    applicationId: `app_${Date.now()}`,
    name: 'Isolated Fast2SMS Test',
    email: testUserEmail,
    phone: '+919876543210',
    barNumber: 'KAR/2022/9081',
  });
  assert(adminNotice.targetEmail === adminEmail, `Admin notification strictly targets ADMIN_EMAIL (${adminEmail})`);

  // --- Suite 7: OTP Security, Hashing, Expiry & Single-Use Enforcement ---
  console.log('\n[Suite 7: OTP Cryptographic Hashing, Cooldown & Security Invariants]');

  const plainOtp = '739102';
  const hashed = hashOtp(plainOtp);
  assert(hashed !== plainOtp, 'OTP is cryptographically transformed (never plain text)');
  assert(typeof hashed === 'string' && hashed.length === 64, 'OTP hash is 64-char SHA-256 hex string');
  assert(verifyOtpHash(plainOtp, hashed) === true, 'Constant-time verification matches correct OTP');
  assert(verifyOtpHash('000000', hashed) === false, 'Constant-time verification rejects incorrect OTP');

  // Phone session single-use check
  const phoneKey = '9876543210';
  const expiry = new Date(Date.now() + 5 * 60 * 1000);
  UserModel.setPhoneOtp(phoneKey, plainOtp, expiry);

  const verifySuccess = UserModel.verifyPhoneOtp(phoneKey, plainOtp);
  assert(verifySuccess.valid === true, 'Initial phone OTP verification succeeds');

  const replayAttempt = UserModel.verifyPhoneOtp(phoneKey, plainOtp);
  assert(replayAttempt.valid === false, 'Replayed phone OTP rejected (single-use enforcement)');

  // Summary
  console.log('\n========================================================================');
  console.log(`FAST2SMS TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runFast2SmsTests().catch((err) => {
  console.error('Fatal Fast2SMS test error:', err);
  process.exit(1);
});
import './helpers/safeTestEnvironment.js';

import './helpers/safeTestEnvironment.js';
import assert from 'node:assert';
import AuthService from '../src/services/authService.js';
import UserModel from '../src/models/userModel.js';
import { parseAndValidatePhone } from '../src/services/smsService.js';
import { requireVerifiedEmail } from '../src/middleware/authMiddleware.js';

console.log('================================================================');
console.log('VidhiSetu — Phase 3: Auth & Verification Test Suite');
console.log('================================================================');

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  [PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${desc}: ${err.message}`);
    failed++;
  }
}

async function itAsync(desc, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${desc}: ${err.message}`);
    failed++;
  }
}

// 1. Phone number validation (Indian format)
it('Validates standard 10-digit Indian mobile numbers starting with 6, 7, 8, 9', () => {
  const p1 = parseAndValidatePhone('9876543210');
  assert.strictEqual(p1.valid, true);
  assert.strictEqual(p1.e164, '+919876543210');

  const p2 = parseAndValidatePhone('+918123456789');
  assert.strictEqual(p2.valid, true);
  assert.strictEqual(p2.e164, '+918123456789');
});

it('Rejects invalid phone numbers (wrong length or starting digit)', () => {
  const bad1 = parseAndValidatePhone('1234567890'); // starts with 1
  assert.strictEqual(bad1.valid, false);

  const bad2 = parseAndValidatePhone('98765'); // too short
  assert.strictEqual(bad2.valid, false);
});

// 2. User registration and single-use verification token
await itAsync('Generates single-use verification token and stores user as unverified', async () => {
  const email = `test.p3.${Date.now()}@example.com`;
  const regResult = await AuthService.register({
    name: 'Ananya Deshmukh',
    email,
    phone: '9876543210',
    password: 'SecurePassword123!',
    accountType: 'candidate',
  });

  assert.strictEqual(regResult.success, true);
  assert.ok(regResult.verificationToken, 'Should return verificationToken in non-production');

  const user = await UserModel.findByEmail(email);
  assert.strictEqual(user.email_verified, false, 'User must initially be unverified');

  // Verify using the single-use token
  const verifyRes = await AuthService.verifyEmail(email, null, regResult.verificationToken);
  assert.strictEqual(verifyRes.success, true);
  assert.ok(verifyRes.token, 'Should return authenticated JWT token');
  assert.strictEqual(verifyRes.user.emailVerified, true);

  // Attempt to RE-USE the same single-use token -> MUST FAIL
  let reusedFailed = false;
  try {
    await AuthService.verifyEmail(email, null, regResult.verificationToken);
  } catch (err) {
    reusedFailed = true;
  }
  assert.strictEqual(reusedFailed, true, 'Single-use token must not be reusable');
});

// 3. Resend verification rate limiting (60s cooldown)
await itAsync('Enforces 60-second cooldown on resend verification', async () => {
  const email = `test.cooldown.${Date.now()}@example.com`;
  await AuthService.register({
    name: 'Rohan Joshi',
    email,
    phone: '9876543211',
    password: 'SecurePassword123!',
  });

  // First resend might succeed or trigger cooldown depending on register time
  UserModel.setCooldown(email); // simulate immediate request
  let cooldownTriggered = false;
  try {
    await AuthService.resendOtp(email, 'email');
  } catch (err) {
    if (err.status === 429) {
      cooldownTriggered = true;
    }
  }
  assert.strictEqual(cooldownTriggered, true, 'Expected 429 rate limit cooldown error');
});

// 4. Mobile OTP login & arbitrary code rejection
await itAsync('Strictly rejects arbitrary OTP codes like 123456 or 000000', async () => {
  const testPhone = '9988776655';
  await AuthService.sendOtp({ phone: testPhone });

  let rejected = false;
  try {
    await AuthService.verifyOtp({ phone: testPhone, otp: '123456' });
  } catch (err) {
    rejected = true;
  }
  assert.strictEqual(rejected, true, 'Arbitrary code 123456 must be rejected');
});

// 5. RequireVerifiedEmail middleware guard
it('requireVerifiedEmail middleware blocks unverified email users with EMAIL_NOT_VERIFIED', () => {
  const req = {
    user: { id: 'usr_unverified', email: 'unverified@example.com', emailVerified: false },
  };
  let statusCode = null;
  let responseData = null;
  const res = {
    status(code) {
      statusCode = code;
      return {
        json(data) {
          responseData = data;
        },
      };
    },
  };
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  requireVerifiedEmail(req, res, next);
  assert.strictEqual(nextCalled, false, 'Next must not be called for unverified email');
  assert.strictEqual(statusCode, 403);
  assert.strictEqual(responseData.code, 'EMAIL_NOT_VERIFIED');

  // Now verify verified user passes
  req.user.emailVerified = true;
  requireVerifiedEmail(req, res, next);
  assert.strictEqual(nextCalled, true, 'Next must be called for verified user');
});

// 6. Google Auth rejection on unverified Google email
await itAsync('Rejects unverified Google account email during Google authentication', async () => {
  // Construct a mock payload with email_verified: false
  const unverifiedHeader = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64');
  const unverifiedPayload = Buffer.from(JSON.stringify({
    sub: 'google_12345',
    email: 'unverified.google@example.com',
    name: 'Unverified Google User',
    email_verified: false,
  })).toString('base64');
  const mockToken = `${unverifiedHeader}.${unverifiedPayload}.`;

  let unverifiedBlocked = false;
  try {
    await AuthService.googleAuth({ credential: mockToken });
  } catch (err) {
    if (err.code === 'EMAIL_NOT_VERIFIED' || err.status === 403) {
      unverifiedBlocked = true;
    }
  }
  assert.strictEqual(unverifiedBlocked, true, 'Unverified Google email must be rejected');
});

console.log('================================================================');
console.log(`Phase 3 Test Summary: ${passed} Passed | ${failed} Failed`);
console.log('================================================================');
if (failed > 0) process.exit(1);
import './helpers/safeTestEnvironment.js';

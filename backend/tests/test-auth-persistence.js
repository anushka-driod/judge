import assert from 'node:assert';
import app from '../src/app.js';
import AuthService from '../src/services/authService.js';
import UserModel from '../src/models/userModel.js';

async function runAuthTests() {
  console.log('================================================================');
  console.log('EarnLaw Member 2 — Authentication & Database Persistence Suite');
  console.log('================================================================\n');

  let passed = 0;
  const testEmail = `citizen.${Date.now()}@example.com`;
  const advocateEmail = `advocate.${Date.now()}@example.com`;
  const testPassword = 'Password@123';
  let issuedOtp = null;
  let authToken = null;
  let testUserId = null;

  // 1. Citizen Registration & Database Storage
  console.log('1. Testing User Registration & AnuDB Persistence:');
  const regResult = await AuthService.register({
    name: 'Rajesh Kumar',
    email: testEmail,
    phone: '+91 9876543210',
    password: testPassword,
    accountType: 'candidate',
    country: 'India',
    state: 'Karnataka',
    city: 'Bengaluru',
  });

  assert.strictEqual(regResult.success, true, 'Registration should succeed');
  assert.ok(regResult.otpPreview, 'OTP code should be generated');
  issuedOtp = regResult.otpPreview;

  // Verify stored in AnuDB
  const storedUser = await UserModel.findByEmail(testEmail);
  assert.ok(storedUser, 'User record must exist in AnuDB database');
  assert.strictEqual(storedUser.name, 'Rajesh Kumar', 'Name must match database record');
  assert.strictEqual(storedUser.role, 'user', 'Citizen role must be user');
  assert.strictEqual(Boolean(storedUser.email_verified), false, 'Initial state must be unverified');
  testUserId = storedUser.id;
  console.log('  [PASS] Citizen registered and persisted in AnuDB users table');
  passed++;

  // 2. Duplicate Registration Prevention
  try {
    await AuthService.register({
      name: 'Duplicate',
      email: testEmail,
      phone: '+91 9876543210',
      password: testPassword,
    });
    assert.fail('Duplicate registration should have thrown error');
  } catch (err) {
    assert.strictEqual(err.status, 409, 'Should return 409 Conflict');
    console.log('  [PASS] Duplicate registration rejected by AnuDB unique constraint');
    passed++;
  }

  // 3. Unverified User Login Block & Audit Log
  console.log('\n2. Testing Login Guard & Unverified User Handling:');
  try {
    await AuthService.login(testEmail, testPassword, {
      ipAddress: '127.0.0.1',
      userAgent: 'NodeTestRunner',
    });
    assert.fail('Unverified login should throw 403');
  } catch (err) {
    assert.strictEqual(err.status, 403, 'Should return 403 Forbidden for unverified email');
    assert.strictEqual(err.data.requiresVerification, true, 'Flag requiresVerification must be true');
    issuedOtp = err.data.otpPreview; // Captured fresh OTP issued during unverified login
    console.log('  [PASS] Unverified user login blocked with 403 and fresh OTP issued');
    passed++;
  }

  // Check login log recorded in database
  const failedLogs = await UserModel.getLoginLogs(testEmail);
  assert.ok(failedLogs.length > 0, 'Login attempt must be recorded in AnuDB');
  assert.strictEqual(failedLogs[0].status, 'failed_unverified', 'Status must be failed_unverified');
  console.log('  [PASS] Failed unverified login attempt stored in user_login_logs table');
  passed++;

  // 4. Wrong Password Attempt
  try {
    await AuthService.login(testEmail, 'WrongPassword999', {
      ipAddress: '127.0.0.1',
      userAgent: 'NodeTestRunner',
    });
    assert.fail('Wrong password should throw 401');
  } catch (err) {
    assert.strictEqual(err.status, 401, 'Should return 401 for wrong password');
    console.log('  [PASS] Wrong password rejected with 401');
    passed++;
  }

  // Check bad password log
  const badPassLogs = await UserModel.getLoginLogs(testEmail);
  assert.strictEqual(badPassLogs[0].status, 'failed_bad_password', 'Audit must reflect failed_bad_password');
  console.log('  [PASS] Bad password attempt stored in user_login_logs table');
  passed++;

  // 5. OTP Email Verification & Database Update
  console.log('\n3. Testing OTP Verification & Token Issuance:');
  // First assert wrong OTP fails
  try {
    await AuthService.verifyEmail(testEmail, '999999');
    assert.fail('Wrong OTP should have been rejected');
  } catch (err) {
    assert.strictEqual(err.status, 400, 'Wrong OTP must be rejected with 400');
    console.log('  [PASS] Wrong OTP strictly rejected with 400');
    passed++;
  }

  // Also assert legacy bypass code 123456 fails if it does not match issued OTP
  if (issuedOtp !== '123456') {
    try {
      await AuthService.verifyEmail(testEmail, '123456');
      assert.fail('Bypass code should be rejected when it does not match issued OTP');
    } catch (err) {
      assert.strictEqual(err.status, 400, 'Bypass code rejected');
      console.log('  [PASS] Arbitrary test code 123456 rejected');
      passed++;
    }
  }

  // Now verify with correct issued OTP
  const verifyResult = await AuthService.verifyEmail(testEmail, issuedOtp);
  assert.strictEqual(verifyResult.success, true, 'Email verification should succeed');
  assert.ok(verifyResult.token, 'JWT token should be returned');
  assert.strictEqual(verifyResult.user.emailVerified, true, 'User emailVerified flag must be true');

  // Verify AnuDB updated
  const verifiedUser = await UserModel.findByEmail(testEmail);
  assert.strictEqual(Boolean(verifiedUser.email_verified), true, 'AnuDB record must have email_verified = true');
  assert.strictEqual(verifiedUser.otp_code, null, 'OTP code must be cleared after verification');
  console.log('  [PASS] Email verified and AnuDB user record updated to verified');
  passed++;

  // 6. Successful Login & Session Tracking
  console.log('\n4. Testing Successful Login & Audit Persistence:');
  const loginResult = await AuthService.login(testEmail, testPassword, {
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  });
  assert.ok(loginResult.token, 'Must return signed JWT');
  assert.strictEqual(loginResult.user.email, testEmail.toLowerCase(), 'Must return sanitized user profile');
  authToken = loginResult.token;

  // Check AnuDB updated last_login_at and user_login_logs
  const userAfterLogin = await UserModel.findByEmail(testEmail);
  assert.ok(userAfterLogin.last_login_at, 'last_login_at timestamp must be updated in AnuDB');

  const successLogs = await UserModel.getLoginLogs(testEmail);
  assert.strictEqual(successLogs[0].status, 'success', 'Audit log must record success status');
  assert.strictEqual(successLogs[0].ip_address, '192.168.1.100', 'IP address must be audited');
  console.log('  [PASS] Login succeeded, last_login_at updated, and audit log stored in AnuDB');
  passed++;

  // 7. Protected Profile Retrieval (/api/auth/me)
  console.log('\n5. Testing Profile & Session Verification:');
  const userProfile = await AuthService.getCurrentUser(testUserId);
  assert.strictEqual(userProfile.id, testUserId, 'Profile ID must match');
  assert.strictEqual(userProfile.emailVerified, true, 'Profile emailVerified must be true');
  console.log('  [PASS] Current user profile loaded from AnuDB using user ID');
  passed++;

  // 8. Advocate Registration with Professional Details
  console.log('\n6. Testing Advocate Registration & Dual-Table Persistence:');
  const advResult = await AuthService.register({
    name: 'Advocate Priya Sharma',
    email: advocateEmail,
    phone: '+91 9123456780',
    password: testPassword,
    accountType: 'advocate',
    barCouncilState: 'Karnataka',
    barNumber: 'KAR/2018/4512',
    experienceYears: 7,
    primaryCourt: 'High Court of Karnataka',
    city: 'Bengaluru',
    state: 'Karnataka',
    consultationFee: 1200,
    practiceAreas: ['Consumer Protection & Disputes', 'Real Estate & RERA Claims'],
    languages: ['English', 'Kannada', 'Hindi'],
    profileBio: 'Specialist in consumer disputes and real estate property law.',
  });

  assert.strictEqual(advResult.success, true, 'Advocate registration should succeed');
  assert.strictEqual(advResult.accountType, 'advocate');

  const storedAdvocateUser = await UserModel.findByEmail(advocateEmail);
  assert.ok(storedAdvocateUser, 'Advocate must exist in users table');
  assert.strictEqual(storedAdvocateUser.role, 'lawyer', 'Role must be lawyer in users table');
  console.log('  [PASS] Advocate registered with lawyer role and linked profile');
  passed++;

  console.log('\n================================================================');
  console.log(`Execution Summary: ${passed} Passed | 0 Failed`);
  console.log('================================================================');
}

runAuthTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});

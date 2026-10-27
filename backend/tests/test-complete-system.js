import './helpers/safeTestEnvironment.js';
// Node.js 18+ includes global fetch natively
process.env.NODE_ENV = 'test';
process.env.MOCK_EMAIL = 'true';
process.env.MOCK_SMS = 'true';
import dotenv from 'dotenv';
dotenv.config();

import EmailService, { isRealUsableEmail } from '../src/services/emailService.js';
import SmsService from '../src/services/smsService.js';
import UserModel from '../src/models/userModel.js';
import AuthService from '../src/services/authService.js';
import LawyerPortalService from '../src/services/lawyerPortalService.js';

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

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

async function runTests() {
  console.log('\n========================================================================');
  console.log('   VIDHISETU COMPLETE SYSTEM TEST SUITE: OTP, EMAIL, DIRECTORY & SECURITY');
  console.log('========================================================================\n');

  // Test 1: Healthcheck
  console.log('[Suite 1: Server Startup & Health]');
  try {
    const healthRes = await fetch(`${BASE_URL}/health`);
    const health = await healthRes.json();
    assert(health.status === 'online', 'Server healthcheck returns online status');
  } catch (err) {
    assert(false, 'Server healthcheck reachable', err.message);
  }

  // Test 2: Mandatory OTP Destination Rule (Email OTP isolation)
  console.log('\n[Suite 2: Mandatory OTP Destination Isolation]');
  const testUserEmail = `anushkareddy1208+citizen${Date.now()}@gmail.com`;
  const senderEmail = (process.env.SMTP_USER || 'anushkareddy1208@gmail.com').toLowerCase().trim();
  const adminEmail = (process.env.ADMIN_EMAIL || 'adminvidhisetu@gmail.com').toLowerCase().trim();

  // Test EmailService directly with controlled recipient
  const mockOtp = '849201';
  const emailDispatchRes = await EmailService.sendOtpEmail(testUserEmail, mockOtp, 'Test Citizen');
  assert(emailDispatchRes.recipient === testUserEmail, `Email OTP recipient is strictly the user destination (${testUserEmail})`);
  assert(emailDispatchRes.recipient !== senderEmail, `Email OTP recipient is NOT the sender address (${senderEmail})`);
  assert(emailDispatchRes.recipient !== adminEmail, `Email OTP recipient is NOT the administrator address (${adminEmail})`);

  // Test 3: Registration with User Destination
  console.log('\n[Suite 3: Citizen Registration & Backend OTP Generation]');
  const userRegPayload = {
    name: 'Ananya Sharma',
    email: testUserEmail,
    phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: 'Password@123',
    accountType: 'candidate',
    city: 'Bengaluru',
    state: 'Karnataka',
  };

  let regResult = null;
  try {
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userRegPayload),
    });
    regResult = await regRes.json();
    assert(regRes.status === 201, 'User registration succeeds with status 201');
    assert(regResult.email === testUserEmail, 'Registration response identifies user destination email');
    assert(regResult.maskedEmail && regResult.maskedEmail.startsWith('a'), 'Masked email formats user destination safely');
  } catch (err) {
    assert(false, 'User registration request succeeds', err.message);
  }

  // Test 4: OTP Security & Verification Constraints
  console.log('\n[Suite 4: OTP Expiry, Attempts Limit, and Revocation]');
  // 4a. Wrong OTP
  try {
    const wrongRes = await fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserEmail, otp: '000000' }),
    });
    const wrongData = await wrongRes.json();
    assert(wrongRes.status === 400, 'Invalid OTP rejected with status 400');
    assert(wrongData.remainingAttempts !== undefined, 'Returns remaining attempts count');
  } catch (err) {
    assert(false, 'Wrong OTP rejected gracefully', err.message);
  }

  // 4b. Resend Cooldown
  try {
    const resendRes = await fetch(`${BASE_URL}/api/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserEmail }),
    });
    const resendData = await resendRes.json();
    assert(resendRes.status === 429, 'Immediate resend rejected by 60s cooldown (status 429)', resendData.error);
  } catch (err) {
    assert(false, 'Resend cooldown enforced', err.message);
  }

  // Test 5: Fast2SMS / Phone OTP Demo Mode Labeling
  console.log('\n[Suite 5: Phone OTP Demo Mode & Non-Fabrication]');
  const smsStatus = SmsService.isConfigured();
  const testPhone = '+919876543210';
  const smsDispatch = await SmsService.sendOtpSms(testPhone, '654321');

  if (smsStatus.hasRealGateway) {
    if (smsDispatch.providerAccepted) {
      assert(smsDispatch.providerAccepted === true, 'Fast2SMS accepted SMS submission');
      assert(smsDispatch.handsetDelivered === false, 'Distinguishes provider acceptance from handset delivery');
    } else {
      assert(smsDispatch.isDemo === true, 'Fast2SMS with zero balance or provider error safely fell back to demo mode');
      assert(smsDispatch.provider === 'demo_simulation', 'Demo fallback provider is demo_simulation');
      assert(smsDispatch.delivered === false, 'Never reports delivered: true on demo fallback');
    }
  } else {
    assert(smsDispatch.delivered === false, 'Demo phone OTP never reports delivered: true when unconfigured');
    assert(smsDispatch.isDemo === true, 'Demo phone OTP explicitly flagged as isDemo: true');
    assert(smsDispatch.provider === 'demo_simulation', 'Demo phone OTP provider correctly labeled as demo_simulation');
  }

  // Test 6: Sign-In OTP Destination from Database (Not Client-Supplied)
  console.log('\n[Suite 6: Sign-In Authentication & Unverified Account Guard]');
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrPhone: testUserEmail, password: 'Password@123' }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 403, 'Unverified user sign-in blocked with status 403');
    assert(loginData.requiresVerification === true, 'Requires verification flag returned');
    assert(loginData.email === testUserEmail, 'Sign-in OTP routed to registered user contact from database');
  } catch (err) {
    assert(false, 'Sign-in unverified check succeeds', err.message);
  }

  // Test 7: Admin Advocate Application Notifications
  console.log('\n[Suite 7: Admin Advocate Application Notification Isolation]');
  const advocateEmail = `anushkareddy1208+advocate${Date.now()}@gmail.com`;
  const advocateData = {
    applicationId: `app_${Date.now()}`,
    name: 'Adv. Suresh Kulkarni',
    email: advocateEmail,
    phone: '+919812345678',
    barNumber: 'KAR/2015/7821',
    barCouncilState: 'Karnataka',
    experienceYears: '11',
    primaryCourt: 'High Court of Karnataka',
  };

  const adminNoticeRes = await EmailService.sendAdvocateApplicationNotification(adminEmail, advocateData);
  assert(adminNoticeRes.targetEmail === adminEmail, `Admin application alert routed strictly to admin recipient (${adminEmail})`);
  assert(adminNoticeRes.targetEmail !== advocateEmail, `Admin application alert is NOT sent to advocate email (${advocateEmail})`);
  assert(adminNoticeRes.targetEmail !== senderEmail, `Admin application alert is NOT sent to sender email (${senderEmail})`);

  // Test 8: Advocate Review Status Notification
  console.log('\n[Suite 8: Advocate Approval / Rejection Notification Isolation]');
  const statusUpdateRes = await EmailService.sendAdvocateStatusUpdateEmail(advocateEmail, {
    name: advocateData.name,
    status: 'VERIFIED',
    remarks: 'Credentials verified by Bar Council of Karnataka.',
  });
  assert(statusUpdateRes !== null, 'Advocate status update email executed');

  // Test 9: Real Lawyer Directory (No fake profiles, no fabricated ratings)
  console.log('\n[Suite 9: Real Lawyer Directory & Honest Data]');
  try {
    const lawyersRes = await fetch(`${BASE_URL}/api/lawyers`);
    const lawyersData = await lawyersRes.json();
    assert(lawyersRes.status === 200, 'GET /api/lawyers returns status 200');
    assert(Array.isArray(lawyersData.lawyers), 'Directory returns lawyers array');
    assert(lawyersData.lawyers.length > 0, 'Returns real approved advocates from database');

    for (const l of lawyersData.lawyers) {
      assert(l.verification_status === 'VERIFIED' || l.verification_status === 'ACTIVE', `Advocate ${l.name} is verified before listing`);
      assert(l.bar_registration_number || l.barCouncilId, `Advocate ${l.name} has verifiable Bar registration number`);
      assert(l.location_city && l.primary_court, `Advocate ${l.name} has city and court info`);
    }

    // Test Search Filter: Non-existent city must return honest empty state, NOT fake lawyers
    const searchRes = await fetch(`${BASE_URL}/api/lawyers?city=NonExistentCityXYZ`);
    const searchData = await searchRes.json();
    assert(searchData.lawyers && searchData.lawyers.length === 0, 'Unmatched search returns honest empty array with 0 results (no fabricated profiles)');
  } catch (err) {
    assert(false, 'Lawyer directory integrity check succeeds', err.message);
  }

  // Test 10: Document Upload Security
  console.log('\n[Suite 10: Document Upload Security & MIME Validation]');
  try {
    // 10a. Valid upload
    const validUploadRes = await fetch(`${BASE_URL}/api/uploads/document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: 'Bar_Council_Certificate.pdf',
        filetype: 'application/pdf',
        base64Data: Buffer.from('%PDF-1.4 Mock Bar Council Certificate Content').toString('base64'),
        documentType: 'Bar Enrollment Certificate',
      }),
    });
    const validUploadData = await validUploadRes.json();
    assert(validUploadRes.status === 201, 'Valid PDF document upload accepted with 201');
    assert(validUploadData.document.sizeFormatted !== undefined, 'Returns formatted file size');

    // 10b. Invalid extension rejected
    const invalidExtRes = await fetch(`${BASE_URL}/api/uploads/document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: 'malicious_script.exe',
        filetype: 'application/x-msdownload',
        base64Data: Buffer.from('malicious payload').toString('base64'),
        documentType: 'Executable',
      }),
    });
    assert(invalidExtRes.status === 400, 'Executable file upload rejected with 400 error');
  } catch (err) {
    assert(false, 'Document upload validation succeeds', err.message);
  }

  // Test 11: Real Email Recipient Validation, Placeholder Rejection, and Recipient Safety
  console.log('\n[Suite 11: Email Recipient Validation, Placeholder Rejection & Distinct Delivery Reporting]');

  // 11a: Verification of real usable emails
  const validAdmin = isRealUsableEmail('adminvidhisetu@gmail.com');
  assert(validAdmin.valid === true, 'Valid admin email is recognized as real and usable');

  const validSender = isRealUsableEmail('anushkareddy1208@gmail.com');
  assert(validSender.valid === true, 'Valid sender email is recognized as real and usable');

  const validCitizen = isRealUsableEmail('citizen.real.user@gmail.com');
  assert(validCitizen.valid === true, 'Real citizen Gmail address is recognized as usable');

  // 11b: Strict rejection of placeholder addresses from Gmail bounce evidence
  const bounceAdv = isRealUsableEmail('adv.verification.1793012085485@vidhisetu.test');
  assert(bounceAdv.valid === false, 'Evidence address adv.verification.*@vidhisetu.test is rejected before dispatch');

  const bounceCitizen = isRealUsableEmail('other_citizen_1793012007421@vidhisetu.in');
  assert(bounceCitizen.valid === false, 'Evidence address other_citizen_*@vidhisetu.in is rejected before dispatch');

  const testTld = isRealUsableEmail('lawyer@portal.invalid');
  assert(testTld.valid === false, 'Reserved .invalid TLD is rejected before dispatch');

  const disposableEmail = isRealUsableEmail('temp_user@mailinator.com');
  assert(disposableEmail.valid === false, 'Disposable email domain mailinator.com is rejected');

  const placeholderPrefix = isRealUsableEmail('citizen_test_99210@realdomain.org');
  assert(placeholderPrefix.valid === false, 'Synthetic placeholder prefix citizen_test_* is rejected');

  // 11c: Missing / empty / null recipient fails safely
  const nullCheck = isRealUsableEmail(null);
  assert(nullCheck.valid === false, 'Null email fails validation safely');

  const emptyCheck = isRealUsableEmail('');
  assert(emptyCheck.valid === false, 'Empty email fails validation safely');

  // 11d: EmailService stops dispatch and returns deliveryStatus: blocked_placeholder_domain without calling Nodemailer
  const blockedOtpRes = await EmailService.sendOtpEmail('adv.verification.1793012085485@vidhisetu.test', '123456', 'Advocate');
  assert(blockedOtpRes.delivered === false, 'EmailService.sendOtpEmail reports delivered: false for placeholder recipient');
  assert(blockedOtpRes.smtpAccepted === false, 'EmailService.sendOtpEmail reports smtpAccepted: false for placeholder recipient');
  assert(blockedOtpRes.deliveryStatus === 'blocked_placeholder_domain', 'EmailService.sendOtpEmail reports deliveryStatus: blocked_placeholder_domain');
  assert(blockedOtpRes.provider === 'blocked_placeholder', 'Nodemailer SMTP dispatch was NOT called (blocked before relay)');

  const blockedVerificationRes = await EmailService.sendVerificationEmail('other_citizen_1793012007421@vidhisetu.in', {
    token: 'tok_test',
    otpCode: '654321',
  });
  assert(blockedVerificationRes.delivered === false, 'EmailService.sendVerificationEmail reports delivered: false for vidhisetu.in');
  assert(blockedVerificationRes.deliveryStatus === 'blocked_placeholder_domain', 'EmailService.sendVerificationEmail reports blocked_placeholder_domain');

  // 11e: Missing/Null recipient in EmailService fails safely
  const nullOtpRes = await EmailService.sendOtpEmail(null, '123456');
  assert(nullOtpRes.delivered === false && nullOtpRes.status === 'failed', 'EmailService handles null recipient gracefully');

  // 11f: Distinction between SMTP relay acceptance and actual recipient delivery
  assert('smtpAccepted' in blockedOtpRes && 'delivered' in blockedOtpRes, 'Email dispatch result provides distinct smtpAccepted and delivered properties');

  // Summary
  console.log('\n========================================================================');
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
import './helpers/safeTestEnvironment.js';

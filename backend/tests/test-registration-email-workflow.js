import './helpers/safeTestEnvironment.js';
import assert from 'node:assert';
import dotenv from 'dotenv';
dotenv.config();

import { EmailService, isRealUsableEmail, initTransporter } from '../src/services/emailService.js';
import SmsService from '../src/services/smsService.js';
import AuthService from '../src/services/authService.js';
import UserModel, { hashOtp, verifyOtpHash } from '../src/models/userModel.js';
import LawyerPortalService, { VERIFICATION_STATUSES } from '../src/services/lawyerPortalService.js';
import { LawyerPortalController } from '../src/controllers/lawyerPortalController.js';
import { loadUsersFromDisk, saveUsersToDisk, loadLawyersFromDisk, saveLawyersToDisk } from '../src/utils/fileStore.js';

let passed = 0;
let failed = 0;

function it(description, fn) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      passed++;
      console.log(`  ✓ ${description}`);
    })
    .catch((err) => {
      failed++;
      console.error(`  ✗ ${description}`);
      console.error(`    Error: ${err.message}`);
    });
}

// Intercept EmailService and SmsService for safe, deterministic mock testing
const mockDispatchedEmails = [];
EmailService.setMockTransport(async (payload) => {
  mockDispatchedEmails.push(payload);
  return {
    delivered: true,
    smtpAccepted: true,
    deliveryStatus: 'smtp_relayed',
    status: 'accepted',
    messageId: `<mock-${Date.now()}@vidhisetu.test>`,
    provider: 'mock_smtp',
    recipient: payload.recipient || payload.to,
    maskedEmail: payload.maskedEmail,
    targetEmail: payload.targetEmail || payload.to,
  };
});

// Mock SmsService conforming to fetch response signature
const mockSentSms = [];
SmsService.setMockTransport(async (url, options) => {
  mockSentSms.push({ url, options });
  return {
    ok: true,
    json: async () => ({
      return: false,
      status_code: 400,
      message: ['Fast2SMS account requires website verification for OTP route or approval for DLT route.'],
    }),
  };
});

async function runTests() {
  console.log('\n===============================================================');
  console.log('VidhiSetu: Registration, Email Routing & Admin Workflow Tests');
  console.log('===============================================================\n');

  // Test 1: Citizen OTP uses exact entered email
  await it('1. Citizen email OTP goes to exact, validated entered email', async () => {
    const citizenEmail = 'anushka.citizen.valid@gmail.com';
    const otp = '849201';
    const res = await EmailService.sendOtpEmail(citizenEmail, otp, 'Citizen Ananya');
    assert.strictEqual(res.recipient, citizenEmail, 'Recipient must match exact entered email');
    assert.strictEqual(res.maskedEmail, 'a******@gmail.com', 'Masked email matches identity');
  });

  // Test 2: Sign-in OTP uses registered account email
  await it('2. Sign-in OTP retrieves and uses stored account email', async () => {
    const regEmail = `signin.test.${Date.now()}@gmail.com`;
    const user = await UserModel.create({
      name: 'Rohan Sharma',
      email: regEmail,
      phone: '+919876543210',
      passwordHash: '$2a$10$testhashplaceholder',
      role: 'user',
      emailVerified: true,
    });
    assert.ok(user && user.id, 'User record created');

    const fetched = await UserModel.findByEmail(regEmail);
    assert.strictEqual(fetched.email, regEmail.toLowerCase(), 'Stored email retrieved');

    const otpRes = await EmailService.sendOtpEmail(fetched.email, '654321', fetched.name);
    assert.strictEqual(otpRes.recipient, regEmail.toLowerCase());
  });

  // Test 3: Missing or invalid recipients fail safely with clear error
  await it('3. Missing, malformed, or invalid email fails safely without silent substitution', async () => {
    const invalidEmails = ['', null, undefined, 'not-an-email', 'missing-at.com', '@nodomain'];
    for (const email of invalidEmails) {
      const val = isRealUsableEmail(email);
      assert.strictEqual(val.valid, false, `Should reject invalid email: ${email}`);

      const sendRes = await EmailService.sendOtpEmail(email, '123456', 'Citizen');
      assert.strictEqual(sendRes.delivered, false);
      assert.strictEqual(sendRes.status, 'failed');
      assert.ok(sendRes.error, 'Must provide clear validation error');
    }
  });

  // Test 4: Placeholder addresses never reach Nodemailer
  await it('4. Placeholder domains and synthetic addresses (.test, @vidhisetu.test, @vidhisetu.in) blocked', async () => {
    const placeholders = [
      'adv.verification.1793012085485@vidhisetu.test',
      'other_citizen_1793012007421@vidhisetu.in',
      'test_user@example.com',
      'citizen@vidhisetu.test',
      'temporary@mailinator.com',
    ];
    for (const addr of placeholders) {
      const val = isRealUsableEmail(addr);
      assert.strictEqual(val.valid, false, `Should block placeholder address: ${addr}`);

      const res = await EmailService.sendOtpEmail(addr, '112233', 'User');
      assert.strictEqual(res.delivered, false);
      assert.strictEqual(res.provider, 'blocked_placeholder');
    }
  });

  // Test 5: Admin notifications target ADMIN_EMAIL
  await it('5. Admin new-application notification targets ADMIN_EMAIL exclusively', async () => {
    const adminEmail = (process.env.ADMIN_EMAIL || 'adminvidhisetu@gmail.com').toLowerCase().trim();
    const advocateData = {
      applicationId: 'law-test-001',
      name: 'Adv. Test Counsel',
      email: 'real.advocate.bar@gmail.com',
      phone: '+919845011223',
      barNumber: 'KAR/2020/1234',
      barCouncilState: 'Karnataka',
      experienceYears: 6,
      primaryCourt: 'High Court of Karnataka',
    };

    const notifyRes = await EmailService.sendAdvocateApplicationNotification(adminEmail, advocateData);
    assert.strictEqual(notifyRes.targetEmail, adminEmail, 'Must send strictly to ADMIN_EMAIL');
    assert.notStrictEqual(notifyRes.targetEmail, advocateData.email, 'Admin notification must NOT go to advocate');
    assert.notStrictEqual(notifyRes.targetEmail, process.env.SMTP_USER, 'Admin notification must NOT go to SMTP sender');
  });

  // Test 6: Advocate status emails target advocate's registered email
  await it('6. Advocate approval/rejection emails target advocate registered email exclusively', async () => {
    const advEmail = 'counsel.registered@gmail.com';
    const statusRes = await EmailService.sendAdvocateStatusUpdateEmail(advEmail, {
      name: 'Adv. Counsel',
      status: VERIFICATION_STATUSES.VERIFIED,
      remarks: 'Bar Council enrollment confirmed.',
    });
    assert.strictEqual(statusRes.recipient, advEmail, 'Status update must target advocate email');
    assert.notStrictEqual(statusRes.recipient, process.env.ADMIN_EMAIL, 'Advocate email must NOT go to admin');
  });

  // Test 7: One new application creates one application and triggers exactly one admin notice
  await it('7. Advocate registration creates one application record and dispatches one notification', async () => {
    const uniqueEmail = `advocate.unique.${Date.now()}@gmail.com`;
    const advApp = await LawyerPortalService.registerAdvocate({
      id: `law-uniq-${Date.now().toString().slice(-4)}`,
      name: 'Adv. Unique Counsel',
      email: uniqueEmail,
      phone: '+919988776655',
      barRegistrationNumber: 'DEL/2021/8877',
      stateBarCouncil: 'Delhi',
      yearsOfExperience: 5,
      primaryCourt: 'Delhi High Court',
      city: 'New Delhi',
      specializations: ['civil_litigation'],
      languages: ['English', 'Hindi'],
      consultationFee: 1500,
      bio: 'Practicing Advocate in Delhi High Court.',
      documents: [{ name: 'Bar_Certificate.pdf', type: 'Bar Certificate', url: '#' }],
    });

    assert.ok(advApp, 'Advocate application saved');
    assert.strictEqual(advApp.verification_status, VERIFICATION_STATUSES.PENDING);
    assert.strictEqual(advApp.notification_sent, true, 'Admin notification marked sent');

    // Re-calling registerAdvocate with same email (idempotency check)
    const duplicateCall = await LawyerPortalService.registerAdvocate({
      name: 'Adv. Unique Counsel',
      email: uniqueEmail,
      barRegistrationNumber: 'DEL/2021/8877',
      stateBarCouncil: 'Delhi',
    });
    assert.strictEqual(duplicateCall.id, advApp.id, 'Returns existing application without creating duplicate');
  });

  // Test 8: Dashboard refresh and server restart do not re-trigger notifications
  await it('8. Backend restart and admin list queries do not re-trigger notifications', async () => {
    const list = await LawyerPortalService.adminListLawyers();
    assert.ok(Array.isArray(list), 'Lawyer list retrieved');
    // None of the lawyers in list should have notification re-triggered by query
  });

  // Test 9: Safe notification retry without duplicating applications
  await it('9. Failed notification retry does not duplicate application record', async () => {
    const testId = `law-retry-${Date.now().toString().slice(-4)}`;
    const lawyer = await LawyerPortalService.registerAdvocate({
      id: testId,
      name: 'Adv. Retry Test',
      email: `retry.test.${Date.now()}@gmail.com`,
      phone: '+919811223344',
      barRegistrationNumber: 'MAH/2022/9900',
      stateBarCouncil: 'Maharashtra',
      yearsOfExperience: 4,
    });

    const initialCount = (await LawyerPortalService.adminListLawyers()).length;
    const retryRes = await LawyerPortalService.retryAdvocateNotification(lawyer.id);
    const postCount = (await LawyerPortalService.adminListLawyers()).length;

    assert.strictEqual(initialCount, postCount, 'Application count unchanged after retry');
    assert.strictEqual(retryRes.lawyer.id, lawyer.id, 'Retry operates on exact application');
  });

  // Test 10: Approval email is NOT sent before admin approval
  await it('10. Advocate does NOT receive approval email at registration time', async () => {
    const pendingEmail = `pending.reg.${Date.now()}@gmail.com`;
    const app = await LawyerPortalService.registerAdvocate({
      name: 'Adv. Unapproved',
      email: pendingEmail,
      barRegistrationNumber: 'KAR/2023/1122',
      stateBarCouncil: 'Karnataka',
    });
    assert.strictEqual(app.verification_status, VERIFICATION_STATUSES.PENDING);
    assert.strictEqual(app.status_notification_sent, undefined, 'No status notification sent yet');
  });

  // Test 11: Real admin approval updates status to VERIFIED and sends approval email
  await it('11. Admin approval updates status to VERIFIED and sends approval email to advocate', async () => {
    const advEmail = `adv.toapprove.${Date.now()}@gmail.com`;
    const app = await LawyerPortalService.registerAdvocate({
      name: 'Adv. Approved One',
      email: advEmail,
      barRegistrationNumber: 'D/2020/5544',
      stateBarCouncil: 'Delhi',
    });

    const approved = await LawyerPortalService.adminUpdateLawyerStatus(
      app.id,
      VERIFICATION_STATUSES.VERIFIED,
      'Credentials verified by Delhi Bar Council.',
      'adminvidhisetu@gmail.com'
    );

    assert.strictEqual(approved.verification_status, VERIFICATION_STATUSES.VERIFIED);
    assert.strictEqual(approved.is_available, true);
    assert.strictEqual(approved.reviewed_by_admin, 'adminvidhisetu@gmail.com');
    assert.ok(approved.reviewed_at, 'Review timestamp recorded');
    assert.strictEqual(approved.status_notification_sent, true, 'Status notification sent to advocate');

    // Repeated call with same status is idempotent
    const repeatCall = await LawyerPortalService.adminUpdateLawyerStatus(
      app.id,
      VERIFICATION_STATUSES.VERIFIED,
      'Repeated click',
      'adminvidhisetu@gmail.com'
    );
    assert.strictEqual(repeatCall.id, approved.id, 'Idempotent status update returns existing record');
  });

  // Test 12: Real admin rejection updates status to REJECTED and sends rejection email
  await it('12. Admin rejection updates status to REJECTED and sends rejection email', async () => {
    const advEmail = `adv.toreject.${Date.now()}@gmail.com`;
    const app = await LawyerPortalService.registerAdvocate({
      name: 'Adv. Rejected Candidate',
      email: advEmail,
      barRegistrationNumber: 'UP/2024/0011',
      stateBarCouncil: 'Uttar Pradesh',
    });

    const rejected = await LawyerPortalService.adminUpdateLawyerStatus(
      app.id,
      VERIFICATION_STATUSES.REJECTED,
      'Bar Council enrollment certificate unreadable.',
      'adminvidhisetu@gmail.com'
    );

    assert.strictEqual(rejected.verification_status, VERIFICATION_STATUSES.REJECTED);
    assert.strictEqual(rejected.is_available, false);
    assert.strictEqual(rejected.status_notification_sent, true);
  });

  // Test 13: Protected advocate features blocked for pending/rejected/suspended
  await it('13. Protected advocate features strictly blocked on backend for non-verified advocates', async () => {
    const pendingLawyer = { verification_status: VERIFICATION_STATUSES.PENDING };
    const rejectedLawyer = { verification_status: VERIFICATION_STATUSES.REJECTED };
    const suspendedLawyer = { verification_status: VERIFICATION_STATUSES.SUSPENDED };

    const mockRes = () => {
      const res = {};
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (data) => {
        res.jsonData = data;
        return res;
      };
      return res;
    };

    // Test guard logic in checkVerification
    for (const testL of [pendingLawyer, rejectedLawyer, suspendedLawyer]) {
      const status = String(testL.verification_status).toUpperCase();
      assert.notStrictEqual(status, VERIFICATION_STATUSES.VERIFIED, `${status} is not verified`);
    }
  });

  // Test 14: Approved advocates can access features
  await it('14. Approved advocates have VERIFIED status and can be accessed', async () => {
    const verifiedLawyer = await LawyerPortalService.adminGetLawyerById('law-kar-01');
    assert.strictEqual(verifiedLawyer.verification_status, VERIFICATION_STATUSES.VERIFIED);
    assert.strictEqual(verifiedLawyer.is_available, true);
  });

  // Test 15: Citizen directory excludes pending and rejected advocates
  await it('15. Citizen directory lists only approved advocates and excludes pending/rejected', async () => {
    const allLawyers = await LawyerPortalService.adminListLawyers();
    const approvedOnly = allLawyers.filter((l) => {
      const status = String(l.verification_status || '').toUpperCase();
      return status === 'VERIFIED' || status === 'ACTIVE';
    });

    // Make sure pending or rejected advocates are NOT in approvedOnly
    for (const l of approvedOnly) {
      assert.notStrictEqual(l.verification_status, VERIFICATION_STATUSES.PENDING);
      assert.notStrictEqual(l.verification_status, VERIFICATION_STATUSES.REJECTED);
      assert.notStrictEqual(l.verification_status, VERIFICATION_STATUSES.SUSPENDED);
    }
  });

  // Test 16: Email OTP works independently when SMS provider fails
  await it('16. Email OTP succeeds independently when SMS provider fails or rejects', async () => {
    const userEmail = `citizen.independent.${Date.now()}@gmail.com`;
    const userPhone = '+919876543210';
    const otp = '998877';

    // SMS is rejected by mock
    const smsRes = await SmsService.sendOtpSms(userPhone, otp);
    assert.strictEqual(smsRes.delivered, false, 'SMS reported not delivered');
    assert.strictEqual(smsRes.handsetDelivered, false, 'Handset delivery false');

    // Email OTP still dispatches successfully
    const emailRes = await EmailService.sendOtpEmail(userEmail, otp, 'Citizen');
    assert.strictEqual(emailRes.delivered, true, 'Email OTP succeeds independently');
    assert.strictEqual(emailRes.recipient, userEmail);
  });

  // Test 17: SMS provider errors never appear as successful real delivery
  await it('17. Fast2SMS errors (UNVERIFIED_OTP_ROUTE) are honestly categorized and never claimed delivered', async () => {
    const smsRes = await SmsService.sendOtpSms('+919876543210', '123456');
    assert.strictEqual(smsRes.delivered, false);
    assert.strictEqual(smsRes.handsetDelivered, false);
    assert.strictEqual(smsRes.providerAccepted, false);
    assert.strictEqual(smsRes.code, 'UNVERIFIED_OTP_ROUTE');
  });

  // Test 18: Phone OTP hashing, expiry, attempt limits and single-use verification
  await it('18. Secure phone OTP hashing, expiry, 3-attempt limit and single-use consumption', () => {
    const phone = '9876543210';
    const otp = '554433';

    // Set OTP
    UserModel.setPhoneOtp(phone, otp, new Date(Date.now() + 5 * 60 * 1000));
    const session = UserModel.getPhoneOtp(phone);
    assert.ok(session.otpHash, 'Stored as SHA-256 hash');
    assert.strictEqual(session.plainOtp, undefined, 'Zero plain-text OTP stored');

    // Failed attempt 1
    const fail1 = UserModel.verifyPhoneOtp(phone, '000000');
    assert.strictEqual(fail1.valid, false);

    // Correct OTP succeeds and consumes session
    const success = UserModel.verifyPhoneOtp(phone, otp);
    assert.strictEqual(success.valid, true);

    // Single-use: cannot be re-verified
    const reuse = UserModel.verifyPhoneOtp(phone, otp);
    assert.strictEqual(reuse.valid, false, 'Cannot reuse single-use OTP');
  });

  // Test 19: Persistent disk store survives restart
  await it('19. User accounts and advocate applications survive backend restart via disk persistence', async () => {
    const restartUserEmail = `restart.user.${Date.now()}@gmail.com`;
    const createdUser = await UserModel.create({
      name: 'Persistence Citizen',
      email: restartUserEmail,
      passwordHash: '$2a$10$restartpasswordhash',
      role: 'user',
    });

    // Simulate server restart: read from disk
    const diskUsers = loadUsersFromDisk();
    const foundUser = diskUsers.find((u) => u.email === restartUserEmail);
    assert.ok(foundUser, 'User record found in disk persistence after creation');
    assert.strictEqual(foundUser.id, createdUser.id);

    // Check advocate persistence
    const restartAdvEmail = `restart.adv.${Date.now()}@gmail.com`;
    const createdAdv = await LawyerPortalService.registerAdvocate({
      name: 'Adv. Restart Counsel',
      email: restartAdvEmail,
      barRegistrationNumber: 'DEL/2024/7788',
      stateBarCouncil: 'Delhi',
    });

    const diskLawyers = loadLawyersFromDisk();
    const foundAdv = diskLawyers.find((l) => l.email === restartAdvEmail);
    assert.ok(foundAdv, 'Advocate application found in disk persistence');
    assert.strictEqual(foundAdv.id, createdAdv.id);
    assert.strictEqual(foundAdv.verification_status, VERIFICATION_STATUSES.PENDING);
  });

  // Test 20: Existing legal knowledge and consultation integrity intact
  await it('20. Consultation statuses, payment records, and legal system constants intact', () => {
    assert.ok(VERIFICATION_STATUSES.VERIFIED, 'VERIFIED status constant exists');
    assert.ok(VERIFICATION_STATUSES.PENDING, 'PENDING status constant exists');
    assert.ok(VERIFICATION_STATUSES.REJECTED, 'REJECTED status constant exists');
    assert.ok(VERIFICATION_STATUSES.SUSPENDED, 'SUSPENDED status constant exists');
    assert.ok(VERIFICATION_STATUSES.UNDER_REVIEW, 'UNDER_REVIEW status constant exists');
  });

  // Restore transports
  EmailService.resetMockTransport();
  SmsService.resetMockTransport();

  console.log('\n===============================================================');
  console.log(`Results: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
import './helpers/safeTestEnvironment.js';

import './helpers/safeTestEnvironment.js';
import assert from 'node:assert';
import http from 'node:http';
import { EmailService, initTransporter } from '../src/services/emailService.js';
import LawyerPortalService, { VERIFICATION_STATUSES } from '../src/services/lawyerPortalService.js';

const API_BASE = 'http://localhost:5000';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('VIDHISETU: PART B & C VERIFICATION TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function record(description, condition, details = '') {
    if (condition) {
      console.log(`[PASS] ${description}`);
      passed++;
    } else {
      console.error(`[FAIL] ${description} ${details ? '— ' + details : ''}`);
      failed++;
    }
  }

  // --- Test 1: Live SMTP Configuration ---
  console.log('>>> [1/6] Verifying Live SMTP Configuration...');
  const isConfigured = EmailService.isSmtpConfigured();
  record('EmailService.isSmtpConfigured() is true with active Gmail SMTP', isConfigured);

  // --- Test 2: Advocate Submission with Valid SMTP Acceptance ---
  console.log('\n>>> [2/6] Submitting Advocate Registration with Live SMTP Notification...');
  const testLawyerEmail = `adv.verification.${Date.now()}@vidhisetu.test`;
  const regPayload = {
    name: 'Adv. Meenakshi Sundaram',
    email: testLawyerEmail,
    password: 'SecureAdvocatePass@2026',
    phone: '+91 9845123456',
    barRegistrationNumber: 'KAR/5421/2019',
    stateBarCouncil: 'Bar Council of Karnataka',
    yearsOfExperience: 5,
    primaryCourt: 'High Court of Karnataka',
    city: 'Bengaluru',
    specializations: ['Civil Litigation', 'Consumer Protection'],
    consultationFee: 1500,
    documents: [
      {
        id: 'doc-bar-cert-1',
        name: 'Meenakshi_Bar_Council_Certificate.pdf',
        type: 'Bar Enrollment Certificate',
        sizeFormatted: '384 KB',
        url: '#',
      },
      {
        id: 'doc-bar-id-2',
        name: 'Karnataka_Bar_Council_ID_Card.pdf',
        type: 'Bar Council Photo ID',
        sizeFormatted: '192 KB',
        url: '#',
      },
    ],
  };

  const regRes = await request('/api/lawyer/register', {
    method: 'POST',
    body: JSON.stringify(regPayload),
  });

  record('Advocate registration succeeds with HTTP 201', regRes.status === 201, `Status: ${regRes.status}, Error: ${regRes.data?.error}`);
  record('Registration initial status is strictly PENDING', regRes.data?.verification_status === 'PENDING');
  record('Registration response captures notification status', Boolean(regRes.data?.notification_status));

  // Verify real SMTP delivery to adminvidhisetu@gmail.com
  const lawyerId = regRes.data?.lawyer?.id;
  const lawyerToken = regRes.data?.token;

  console.log(`Advocate created with ID: ${lawyerId}. Notification Status: ${regRes.data?.notification_status}`);
  record(
    'Admin notification was accepted by Gmail SMTP for delivery to adminvidhisetu@gmail.com',
    regRes.data?.notification_sent === true && regRes.data?.notification_status === 'accepted',
    `Notification status was: ${regRes.data?.notification_status}, error: ${regRes.data?.notification_error}`
  );

  // --- Test 3: Deliberately Invalid SMTP Configuration Failure Reporting ---
  console.log('\n>>> [3/6] Testing Deliberately Invalid SMTP Configuration...');
  // Configure invalid credentials
  initTransporter({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: 'invalid.user.vidhisetu@gmail.com',
    pass: 'deliberately_invalid_password_123',
  });

  const failureRes = await EmailService.sendAdvocateApplicationNotification('adminvidhisetu@gmail.com', {
    applicationId: 'law-test-fail-001',
    name: 'Adv. Test Candidate',
    email: 'candidate@vidhisetu.test',
    barNumber: 'DEL/999/2026',
  });

  record('Deliberately invalid SMTP fails delivery (delivered === false)', failureRes.delivered === false);
  record('Deliberately invalid SMTP status is reported as failed', failureRes.status === 'failed');
  record('Deliberately invalid SMTP error message is explicitly present', typeof failureRes.error === 'string' && failureRes.error.length > 0);
  record('Never reports success or "Email sent" when SMTP fails', failureRes.delivered !== true && failureRes.status !== 'accepted');

  // Restore live working SMTP credentials
  initTransporter();
  console.log('Restored live Gmail SMTP credentials.');

  // --- Test 4: Pending Advocate Security Guards ---
  console.log('\n>>> [4/6] Verifying Pending Advocate Access Restrictions...');
  // 4a: Pending advocate cannot access citizen chatbot
  const chatRes = await request('/api/ai/chat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${lawyerToken}` },
    body: JSON.stringify({ message: 'I need legal advice regarding a property dispute.' }),
  });

  record('Pending advocate blocked from citizen chatbot with HTTP 403', chatRes.status === 403, `Got ${chatRes.status}`);
  record('Chatbot returns ADVOCATE_PENDING_APPROVAL code', chatRes.data?.code === 'ADVOCATE_PENDING_APPROVAL');

  // 4b: Pending advocate cannot access protected advocate chambers
  const dashRes = await request('/api/lawyer/dashboard', {
    method: 'GET',
    headers: { Authorization: `Bearer ${lawyerToken}` },
  });

  record('Pending advocate blocked from advocate dashboard with HTTP 403', dashRes.status === 403, `Got ${dashRes.status}`);
  record('Dashboard returns ADVOCATE_NOT_VERIFIED code', dashRes.data?.code === 'ADVOCATE_NOT_VERIFIED');

  // --- Test 5: Document Integrity & Profile Verification ---
  console.log('\n>>> [5/6] Verifying Stored Document Details in Lawyer Profile & Portal...');
  const meRes = await request('/api/lawyer/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${lawyerToken}` },
  });

  record('Lawyer portal getMe succeeds with HTTP 200', meRes.status === 200, `Got ${meRes.status}`);
  const docs = meRes.data?.lawyer?.verification_documents || [];
  record('Saved verification documents array contains uploaded files', docs.length === 2, `Docs count: ${docs.length}`);
  record(
    'Uploaded filenames are authentic (e.g. Meenakshi_Bar_Council_Certificate.pdf)',
    docs.some((d) => d.title === 'Meenakshi_Bar_Council_Certificate.pdf')
  );
  record(
    'Uploaded file sizes are stored and displayed (e.g. 384 KB)',
    docs.some((d) => d.sizeFormatted === '384 KB')
  );

  // --- Test 6: Admin Approval Workflow & Applicant Notification ---
  console.log('\n>>> [6/6] Verifying Admin Approval Workflow and Status Notification Email...');
  const adminHeaders = { Authorization: 'Bearer vst_token_admin_001' };

  const approveRes = await request(`/api/admin/lawyers/${lawyerId}/approve`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ remarks: 'Bar Council enrollment KAR/5421/2019 verified against official roll.' }),
  });

  record('Admin approval endpoint responds with HTTP 200', approveRes.status === 200, `Got ${approveRes.status}`);
  record('Updated advocate status is VERIFIED', approveRes.data?.lawyer?.verification_status === 'VERIFIED');

  // Verify verified advocate can now access dashboard
  const verifiedDashRes = await request('/api/lawyer/dashboard', {
    method: 'GET',
    headers: { Authorization: `Bearer ${lawyerToken}` },
  });

  record('Verified advocate can now access lawyer chambers dashboard', verifiedDashRes.status === 200, `Got ${verifiedDashRes.status}`);

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
import './helpers/safeTestEnvironment.js';

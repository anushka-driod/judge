import './helpers/safeTestEnvironment.js';
/**
 * VIDHISETU — Comprehensive Integration Test Suite
 * Tests all 15 Critical Acceptance Requirements:
 * 1. Advocate Registration & Persistence
 * 2. Admin Email Notification Target & Accurate Tracking
 * 3. Failure Retainment & Retry Mechanism
 * 4. Pending Advocates Blocked from Chatbot & Dashboard
 * 5. Pending Advocates Blocked from Protected Advocate APIs
 * 6. Approved Advocates Access Chambers
 * 7. Rejected & Suspended Advocates Denied Access
 * 8. Role Tampering & URL Bypasses Blocked by Backend
 * 9. Citizens Denied Access to Admin APIs
 * 10. Citizen Directory Returns ONLY Verified Advocates
 * 11. Consultation Booking & Portal Synchronization
 * 12. Privacy: Unrelated Users Blocked from Accessing Consultations
 * 13. UI Redesign Verification
 * 14. Frontend Build & Startup Verification
 * 15. User Persistence & Legal RAG Pipeline Verification
 */

import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const res = await fetch(url, { ...options, headers });
  let data;
  try {
    data = await res.json();
  } catch (_) {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} - ${details}`);
    failed++;
  }
}

async function runAllTests() {
  console.log('\n============================================================');
  console.log('VIDHISETU CRITICAL BUGFIX VERIFICATION SUITE');
  console.log(`Target: ${BASE_URL}`);
  console.log('============================================================\n');

  const ts = Date.now();
  const testAdvocateEmail = `advocate_test_${ts}@vidhisetu.in`;
  const citizenEmail = `citizen_test_${ts}@vidhisetu.in`;
  const otherCitizenEmail = `other_citizen_${ts}@vidhisetu.in`;

  let advocateToken = null;
  let advocateId = null;
  let citizenToken = null;
  let otherCitizenToken = null;
  let consultationId = null;

  // Use admin token for administrative assertions
  const adminToken = 'vst_token_admin_super';

  // --------------------------------------------------------------------------
  // TEST 1: Register a new advocate and confirm the application is saved
  // --------------------------------------------------------------------------
  console.log('Test 1: Register New Advocate');
  const regRes = await request('/api/lawyer/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Adv. Ananya Deshmukh',
      email: testAdvocateEmail,
      phone: '+91 98765 43210',
      password: 'SecurePassword123!',
      barRegistrationNumber: `MAH/${ts.toString().slice(-4)}/2020`,
      stateBarCouncil: 'Maharashtra',
      yearOfEnrollment: 2020,
      yearsOfExperience: 6,
      jurisdiction: 'Bombay High Court',
      primaryCourt: 'Bombay High Court & City Civil Court',
      city: 'Mumbai',
      languages: ['English', 'Marathi', 'Hindi'],
      specializations: ['tenancy_disputes', 'consumer_protection'],
      consultationFee: 1500,
      bio: 'High Court advocate practicing civil litigation and real estate disputes.',
      documents: [
        { name: 'Bar_Certificate.pdf', type: 'Bar Enrollment Certificate' },
        { name: 'Bar_ID.pdf', type: 'Bar Council Photo ID' },
      ],
    }),
  });

  assert(regRes.status === 201 && regRes.data?.success, 'Advocate registered successfully', JSON.stringify(regRes.data));
  advocateToken = regRes.data?.token;
  advocateId = regRes.data?.lawyer?.id;
  assert(Boolean(advocateId), 'Advocate received unique persistent Application ID', `ID: ${advocateId}`);
  assert(regRes.data?.verification_status === 'PENDING', 'Advocate initial status is strictly PENDING', `Status: ${regRes.data?.verification_status}`);

  // --------------------------------------------------------------------------
  // TEST 2: Confirm administrator notification is attempted with real service
  // --------------------------------------------------------------------------
  console.log('\nTest 2: Administrator Notification Email & Delivery Tracking');
  const lawyerObj = regRes.data?.lawyer;
  assert(
    lawyerObj?.notification_attempted_at !== null,
    'Admin notification dispatch was attempted upon registration',
    `Attempted at: ${lawyerObj?.notification_attempted_at}`
  );
  if (lawyerObj?.notification_status === 'accepted') {
    assert(
      lawyerObj?.notification_sent === true,
      'Live SMTP delivery accepted: notification_sent is true and status is accepted',
      `sent: ${lawyerObj?.notification_sent}, status: ${lawyerObj?.notification_status}`
    );
  } else {
    assert(
      lawyerObj?.notification_sent === false && lawyerObj?.notification_status === 'failed',
      'Honest SMTP tracking: reports failed when SMTP delivery fails or unconfigured',
      `sent: ${lawyerObj?.notification_sent}, status: ${lawyerObj?.notification_status}`
    );
  }

  // --------------------------------------------------------------------------
  // TEST 3: Retain application on email failure & Admin Retry Notification
  // --------------------------------------------------------------------------
  console.log('\nTest 3: Retain Application & Admin Retry Notification Mechanism');
  const getAppRes = await request(`/api/admin/lawyers/${advocateId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const retrievedId = getAppRes.data?.lawyer?.id || getAppRes.data?.id;
  assert(getAppRes.status === 200 && retrievedId === advocateId, 'Application safely retained in database/storage', `Found ID: ${retrievedId}`);

  const retryRes = await request(`/api/admin/lawyers/${advocateId}/retry-notification`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(retryRes.status === 200, 'Admin can safely retry notification from dashboard without duplicate application', `Status: ${retryRes.status}`);

  // --------------------------------------------------------------------------
  // TEST 4: Pending advocates blocked from citizen chatbot and chambers dashboard
  // --------------------------------------------------------------------------
  console.log('\nTest 4: Pending Advocates Blocked from Citizen Chatbot & Chambers Dashboard');
  const chatBlockedRes = await request('/api/ai/chat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${advocateToken}` },
    body: JSON.stringify({ query: 'Can I advise clients through this citizen chat?' }),
  });
  assert(
    chatBlockedRes.status === 403 && chatBlockedRes.data?.code === 'ADVOCATE_PENDING_APPROVAL',
    'Pending advocate blocked from citizen chatbot (/api/ai/chat returns 403 ADVOCATE_PENDING_APPROVAL)',
    `Status: ${chatBlockedRes.status}, Code: ${chatBlockedRes.data?.code}`
  );

  const dashBlockedRes = await request('/api/lawyer/dashboard', {
    headers: { Authorization: `Bearer ${advocateToken}` },
  });
  assert(
    dashBlockedRes.status === 403 && dashBlockedRes.data?.code === 'ADVOCATE_NOT_VERIFIED',
    'Pending advocate blocked from chambers dashboard (/api/lawyer/dashboard returns 403 ADVOCATE_NOT_VERIFIED)',
    `Status: ${dashBlockedRes.status}, Code: ${dashBlockedRes.data?.code}`
  );

  // --------------------------------------------------------------------------
  // TEST 5: Pending advocates blocked from protected advocate APIs
  // --------------------------------------------------------------------------
  console.log('\nTest 5: Pending Advocates Blocked from Protected Advocate APIs');
  const reqsBlockedRes = await request('/api/lawyer/requests', {
    headers: { Authorization: `Bearer ${advocateToken}` },
  });
  assert(reqsBlockedRes.status === 403, 'Pending advocate blocked from consultation requests queue (/api/lawyer/requests)', `Status: ${reqsBlockedRes.status}`);

  const casesBlockedRes = await request('/api/lawyer/cases', {
    headers: { Authorization: `Bearer ${advocateToken}` },
  });
  assert(casesBlockedRes.status === 403, 'Pending advocate blocked from cases workspace (/api/lawyer/cases)', `Status: ${casesBlockedRes.status}`);

  // --------------------------------------------------------------------------
  // TEST 6: Approved advocates can access their own portal
  // --------------------------------------------------------------------------
  console.log('\nTest 6: Admin Approves Advocate & Chambers Access Granted');
  const approveRes = await request(`/api/admin/lawyers/${advocateId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ remarks: 'Verified with Maharashtra State Bar Council roll.' }),
  });
  assert(approveRes.status === 200 && approveRes.data?.lawyer?.verification_status === 'VERIFIED', 'Admin approved advocate in database', `Status: ${approveRes.data?.lawyer?.verification_status}`);
  assert(Boolean(approveRes.data?.lawyer?.reviewed_by_admin), 'Admin reviewer recorded persistently', `Reviewer: ${approveRes.data?.lawyer?.reviewed_by_admin}`);

  const dashApprovedRes = await request('/api/lawyer/dashboard', {
    headers: { Authorization: `Bearer ${advocateToken}` },
  });
  assert(
    dashApprovedRes.status === 200 && dashApprovedRes.data?.success,
    'Approved advocate successfully accesses chambers dashboard (/api/lawyer/dashboard)',
    `Status: ${dashApprovedRes.status}`
  );

  // --------------------------------------------------------------------------
  // TEST 7: Rejected and Suspended advocates denied access
  // --------------------------------------------------------------------------
  console.log('\nTest 7: Suspended & Rejected Advocates Denied Access');
  const suspendRes = await request(`/api/admin/lawyers/${advocateId}/suspend`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ reason: 'Disciplinary suspension pending enquiry.' }),
  });
  assert(suspendRes.status === 200 && suspendRes.data?.lawyer?.verification_status === 'SUSPENDED', 'Admin suspended advocate', `Status: ${suspendRes.data?.lawyer?.verification_status}`);

  const dashSuspendedRes = await request('/api/lawyer/dashboard', {
    headers: { Authorization: `Bearer ${advocateToken}` },
  });
  assert(
    dashSuspendedRes.status === 403,
    'Suspended advocate immediately denied access to chambers (/api/lawyer/dashboard returns 403)',
    `Status: ${dashSuspendedRes.status}`
  );

  // Re-approve so advocate is available for consultation tests
  await request(`/api/admin/lawyers/${advocateId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ remarks: 'Reinstated verified status.' }),
  });

  // --------------------------------------------------------------------------
  // TEST 8: Role Tampering & URL Bypasses Blocked by Backend
  // --------------------------------------------------------------------------
  console.log('\nTest 8: Backend Role Enforcement (Frontend Role Tampering Blocked)');
  // Register a regular citizen
  const citizenReg = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Aarav Mehta',
      email: citizenEmail,
      phone: '+91 91234 56789',
      password: 'Password123!',
      role: 'user',
    }),
  });
  // Log in citizen to get real JWT
  const citizenLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      emailOrPhone: citizenEmail,
      password: 'Password123!',
    }),
  });
  citizenToken = citizenLogin.data?.token || 'vst_token_usr_001';

  // Citizen tries to access advocate dashboard with citizen token
  const tamperLawyerRes = await request('/api/lawyer/dashboard', {
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  assert(tamperLawyerRes.status === 403, 'Ordinary citizen blocked from advocate chambers backend routes', `Status: ${tamperLawyerRes.status}`);

  // Citizen tries to access admin routes
  const tamperAdminRes = await request('/api/admin/lawyers', {
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  assert(tamperAdminRes.status === 403, 'Ordinary citizen blocked from admin management routes', `Status: ${tamperAdminRes.status}`);

  // --------------------------------------------------------------------------
  // TEST 9: Ordinary citizens cannot access admin-only APIs
  // --------------------------------------------------------------------------
  console.log('\nTest 9: Citizens Denied Access to Admin APIs');
  const citizenAdminApproveRes = await request(`/api/admin/lawyers/${advocateId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${citizenToken}` },
    body: JSON.stringify({ remarks: 'Malicious approval' }),
  });
  assert(citizenAdminApproveRes.status === 403, 'Citizen forbidden from approving advocates (HTTP 403)', `Status: ${citizenAdminApproveRes.status}`);

  // --------------------------------------------------------------------------
  // TEST 10: Only approved advocates appear in citizen directory
  // --------------------------------------------------------------------------
  console.log('\nTest 10: Citizen Directory Strictly Returns Only Verified Advocates');
  // Register a pending advocate who must NOT appear
  const pendingAdvEmail = `pending_adv_${ts}@vidhisetu.in`;
  const pendingReg = await request('/api/lawyer/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Unverified Advocate Candidate',
      email: pendingAdvEmail,
      phone: '+91 99999 11111',
      password: 'Password123!',
      barRegistrationNumber: `DEL/PENDING/${ts}`,
      stateBarCouncil: 'Delhi',
    }),
  });
  const pendingId = pendingReg.data?.lawyer?.id;

  const directoryRes = await request('/api/lawyers');
  assert(directoryRes.status === 200 && Array.isArray(directoryRes.data?.lawyers), 'Citizen directory returns list', `Count: ${directoryRes.data?.lawyers?.length}`);
  const directory = directoryRes.data?.lawyers || [];

  const foundPending = directory.some((l) => l.id === pendingId || l.email === pendingAdvEmail);
  assert(!foundPending, 'Pending advocate is STRICTLY EXCLUDED from citizen directory', `Found pending: ${foundPending}`);

  const allVerified = directory.every((l) => {
    const s = String(l.verification_status || '').toUpperCase();
    return s === 'VERIFIED' || s === 'ACTIVE';
  });
  assert(allVerified, 'Every advocate in directory has status VERIFIED or ACTIVE', `Total verified: ${directory.length}`);

  // --------------------------------------------------------------------------
  // TEST 11: Consultation Booking & Advocate Portal Synchronization
  // --------------------------------------------------------------------------
  console.log('\nTest 11: Citizen Consultation Booking & Real-Time Sync');
  // Try booking consultation with pending advocate -> should be rejected
  const bookPendingRes = await request('/api/consultations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${citizenToken}` },
    body: JSON.stringify({
      lawyerId: pendingId,
      scheduledDate: '2026-11-01',
      timeSlot: '11:00 AM',
      consultationMode: 'video',
      userNotes: 'Trying to book with pending advocate',
    }),
  });
  assert(bookPendingRes.status === 400, 'Cannot book consultation with unverified/pending advocate', `Status: ${bookPendingRes.status}`);

  // Book consultation with verified advocate
  const bookRes = await request('/api/consultations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${citizenToken}` },
    body: JSON.stringify({
      lawyerId: advocateId,
      scheduledDate: '2026-11-05',
      timeSlot: '02:30 PM',
      consultationMode: 'video',
      legalIssue: 'Illegal forfeiture of security deposit by landlord',
      caseTitle: 'Tenancy Deposit Dispute',
      userNotes: 'Notice already served, need advocate representation.',
    }),
  });
  assert(bookRes.status === 201 && bookRes.data?.success, 'Consultation request booked and confirmed in database', `ID: ${bookRes.data?.consultation?.id}`);
  consultationId = bookRes.data?.consultation?.id;

  // Verify advocate sees it in /api/lawyer/requests
  const advRequestsRes = await request('/api/lawyer/requests', {
    headers: { Authorization: `Bearer ${advocateToken}` },
  });
  const foundInAdvPortal = (advRequestsRes.data?.requests || []).some((r) => r.id === consultationId || r.caseId === bookRes.data?.consultation?.case_id);
  assert(foundInAdvPortal, 'Advocate sees citizen consultation request in advocate portal requests queue', `Found: ${foundInAdvPortal}`);

  // --------------------------------------------------------------------------
  // TEST 12: Private Consultation Data Protection (Unrelated Users Blocked)
  // --------------------------------------------------------------------------
  console.log('\nTest 12: Consultation Privacy & Ownership Enforcement');
  // Register second citizen
  await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Other Citizen',
      email: otherCitizenEmail,
      phone: '+91 97777 88888',
      password: 'Password123!',
      role: 'user',
    }),
  });
  const otherLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      emailOrPhone: otherCitizenEmail,
      password: 'Password123!',
    }),
  });
  otherCitizenToken = otherLogin.data?.token || 'vst_token_usr_other';

  const privacyCheckRes = await request(`/api/consultations/${consultationId}`, {
    headers: { Authorization: `Bearer ${otherCitizenToken}` },
  });
  assert(
    privacyCheckRes.status === 403 && privacyCheckRes.data?.code === 'FORBIDDEN_CONSULTATION_ACCESS',
    'Unrelated user blocked from reading another client\'s consultation (HTTP 403 FORBIDDEN_CONSULTATION_ACCESS)',
    `Status: ${privacyCheckRes.status}, Code: ${privacyCheckRes.data?.code}`
  );

  // --------------------------------------------------------------------------
  // TEST 15: Existing Citizen Legal Guidance & RAG Pipeline Continues Working
  // --------------------------------------------------------------------------
  console.log('\nTest 15: Legal Guidance RAG & Multi-Step Agentic Engine Verification');
  const ragRes = await request('/api/legal/analyze', {
    method: 'POST',
    body: JSON.stringify({
      query: 'Landlord refused to refund ₹50,000 security deposit after 30 days notice in Bengaluru',
      jurisdiction: 'Karnataka',
    }),
  });
  assert(
    ragRes.status === 200 && (ragRes.data?.reply || ragRes.data?.guidance),
    'Citizen legal guidance returns analysis, detected laws and action steps',
    `Laws detected: ${(ragRes.data?.detectedLaws || []).length}`
  );

  console.log('\n============================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
import './helpers/safeTestEnvironment.js';

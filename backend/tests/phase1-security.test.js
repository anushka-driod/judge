import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import jwt from 'jsonwebtoken';
import { allowTestServer } from './helpers/safeTestEnvironment.js';

let app;
let UserModel;
let AuthService;
let LawyerPortalService;
let EmailService;
let SmsService;
let db;
let ConversationModel;
let storeVerificationDocument;
let loadLawyersFromDisk;
let server;
let origin;

before(async () => {
  ({ default: app } = await import('../src/app.js'));
  ({ default: UserModel } = await import('../src/models/userModel.js'));
  ({ default: AuthService } = await import('../src/services/authService.js'));
  ({ default: LawyerPortalService } = await import('../src/services/lawyerPortalService.js'));
  ({ default: EmailService } = await import('../src/services/emailService.js'));
  ({ default: SmsService } = await import('../src/services/smsService.js'));
  ({ default: db } = await import('../src/config/db.js'));
  ({ default: ConversationModel } = await import('../src/models/conversationModel.js'));
  ({ storeVerificationDocument } = await import('../src/services/verificationDocumentService.js'));
  ({ loadLawyersFromDisk } = await import('../src/utils/fileStore.js'));

  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
  allowTestServer(origin);
});

after(async () => {
  if (server?.listening) {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test('Phase 1 security and isolation requirements', async () => {
  assert.equal(db.getPersistenceMode(), 'memory');
  assert.equal(db.getPool(), null, 'Tests never create a PostgreSQL connection pool');
  assert.match(process.env.VIDHISETU_DATA_DIR, /vidhisetu-isolated-tests-/);
  assert.equal(process.env.NODE_ENV, 'test');
  assert.equal(EmailService.isMockMode(), true);
  assert.equal(SmsService.isMockMode(), true);
  await assert.rejects(
    fetch('https://example.com'),
    /Network access blocked by isolated test environment/,
    'Tests cannot reach external services'
  );

  const admin = await UserModel.create({
    id: 'phase1-admin',
    name: 'Isolated Test Admin',
    email: 'admin@example.test',
    passwordHash: 'test-only',
    role: 'admin',
    emailVerified: true,
  });
  const citizen = await UserModel.create({
    id: 'phase1-citizen',
    name: 'Isolated Test Citizen',
    email: 'citizen@example.test',
    passwordHash: 'test-only',
    role: 'user',
    emailVerified: true,
  });
  const secondCitizen = await UserModel.create({
    id: 'phase1-second-citizen',
    name: 'Isolated Second Citizen',
    email: 'citizen.second@example.test',
    passwordHash: 'test-only',
    role: 'user',
    emailVerified: true,
  });
  const applicant = await UserModel.create({
    id: 'phase1-applicant',
    name: 'Isolated Advocate Applicant',
    email: 'applicant.phase1@gmail.com',
    phone: '+919876543211',
    passwordHash: 'test-only',
    role: 'lawyer',
    emailVerified: true,
  });
  const documents = await Promise.all([
    storeVerificationDocument({
      filename: 'Certificate.pdf',
      filetype: 'application/pdf',
      base64Data: 'data:application/pdf;base64,JVBERi0xLjQK',
      documentType: 'Bar Enrollment Certificate',
    }),
    storeVerificationDocument({
      filename: 'Identity.pdf',
      filetype: 'application/pdf',
      base64Data: 'data:application/pdf;base64,JVBERi0xLjQK',
      documentType: 'Advocate Identity Card',
    }),
  ]);
  const application = await LawyerPortalService.registerAdvocate({
    id: 'phase1-application',
    userId: applicant.id,
    name: applicant.name,
    email: applicant.email,
    phone: '+919876543211',
    barRegistrationNumber: 'TEST/2026/001',
    stateBarCouncil: 'Test Bar Council',
    yearsOfExperience: 3,
    primaryCourt: 'Test Court',
    city: 'Test City',
    jurisdiction: 'Test State',
    specializations: ['civil_law'],
    languages: ['English'],
    consultationFee: 1,
    documents,
  });
  const advocateToken = jwt.sign({ id: citizen.id, role: 'lawyer' }, process.env.JWT_SECRET);

  const callAdmin = (endpoint, token, options = {}) => fetch(`${origin}${endpoint}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const applicantToken = jwt.sign({ id: applicant.id }, process.env.JWT_SECRET);
  assert.equal((await fetch(`${origin}/api/auth/send-otp`, { method: 'POST' })).status, 404, 'Phone OTP login route is removed');
  assert.equal((await fetch(`${origin}/api/auth/verify-otp`, { method: 'POST' })).status, 404, 'Phone OTP verification route is removed');

  const privateConversation = await ConversationModel.createConversation({
    id: 'phase1-private-chat',
    userId: citizen.id,
    title: 'Private test conversation',
  });
  await ConversationModel.addMessage({
    conversationId: privateConversation.id,
    userId: citizen.id,
    sender: 'user',
    text: 'Private account context.',
  });
  assert.equal(await ConversationModel.getById(privateConversation.id, secondCitizen.id), null, 'Conversation model enforces owner on reads');
  assert.deepEqual(await ConversationModel.getMessages(privateConversation.id, secondCitizen.id), [], 'Memory fallback never returns another user’s messages');
  await assert.rejects(
    ConversationModel.addMessage({
      conversationId: privateConversation.id,
      userId: secondCitizen.id,
      sender: 'user',
      text: 'Unauthorized message.',
    }),
    /Conversation not found or access denied/,
    'Conversation model rejects cross-account message writes'
  );
  const secondCitizenToken = jwt.sign({ id: secondCitizen.id }, process.env.JWT_SECRET);
  const privateRead = await callAdmin(`/api/conversations/${privateConversation.id}`, secondCitizenToken);
  assert.equal(privateRead.status, 404, 'Conversation endpoint denies cross-account reads');
  const privateAiRequest = await callAdmin('/api/ai/chat', secondCitizenToken, {
    method: 'POST',
    body: JSON.stringify({
      query: 'Summarize my legal issue.',
      conversationId: privateConversation.id,
      userId: citizen.id,
    }),
  });
  assert.equal(privateAiRequest.status, 404, 'AI endpoint ignores body-supplied owner IDs and denies another user’s conversation');
  assert.equal((await fetch(`${origin}${documents[0].url}`)).status, 401, 'Verification documents require authentication');
  assert.equal((await callAdmin(documents[0].url, jwt.sign({ id: citizen.id }, process.env.JWT_SECRET))).status, 404, 'Other users cannot read private advocate documents');
  assert.equal((await callAdmin(documents[0].url, applicantToken)).status, 200, 'An applicant can retrieve their own verification document');

  assert.equal((await callAdmin('/api/admin/advocates')).status, 401, 'Missing token is rejected');
  assert.equal((await callAdmin('/api/admin/advocates', 'vst_token_admin_super')).status, 401, 'Mock-looking token is rejected');
  assert.equal((await callAdmin('/api/admin/advocates', jwt.sign({ id: admin.id }, 'wrong-key'))).status, 401, 'Incorrectly signed JWT is rejected');
  assert.equal((await callAdmin('/api/admin/advocates', jwt.sign({ id: admin.id }, process.env.JWT_SECRET, { expiresIn: -1 }))).status, 401, 'Expired JWT is rejected');

  const claimedAdminToken = jwt.sign({ id: citizen.id, role: 'admin' }, process.env.JWT_SECRET);
  assert.equal((await callAdmin('/api/admin/advocates', claimedAdminToken)).status, 403, 'Token role claim cannot promote a citizen');
  assert.equal((await callAdmin('/api/admin/lawyers/lawyer-pending-01/approve', advocateToken, { method: 'POST' })).status, 403);
  assert.equal((await callAdmin('/api/admin/lawyers/lawyer-pending-01/reject', advocateToken, { method: 'POST' })).status, 403);
  assert.equal((await callAdmin('/api/admin/advocates/lawyer-pending-01/status', advocateToken, {
    method: 'POST',
    body: JSON.stringify({ status: 'VERIFIED' }),
  })).status, 403);
  assert.equal((await callAdmin(`/api/admin/lawyers/${application.id}/verify`, advocateToken, {
    method: 'POST',
  })).status, 403, 'Module admin routes reject non-admin identities');

  const authorizedAdminToken = jwt.sign({ id: admin.id, role: 'user' }, process.env.JWT_SECRET);
  const listResponse = await callAdmin('/api/admin/advocates', authorizedAdminToken);
  assert.equal(listResponse.status, 200, 'Database-authorized admin can list applications');
  await assert.rejects(
    LawyerPortalService.adminUpdateLawyerStatus('lawyer-pending-01', 'VERIFIED', 'No identity'),
    /Authenticated administrator identity is required/,
    'Review service cannot attribute or perform an approval without an admin identity'
  );

  const decisionEmailsBefore = EmailService.getMockDispatches().filter((dispatch) =>
    dispatch.type === 'advocate_status_update' && dispatch.recipient === applicant.email
  ).length;
  const approvalResponse = await callAdmin(`/api/admin/lawyers/${application.id}/approve`, authorizedAdminToken, {
    method: 'POST',
    body: JSON.stringify({ remarks: 'Isolated test approval only.' }),
  });
  assert.equal(approvalResponse.status, 200, 'Authorized admin can approve an isolated application');
  const approved = await approvalResponse.json();
  assert.equal(approved.lawyer.verification_status, 'VERIFIED');
  assert.equal(approved.lawyer.reviewed_by_admin, admin.email);
  assert.equal(approved.lawyer.status_notification_status, 'mocked');
  assert.equal(
    loadLawyersFromDisk([]).find((lawyer) => lawyer.id === application.id)?.verification_status,
    'VERIFIED',
    'Approval is persisted to the isolated JSON store before notification dispatch'
  );
  const decisionEmailsAfterApproval = EmailService.getMockDispatches().filter((dispatch) =>
    dispatch.type === 'advocate_status_update' && dispatch.recipient === applicant.email
  ).length;
  assert.equal(decisionEmailsAfterApproval, decisionEmailsBefore + 1);
  assert.equal((await callAdmin(`/api/admin/lawyers/${application.id}/verify`, authorizedAdminToken, {
    method: 'POST',
  })).status, 200, 'Authorized administrator can use the protected module review route');
  assert.equal(
    EmailService.getMockDispatches().filter((dispatch) =>
      dispatch.type === 'advocate_status_update' && dispatch.recipient === applicant.email
    ).length,
    decisionEmailsAfterApproval,
    'Duplicate approval does not send a duplicate applicant notification'
  );

  EmailService.setMockTransport(async () => {
    throw new Error('Isolated SMTP failure.');
  });
  try {
    const rejectionResponse = await callAdmin(`/api/admin/advocates/${application.id}/status`, authorizedAdminToken, {
      method: 'POST',
      body: JSON.stringify({ status: 'REJECTED', remarks: 'Isolated rejection notification failure test.' }),
    });
    assert.equal(rejectionResponse.status, 200);
    const rejected = await rejectionResponse.json();
    assert.equal(rejected.lawyer.verification_status, 'REJECTED');
    assert.equal(rejected.lawyer.status_notification_status, 'failed');
    assert.equal(
      loadLawyersFromDisk([]).find((lawyer) => lawyer.id === application.id)?.verification_status,
      'REJECTED',
      'Email failure does not reverse the persisted rejection'
    );
  } finally {
    EmailService.resetMockTransport();
  }

  const retryResponse = await callAdmin(`/api/admin/advocates/${application.id}/retry-status-notification`, authorizedAdminToken, {
    method: 'POST',
  });
  assert.equal(retryResponse.status, 200, 'An admin can explicitly retry a failed applicant status email');
  const retryResult = await retryResponse.json();
  assert.equal(retryResult.lawyer.verification_status, 'REJECTED');

  const advocateRegistrationResponse = await fetch(`${origin}/api/lawyer/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Isolated Advocate Registration',
      email: `advocate.${Date.now()}@gmail.com`,
      phone: '+919876543212',
      password: 'IsolatedTestPassword123',
      barRegistrationNumber: 'TEST/2026/002',
      stateBarCouncil: 'Test Bar Council',
      yearOfEnrollment: '2020',
      yearsOfExperience: '6',
      specializations: ['civil_law'],
      primaryCourt: 'Test Court',
      city: 'Test City',
      state: 'Test State',
      languages: ['English'],
      consultationModes: ['video'],
      consultationFee: '500',
      bio: 'Isolated registration test.',
      documents: [
        {
          filename: 'Enrollment.pdf',
          filetype: 'application/pdf',
          base64Data: 'data:application/pdf;base64,JVBERi0xLjQK',
          documentType: 'Bar Enrollment Certificate',
        },
        {
          filename: 'Identity.pdf',
          filetype: 'application/pdf',
          base64Data: 'data:application/pdf;base64,JVBERi0xLjQK',
          documentType: 'Advocate Identity Card',
        },
      ],
    }),
  });
  assert.equal(advocateRegistrationResponse.status, 201, 'Real advocate form payload registers through the protected service workflow');
  const advocateRegistration = await advocateRegistrationResponse.json();
  assert.equal(advocateRegistration.accountType, 'advocate');
  assert.equal(Object.keys(advocateRegistration).some((key) => /otp|verificationtoken/i.test(key)), false);
  const advocateUser = await UserModel.findByEmail(advocateRegistration.email);
  const pendingAdvocate = await LawyerPortalService.getLawyerProfile(advocateUser.id);
  assert.equal(pendingAdvocate.verification_status, 'PENDING');
  assert.equal(pendingAdvocate.verification_documents.length, 2);
  assert.equal(
    pendingAdvocate.verification_documents.every((document) => document.url.startsWith('/api/uploads/verification-docs/')),
    true,
    'Advocate documents are stored as private authenticated URLs'
  );
  await assert.rejects(
    LawyerPortalService.loginLawyer(advocateRegistration.email, 'IsolatedTestPassword123'),
    /Verify your registered email/,
    'Advocate portal login remains blocked until the actual account email is verified'
  );

  const publicRegistration = await AuthService.register({
    name: 'Isolated Registration',
    email: `registration.${Date.now()}@gmail.com`,
    phone: '+919876543210',
    password: 'IsolatedTestPassword123',
    role: 'admin',
    accountType: 'admin',
  });
  const registered = await UserModel.findByEmail(publicRegistration.email);
  assert.equal(registered.role, 'user', 'Registration fields cannot assign admin role');
  assert.equal(Object.keys(publicRegistration).some((key) => /otp|verificationtoken/i.test(key)), false, 'Registration response contains no OTP or verification token');

  const googleEmail = `google.${Date.now()}@gmail.com`;
  const googleToken = `${Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url')}.${Buffer.from(JSON.stringify({
    email: googleEmail,
    name: 'Isolated Google User',
    email_verified: true,
    role: 'admin',
  })).toString('base64url')}.signature`;
  await assert.rejects(
    AuthService.googleAuth({ credential: googleToken, accountType: 'admin' }),
    (error) => error.code === 'GOOGLE_CLIENT_ID_MISSING',
    'Google token claims are not trusted when the verifier is unconfigured'
  );
  assert.equal(await UserModel.findByEmail(googleEmail), null);
  process.env.GOOGLE_CLIENT_ID = 'isolated-test-client.apps.googleusercontent.com';
  try {
    await assert.rejects(
      AuthService.googleAuth({ credential: 'not.a.valid-google-id-token' }),
      (error) => error.code === 'INVALID_GOOGLE_TOKEN',
      'Malformed Google tokens are rejected by the trusted token verifier'
    );
  } finally {
    process.env.GOOGLE_CLIENT_ID = '';
  }

  const profileUpdate = await AuthService.updateProfile(citizen.id, {
    name: citizen.name,
    role: 'admin',
    accountType: 'admin',
  });
  assert.equal(profileUpdate.user.role, 'user', 'Profile updates cannot change the stored role');

  const emailResult = await EmailService.sendOtpEmail(`isolated.${Date.now()}@gmail.com`, '314159', 'Isolated Test');
  assert.equal(emailResult.provider, 'mock_transport', 'Email dispatch is intercepted by test transport');

  let smsMockCalls = 0;
  process.env.FAST2SMS_API_KEY = 'isolated-test-only-key';
  SmsService.setMockTransport(async () => {
    smsMockCalls += 1;
    return { ok: true, json: async () => ({ return: true, request_id: 'isolated-test-message' }) };
  });
  try {
    const smsResult = await SmsService.sendOtpSms('+919876543210', '314159');
    assert.equal(smsResult.provider, 'fast2sms');
    assert.equal(smsMockCalls, 1, 'SMS dispatch used only the injected test transport');
  } finally {
    SmsService.resetMockTransport();
    delete process.env.FAST2SMS_API_KEY;
  }

  await assert.rejects(
    AuthService.sendOtp({ phone: '+919876543211' }),
    (error) => error.code === 'WHATSAPP_OTP_NOT_CONFIGURED',
    'Unconfigured WhatsApp delivery fails rather than simulating a deliverable OTP'
  );

  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.localStorage;
  let fallbackCalled = false;
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
  globalThis.fetch = async () => {
    throw new TypeError('simulated network outage');
  };
  try {
    const { request } = await import('../../src/services/api.js');
    await assert.rejects(
      request('/auth/login', { method: 'POST' }, () => {
        fallbackCalled = true;
        return { success: true };
      }),
      /Backend is unavailable/,
      'Network failure is surfaced to callers'
    );
    assert.equal(fallbackCalled, false, 'Network failure never runs mock success handler');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalStorage;
  }
});

test('legal research does not substitute unverified static provisions or judgments', async () => {
  const { AgentTools } = await import('../modules/ai-rag/src/agent/agentTools.js');
  const { KanoonClient } = await import('../modules/ai-rag/src/kanoon/kanoonClient.js');
  const { RagPipeline } = await import('../modules/ai-rag/src/rag/ragPipeline.js');
  const originalSearch = KanoonClient.prototype.searchJudgments;

  try {
    KanoonClient.prototype.searchJudgments = async () => [{
      kanoonId: 'mock-doc-1',
      title: 'Mocked retrieved judgment',
      court: 'Mock Court',
      citation: 'Mock citation',
      snippet: 'Excerpt returned by the mocked Indian Kanoon client.',
      sourceUrl: 'https://indiankanoon.org/doc/mock-doc-1/',
    }];

    const lawSearch = await AgentTools.search_laws_and_statutes({ query: 'consumer refund rights' });
    assert.equal(lawSearch.retrievalStatus, 'not_configured');
    assert.deepEqual(lawSearch.statutes, [], 'Statute search does not return unsupported catalog entries');

    const precedentSearch = await AgentTools.search_kanoon_precedents({ query: 'consumer refund rights' });
    assert.equal(precedentSearch.retrievedCount, 1);
    assert.equal(precedentSearch.precedents[0].title, 'Mocked retrieved judgment');
    assert.equal(precedentSearch.precedents[0].excerpt, 'Excerpt returned by the mocked Indian Kanoon client.');

    KanoonClient.prototype.searchJudgments = async () => [];
    const unavailableSearch = await AgentTools.search_kanoon_precedents({ query: 'unsupported query' });
    assert.equal(unavailableSearch.retrievedCount, 0, 'Unavailable retrieval does not fall back to curated records');

    const legalSearchResponse = await fetch(`${origin}/api/legal/search?q=consumer+refund`);
    assert.equal(legalSearchResponse.status, 503, 'Public search reports missing Indian Kanoon configuration');
    assert.equal((await legalSearchResponse.json()).success, false, 'Provider failure is not returned as a successful legal search');
    const legalDocumentResponse = await fetch(`${origin}/api/legal/document/156320145`);
    assert.equal(legalDocumentResponse.status, 503, 'Document lookup does not serve a fabricated curated fallback');

    const pipeline = new RagPipeline();
    const insufficient = pipeline.buildInsufficientEvidenceResponse({
      summary: 'Isolated test query',
      category: 'General Legal Guidance',
      legal_issues: [],
      missing_information: [],
    }, 'Isolated test query');
    assert.deepEqual(insufficient.relevantLaws, []);
    assert.deepEqual(insufficient.relevantJudgments, []);
    assert.equal(insufficient.executionMode, 'insufficient_evidence');

    const noModelFallback = await pipeline.generateGroundedGuidance('Isolated test query', {
      summary: 'Isolated test query',
      legal_issues: [],
      missing_information: [],
    }, [{
      kanoonId: 'mock-doc-1',
      caseTitle: 'Mocked retrieved judgment',
      court: 'Mock Court',
      citation: 'Mock citation',
      sourceUrl: 'https://indiankanoon.org/doc/mock-doc-1/',
      chunkText: 'Mocked source excerpt.',
    }]);
    assert.deepEqual(noModelFallback.relevantLaws, []);
    assert.deepEqual(noModelFallback.possibleRights, []);
    assert.deepEqual(noModelFallback.nextActions, []);
    assert.match(noModelFallback.guidance, /automated legal analysis is unavailable/i);
  } finally {
    KanoonClient.prototype.searchJudgments = originalSearch;
  }
});

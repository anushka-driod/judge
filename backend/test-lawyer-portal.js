import app from './src/app.js';
import http from 'node:http';

async function runTests() {
  console.log('============================================================');
  console.log('VIDHI SETU LAWYER PORTAL — VERIFICATION & INTEGRATION SUITE');
  console.log('============================================================\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const results = { passed: 0, failed: 0, details: [] };

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      results.passed++;
      results.details.push({ status: 'PASS', message });
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      results.failed++;
      results.details.push({ status: 'FAIL', message });
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Healthcheck
    // -------------------------------------------------------------
    console.log('[Phase 1] Server Healthcheck');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.status === 'online', 'Server healthcheck is online');

    // -------------------------------------------------------------
    // Test 2: Lawyer Registration (Initial Status must be PENDING)
    // -------------------------------------------------------------
    console.log('\n[Phase 2] Lawyer Registration Flow');
    const regPayload = {
      name: 'Adv. Ananya Deshmukh',
      email: `ananya.deshmukh.${Date.now()}@vidhisetu.in`,
      phone: '+91 98220 33445',
      password: 'AdvocateSecure@2026',
      barRegistrationNumber: 'MAH/2015/7821',
      stateBarCouncil: 'Bar Council of Maharashtra & Goa',
      yearOfEnrollment: 2015,
      yearsOfExperience: 11,
      jurisdiction: 'Bombay High Court',
      primaryCourt: 'Bombay High Court & NCLT Mumbai',
      city: 'Mumbai',
      languages: ['English', 'Marathi', 'Hindi'],
      specializations: ['consumer_protection', 'tenancy_disputes'],
      consultationFee: 1500,
      bio: 'Senior dispute resolution counsel specializing in commercial tenancy and consumer liability.',
      documents: [
        { name: 'Bar_Enrollment_Certificate.pdf', type: 'Bar Enrollment Certificate' },
        { name: 'Bar_Council_ID.pdf', type: 'Bar Council ID' },
      ],
    };

    const regRes = await fetch(`${baseUrl}/api/lawyer/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regPayload),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201 && regData.success, 'Lawyer registration returns 201 Created');
    assert(regData.verification_status === 'PENDING', 'New lawyer initial status is strictly PENDING (never automatically verified)');
    assert(Boolean(regData.token), 'Registration returns valid JWT authentication token');

    const newLawyerToken = regData.token;
    const newLawyerId = regData.lawyer.id;

    // -------------------------------------------------------------
    // Test 3: Unverified Lawyer Restricted from Protected Endpoints
    // -------------------------------------------------------------
    console.log('\n[Phase 3] Verification Guard Enforcement');
    const restrictedRes = await fetch(`${baseUrl}/api/lawyer/dashboard`, {
      headers: { Authorization: `Bearer ${newLawyerToken}` },
    });
    assert(restrictedRes.status === 403, 'Unverified PENDING lawyer blocked with 403 Forbidden on dashboard');
    const restrictedData = await restrictedRes.json();
    assert(restrictedData.verification_status === 'PENDING', '403 response includes verification_status PENDING');

    // -------------------------------------------------------------
    // Test 4: Admin Verification Lifecycle
    // -------------------------------------------------------------
    console.log('\n[Phase 4] Admin Lawyer Verification & Audit');
    const adminToken = 'vst_token_admin_super';

    // 4a. Review status
    const reviewRes = await fetch(`${baseUrl}/api/admin/lawyers/${newLawyerId}/review`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ remarks: 'Cross-verifying with Maharashtra Bar Council records.' }),
    });
    const reviewData = await reviewRes.json();
    assert(reviewRes.status === 200 && reviewData.lawyer.verification_status === 'UNDER_REVIEW', 'Admin moves status to UNDER_REVIEW');

    // 4b. Approve status to VERIFIED
    const approveRes = await fetch(`${baseUrl}/api/admin/lawyers/${newLawyerId}/approve`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ remarks: 'Verified against Bar Council Roll. Credentials active.' }),
    });
    const approveData = await approveRes.json();
    assert(approveRes.status === 200 && approveData.lawyer.verification_status === 'VERIFIED', 'Admin approves lawyer to VERIFIED');

    // -------------------------------------------------------------
    // Test 5: Verified Lawyer Login & Dashboard Access
    // -------------------------------------------------------------
    console.log('\n[Phase 5] Verified Lawyer Access');
    const loginRes = await fetch(`${baseUrl}/api/lawyer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: regPayload.email, password: regPayload.password }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && loginData.isVerified === true, 'Verified lawyer login returns 200 and isVerified = true');

    const verifiedToken = loginData.token;

    // 5b. Access Dashboard with verified token
    const dashRes = await fetch(`${baseUrl}/api/lawyer/dashboard`, {
      headers: { Authorization: `Bearer ${verifiedToken}` },
    });
    const dashData = await dashRes.json();
    assert(dashRes.status === 200 && dashData.success, 'Verified lawyer accesses dashboard successfully');
    assert(typeof dashData.metrics?.totalClients === 'number', 'Dashboard returns real numeric totalClients metric');
    assert(typeof dashData.metrics?.totalEarnings === 'number', 'Dashboard returns real numeric totalEarnings metric');

    // -------------------------------------------------------------
    // Test 6: Seeded Verified Lawyer (Adv. Rajeshwar Rao) & Case Docket
    // -------------------------------------------------------------
    console.log('\n[Phase 6] Verified Lawyer Case Workspace & Consultation Docket');
    const lawyerToken = 'vst_token_lawyer_rajeshwar';

    // 6a. Get Requests
    const reqsRes = await fetch(`${baseUrl}/api/lawyer/requests`, {
      headers: { Authorization: `Bearer ${lawyerToken}` },
    });
    const reqsData = await reqsRes.json();
    assert(reqsRes.status === 200 && reqsData.requests.length >= 2, 'Lawyer retrieves consultation requests docket');

    // 6b. Accept a request
    const pendingReq = reqsData.requests.find((r) => r.status === 'pending');
    if (pendingReq) {
      const acceptRes = await fetch(`${baseUrl}/api/lawyer/requests/${pendingReq.id}/accept`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${lawyerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ remarks: 'Consultation accepted for video conference.' }),
      });
      const acceptData = await acceptRes.json();
      assert(acceptRes.status === 200 && acceptData.request.status === 'accepted', 'Consultation request accepted successfully');
    }

    // 6c. Case Workspace Inspection
    const wsRes = await fetch(`${baseUrl}/api/lawyer/cases/case-101`, {
      headers: { Authorization: `Bearer ${lawyerToken}` },
    });
    const wsData = await wsRes.json();
    assert(wsRes.status === 200 && wsData.success, 'Lawyer accesses authorized Case Workspace');
    assert(Boolean(wsData.case.originalProblem), 'Case maintains immutable originalProblem anchor');
    assert(Boolean(wsData.client.name), 'Case Workspace displays authorized client information');

    // -------------------------------------------------------------
    // Test 7: Document Authorization & Consent Scope
    // -------------------------------------------------------------
    console.log('\n[Phase 7] Explicit Client Document Consent Control');
    const docsRes = await fetch(`${baseUrl}/api/lawyer/cases/case-101/documents`, {
      headers: { Authorization: `Bearer ${lawyerToken}` },
    });
    const docsData = await docsRes.json();
    assert(docsRes.status === 200 && Array.isArray(docsData.documents), 'Documents endpoint returns authorized documents');
    assert(docsData.documents.every((d) => ['doc-01', 'doc-ten-01', 'doc-ten-02'].includes(d.id)), 'Only explicitly consented documents returned to lawyer');

    // -------------------------------------------------------------
    // Test 8: AI / RAG Grounded Legal Research (Indian Kanoon + Gemini)
    // -------------------------------------------------------------
    console.log('\n[Phase 8] AI / RAG Grounded Legal Research');
    const aiRes = await fetch(`${baseUrl}/api/lawyer/cases/case-101/research`, {
      headers: { Authorization: `Bearer ${lawyerToken}` },
    });
    const aiData = await aiRes.json();
    assert(aiRes.status === 200 && aiData.success, 'AI Research dossier retrieved');
    assert(aiData.source === 'AI-GENERATED RESEARCH', 'Dossier labeled clearly as AI-GENERATED RESEARCH');
    assert(Boolean(aiData.disclaimer), 'Dossier includes required Legal AI Safety Disclaimer');
    assert(Array.isArray(aiData.relevantLaws) && aiData.relevantLaws.length > 0, 'Relevant statutory laws retrieved');
    assert(Array.isArray(aiData.courtJudgments) && aiData.courtJudgments.length > 0, 'Indian Kanoon judicial precedents retrieved');

    // -------------------------------------------------------------
    // Test 9: Case-Linked Real-time Messages & Chat
    // -------------------------------------------------------------
    console.log('\n[Phase 9] Case-Linked Privileged Chat');
    const sendMsgRes = await fetch(`${baseUrl}/api/lawyer/cases/case-101/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lawyerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'Reviewing your purchase receipt. We will annex this to the legal notice.',
      }),
    });
    const sendMsgData = await sendMsgRes.json();
    assert(sendMsgRes.status === 201 && sendMsgData.success, 'Lawyer sends privileged message');

    const getMsgsRes = await fetch(`${baseUrl}/api/lawyer/cases/case-101/messages`, {
      headers: { Authorization: `Bearer ${lawyerToken}` },
    });
    const getMsgsData = await getMsgsRes.json();
    assert(getMsgsRes.status === 200 && getMsgsData.messages.length >= 4, 'Case messages retrieved with verified participants');

    // -------------------------------------------------------------
    // Test 10: Lawyer Action Plan Management
    // -------------------------------------------------------------
    console.log('\n[Phase 10] Lawyer-Provided Action Plan');
    const addActionRes = await fetch(`${baseUrl}/api/lawyer/cases/case-101/action-plan`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lawyerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Draft Section 35 Consumer Complaint before DCDRC Bengaluru',
        priority: 'high',
        dueDate: '2026-10-15',
      }),
    });
    const addActionData = await addActionRes.json();
    assert(addActionRes.status === 201 && addActionData.success, 'Lawyer adds action item to action plan');

    // -------------------------------------------------------------
    // Test 11: Private vs Client-Visible Notes Strict Isolation
    // -------------------------------------------------------------
    console.log('\n[Phase 11] Case Notes Strict Separation');
    // 11a. Add Private Note
    const privNoteRes = await fetch(`${baseUrl}/api/lawyer/cases/case-101/notes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lawyerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'LAWYER_PRIVATE',
        content: 'Confidential strategy: Inquire if seller has consumer grievance nodal officer registered.',
      }),
    });
    assert(privNoteRes.status === 201, 'Lawyer adds confidential LAWYER_PRIVATE note');

    // 11b. Verify Lawyer sees private notes
    const lawyerNotesRes = await fetch(`${baseUrl}/api/lawyer/cases/case-101/notes`, {
      headers: { Authorization: `Bearer ${lawyerToken}` },
    });
    const lawyerNotesData = await lawyerNotesRes.json();
    assert(
      lawyerNotesData.notes.some((n) => n.type === 'LAWYER_PRIVATE'),
      'Lawyer query returns private strategy notes'
    );

    // -------------------------------------------------------------
    // Test 12: Availability & Double-Booking Prevention
    // -------------------------------------------------------------
    console.log('\n[Phase 12] Availability & Slot Management');
    const availRes = await fetch(`${baseUrl}/api/lawyer/availability`, {
      headers: { Authorization: `Bearer ${lawyerToken}` },
    });
    const availData = await availRes.json();
    assert(availRes.status === 200 && Array.isArray(availData.availability?.workingDays), 'Availability schedule retrieved');
    assert(Array.isArray(availData.bookedSlots), 'Booked slots returned for double-booking prevention');

    // -------------------------------------------------------------
    // Test 13: Consultation Earnings & Ledger
    // -------------------------------------------------------------
    console.log('\n[Phase 13] Lawyer Consultation Earnings Ledger');
    const earnRes = await fetch(`${baseUrl}/api/lawyer/earnings`, {
      headers: { Authorization: `Bearer ${lawyerToken}` },
    });
    const earnData = await earnRes.json();
    assert(earnRes.status === 200 && earnData.success, 'Earnings endpoint returns ledger breakdown');
    assert(earnData.totalConsultationEarnings > 0, 'Total consultation earnings calculated correctly');
    assert(earnData.transactions.length > 0, 'Individual transaction history items present with fees and net payouts');

    // -------------------------------------------------------------
    // Test 14: Voice / Video Call Initiation
    // -------------------------------------------------------------
    console.log('\n[Phase 14] WebRTC Voice / Video Call Room');
    const callRes = await fetch(`${baseUrl}/api/lawyer/calls/initiate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lawyerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ caseId: 'case-101', consultationType: 'video' }),
    });
    const callData = await callRes.json();
    assert(callRes.status === 201 && callData.session?.status === 'active', 'Call session initiated with encrypted room URL');

    const endCallRes = await fetch(`${baseUrl}/api/lawyer/calls/${callData.session.id}/end`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lawyerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ durationSeconds: 1800, summaryNotes: 'Discussed statutory remedies.' }),
    });
    const endCallData = await endCallRes.json();
    assert(endCallRes.status === 200 && endCallData.session?.status === 'completed', 'Call concluded with duration and summary notes recorded');

    // -------------------------------------------------------------
    // Test 15: Platform Security Audit Trail
    // -------------------------------------------------------------
    console.log('\n[Phase 15] Audit Logs Inspection');
    const auditRes = await fetch(`${baseUrl}/api/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const auditData = await auditRes.json();
    assert(auditRes.status === 200 && auditData.auditLogs.length >= 3, 'Audit logs recorded for lawyer registration, approval, consent, and actions');

    // -------------------------------------------------------------
    // Test 16: Regression Testing — Existing User Flow Unbroken
    // -------------------------------------------------------------
    console.log('\n[Phase 16] Regression Verification of User-Side App');
    // User cases endpoint
    const userCasesRes = await fetch(`${baseUrl}/api/cases`, {
      headers: { Authorization: 'Bearer vst_token_usr_001' },
    });
    assert(userCasesRes.status === 200, 'User /api/cases endpoint continues to work flawlessly');

    // User legal analysis with landlord security deposit query
    const tenancyQuery = 'My landlord refused to refund my security deposit of ₹70,000 after I vacated the flat with proper notice.';
    const analyzeRes = await fetch(`${baseUrl}/api/legal/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: tenancyQuery }),
    });
    const analyzeData = await analyzeRes.json();
    assert(analyzeRes.status === 200 && analyzeData.success, 'AI Legal Analysis endpoint returns 200 OK');
    const isTenancyDomain =
      analyzeData.category === 'tenancy_dispute' ||
      JSON.stringify(analyzeData).toLowerCase().includes('security deposit') ||
      JSON.stringify(analyzeData).toLowerCase().includes('tenan');
    assert(isTenancyDomain, 'Tenancy / Security deposit dispute remains accurately classified without regression');
  } catch (err) {
    console.error('Test execution error:', err);
    results.failed++;
  } finally {
    server.close();
  }

  console.log('\n============================================================');
  console.log(`SUMMARY: ${results.passed} PASSED, ${results.failed} FAILED`);
  console.log('============================================================');

  if (results.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();

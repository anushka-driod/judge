import './helpers/safeTestEnvironment.js';
import app from '../src/app.js';
import http from 'node:http';

async function runPhase4Tests() {
  console.log('============================================================');
  console.log('VIDHI SETU PHASE 4: ADVOCATE REGISTRATION & ADMIN WORKFLOW');
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
    // Test 1: Advocate Registration
    // -------------------------------------------------------------
    console.log('[Test 1] Advocate Registration with Bar Credentials');
    const timestamp = Date.now();
    const advocatePayload = {
      name: 'Adv. Shruti Kulkarni',
      email: `shruti.kulkarni.${timestamp}@vidhisetu.in`,
      phone: '+91 98450 77889',
      password: 'AdvocatePass@2026',
      barRegistrationNumber: `KAR/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
      stateBarCouncil: 'Bar Council of Karnataka',
      yearOfEnrollment: 2018,
      yearsOfExperience: 8,
      jurisdiction: 'High Court of Karnataka',
      primaryCourt: 'High Court & City Civil Court Bengaluru',
      city: 'Bengaluru',
      languages: ['English', 'Kannada', 'Hindi'],
      specializations: ['tenancy_disputes', 'consumer_protection'],
      consultationFee: 1200,
      bio: 'Practicing advocate specializing in commercial tenancy and consumer law.',
      documents: [
        { name: 'Bar_Enrollment_Shruti.pdf', type: 'Bar Enrollment Certificate' },
        { name: 'Bar_ID_Shruti.pdf', type: 'Bar Council ID Card' },
      ],
    };

    const regRes = await fetch(`${baseUrl}/api/lawyer/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(advocatePayload),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201 && regData.success, 'Advocate registration returns 201 Created');
    assert(regData.verification_status === 'PENDING', 'Advocate initial verification status is PENDING');
    assert(Boolean(regData.token), 'Registration generates valid JWT authentication token');

    const advocateToken = regData.token;
    const advocateId = regData.lawyer.id;

    // -------------------------------------------------------------
    // Test 2: Unverified Advocate Role Guard Check
    // -------------------------------------------------------------
    console.log('\n[Test 2] Role-Guarded Advocate Chambers (Pending Status)');
    const dashRes = await fetch(`${baseUrl}/api/lawyer/dashboard`, {
      headers: { Authorization: `Bearer ${advocateToken}` },
    });
    assert(dashRes.status === 403, 'Pending advocate is blocked with 403 Forbidden on dashboard');
    const dashErr = await dashRes.json();
    assert(dashErr.code === 'ADVOCATE_NOT_VERIFIED', 'Blocked response returns code ADVOCATE_NOT_VERIFIED');
    assert(dashErr.verification_status === 'PENDING', 'Error response reports verification_status: PENDING');

    const casesRes = await fetch(`${baseUrl}/api/lawyer/cases`, {
      headers: { Authorization: `Bearer ${advocateToken}` },
    });
    assert(casesRes.status === 403, 'Pending advocate is blocked with 403 Forbidden on cases chamber');

    // Profile check must still be accessible for pending advocate
    const meRes = await fetch(`${baseUrl}/api/lawyer/me`, {
      headers: { Authorization: `Bearer ${advocateToken}` },
    });
    const meData = await meRes.json();
    assert(meRes.status === 200 && meData.isVerified === false, 'Pending advocate can access /api/lawyer/me with isVerified=false');

    // -------------------------------------------------------------
    // Test 3: Admin Review & Request Info
    // -------------------------------------------------------------
    console.log('\n[Test 3] Admin Review and More Info Request');
    const adminToken = 'vst_token_admin_super';

    // 3a. Admin lists lawyers with filter
    const listPendingRes = await fetch(`${baseUrl}/api/admin/lawyers?status=PENDING`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const listPendingData = await listPendingRes.json();
    assert(listPendingRes.status === 200 && listPendingData.lawyers.length > 0, 'Admin can list pending lawyers');
    const foundPending = listPendingData.lawyers.find((l) => l.id === advocateId || l.email === advocatePayload.email);
    assert(Boolean(foundPending), 'Newly registered advocate appears in admin pending list');

    // 3b. Admin inspects lawyer by ID
    const getRes = await fetch(`${baseUrl}/api/admin/lawyers/${advocateId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const getData = await getRes.json();
    assert(getRes.status === 200 && getData.lawyer.id === advocateId, 'Admin can inspect lawyer details by ID');

    // 3c. Admin moves status to UNDER_REVIEW
    const reviewRes = await fetch(`${baseUrl}/api/admin/lawyers/${advocateId}/review`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ remarks: 'Verifying Bar roll with Karnataka Bar Council.' }),
    });
    const reviewData = await reviewRes.json();
    assert(reviewRes.status === 200 && reviewData.lawyer.verification_status === 'UNDER_REVIEW', 'Admin moves status to UNDER_REVIEW');

    // 3d. Admin requests additional information
    const reqInfoRes = await fetch(`${baseUrl}/api/admin/lawyers/${advocateId}/request-info`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ remarks: 'Please upload notarized certificate copy.' }),
    });
    const reqInfoData = await reqInfoRes.json();
    assert(reqInfoRes.status === 200 && reqInfoData.lawyer.verification_status === 'PENDING', 'Admin request-info updates status to PENDING with remarks');

    // -------------------------------------------------------------
    // Test 4: Admin Approval & Chamber Access
    // -------------------------------------------------------------
    console.log('\n[Test 4] Admin Approval & Chambers Activation');
    const approveRes = await fetch(`${baseUrl}/api/admin/lawyers/${advocateId}/approve`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ remarks: 'Bar Council roll verified successfully.' }),
    });
    const approveData = await approveRes.json();
    assert(approveRes.status === 200 && approveData.lawyer.verification_status === 'VERIFIED', 'Admin approves lawyer to VERIFIED');
    assert(approveData.lawyer.is_available === true, 'Approved advocate is marked available for consultations');

    // 4b. Now advocate can access dashboard
    const verifiedDashRes = await fetch(`${baseUrl}/api/lawyer/dashboard`, {
      headers: { Authorization: `Bearer ${advocateToken}` },
    });
    const verifiedDashData = await verifiedDashRes.json();
    assert(verifiedDashRes.status === 200 && verifiedDashData.success, 'Verified advocate accesses dashboard successfully');
    assert(typeof verifiedDashData.metrics?.totalClients === 'number', 'Dashboard returns valid metrics object');

    // -------------------------------------------------------------
    // Test 5: Admin Suspension & Immediate Revocation of Chambers Access
    // -------------------------------------------------------------
    console.log('\n[Test 5] Admin Suspension & Chambers Lock');
    const suspendRes = await fetch(`${baseUrl}/api/admin/lawyers/${advocateId}/suspend`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: 'Disciplinary review initiated by state bar.' }),
    });
    const suspendData = await suspendRes.json();
    assert(suspendRes.status === 200 && suspendData.lawyer.verification_status === 'SUSPENDED', 'Admin suspends advocate to SUSPENDED');
    assert(suspendData.lawyer.is_available === false, 'Suspended advocate is marked unavailable');

    // 5b. Access to dashboard must now be blocked with 403
    const suspendedDashRes = await fetch(`${baseUrl}/api/lawyer/dashboard`, {
      headers: { Authorization: `Bearer ${advocateToken}` },
    });
    assert(suspendedDashRes.status === 403, 'Suspended advocate blocked with 403 on dashboard');

    // -------------------------------------------------------------
    // Test 6: Audit Logs Tracking
    // -------------------------------------------------------------
    console.log('\n[Test 6] Admin Audit Logs');
    const auditRes = await fetch(`${baseUrl}/api/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const auditData = await auditRes.json();
    assert(auditRes.status === 200 && Array.isArray(auditData.auditLogs), 'Admin audit logs retrieved');
    const registeredLog = auditData.auditLogs.find((l) => l.action === 'LAWYER_REGISTERED' && l.entityId === advocateId);
    assert(Boolean(registeredLog), 'Audit trail records LAWYER_REGISTERED event');
    const verifiedLog = auditData.auditLogs.find((l) => l.action === 'LAWYER_VERIFIED' && l.entityId === advocateId);
    assert(Boolean(verifiedLog), 'Audit trail records LAWYER_VERIFIED event');
    const suspendedLog = auditData.auditLogs.find((l) => l.action === 'LAWYER_SUSPENDED' && l.entityId === advocateId);
    assert(Boolean(suspendedLog), 'Audit trail records LAWYER_SUSPENDED event');

  } catch (err) {
    console.error('Test execution error:', err);
    results.failed++;
  } finally {
    server.close();
  }

  console.log('\n============================================================');
  console.log(`PHASE 4 SUMMARY: ${results.passed} PASSED, ${results.failed} FAILED`);
  console.log('============================================================');

  if (results.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase4Tests();
import './helpers/safeTestEnvironment.js';

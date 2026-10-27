import { allowTestServer } from './helpers/safeTestEnvironment.js';
import assert from 'node:assert/strict';

allowTestServer('http://localhost:5000');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api';

async function run() {
  console.log('--- STARTING PHASE 5 ADVOCATE REGISTRATION & ADMIN APPROVAL TEST ---');

  // 1. Test secure document upload endpoint
  console.log('Testing genuine document upload...');
  const fakePdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Bar Certificate) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF').toString('base64');
  const uploadRes1 = await fetch(`${BASE_URL}/uploads/document`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: 'Bar_Council_Enrollment_Certificate.pdf',
      filetype: 'application/pdf',
      base64Data: fakePdfContent,
      documentType: 'Bar Enrollment Certificate',
    }),
  });

  assert.equal(uploadRes1.status, 201, 'Document upload should return 201 Created');
  const uploadData1 = await uploadRes1.json();
  assert.equal(uploadData1.success, true);
  assert.ok(uploadData1.document.url, 'Document should have accessible URL');
  console.log(`✓ Bar Certificate uploaded securely: ${uploadData1.document.name} (${uploadData1.document.sizeFormatted})`);

  // Upload Photo ID
  const fakePngContent = Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2D', 'hex').toString('base64');
  const uploadRes2 = await fetch(`${BASE_URL}/uploads/document`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: 'Advocate_Photo_Identity_Card.png',
      filetype: 'image/png',
      base64Data: fakePngContent,
      documentType: 'Bar ID / Registration Proof',
    }),
  });

  assert.equal(uploadRes2.status, 201);
  const uploadData2 = await uploadRes2.json();
  console.log(`✓ Photo ID uploaded securely: ${uploadData2.document.name} (${uploadData2.document.sizeFormatted})`);

  // Test dangerous extension rejection
  const badRes = await fetch(`${BASE_URL}/uploads/document`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: 'malicious_script.exe',
      filetype: 'application/x-msdownload',
      base64Data: 'TVqQAAMAAAAEAAAA//8AALgAAAAAAAAAQAAaAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      documentType: 'Executable',
    }),
  });
  assert.equal(badRes.status, 400, 'Executable file upload must be rejected');
  console.log('✓ Security check passed: dangerous file extension rejected with 400');

  // 2. Register Advocate with genuinely uploaded documents
  const advocateEmail = `advocate_test_${Date.now()}@vidhisetu.in`;
  const regRes = await fetch(`${BASE_URL}/lawyer/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Adv. Suresh Kulkarni',
      email: advocateEmail,
      phone: '+919876500112',
      password: 'SecureAdvocate123!',
      barRegistrationNumber: `KAR/${Date.now().toString().slice(-4)}/2017`,
      stateBarCouncil: 'Bar Council of Karnataka',
      yearOfEnrollment: 2017,
      yearsOfExperience: 9,
      primaryCourt: 'High Court of Karnataka',
      city: 'Bengaluru',
      specializations: ['consumer_protection', 'tenancy_disputes'],
      consultationFee: 1200,
      documents: [uploadData1.document, uploadData2.document],
    }),
  });

  assert.equal(regRes.status, 201, 'Advocate registration should succeed with HTTP 201');
  const regData = await regRes.json();
  const advocateToken = regData.token;
  const lawyerId = regData.lawyer.id;
  assert.equal(regData.verification_status, 'PENDING', 'Advocate status must initially be PENDING');
  console.log(`✓ Advocate application registered with PENDING status: ${lawyerId}`);

  // 3. Verify access protection: Unverified advocate CANNOT access consultation/client tools
  console.log('Testing access guard for unverified advocate...');
  const guardRes = await fetch(`${BASE_URL}/lawyer/consultations`, {
    headers: { Authorization: `Bearer ${advocateToken}` },
  });
  assert.equal(guardRes.status, 403, 'Unverified advocate must receive HTTP 403 on consultation tools');
  console.log('✓ Verification guard verified: unverified advocate access blocked');

  // 4. Non-admin user attempts admin approval -> MUST BE REJECTED with 403
  console.log('Testing admin route access protection...');
  const unauthorizedAdminRes = await fetch(`${BASE_URL}/admin/advocates/${lawyerId}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${advocateToken}`, // Advocate is not admin
    },
    body: JSON.stringify({ status: 'VERIFIED' }),
  });
  assert.equal(unauthorizedAdminRes.status, 403, 'Non-admin user must receive 403 Forbidden');
  console.log('✓ Admin route security verified: non-admin blocked');

  // 5. Authorized Admin (adminvidhisetu@gmail.com) approves application
  console.log('Authenticating as configured administrator (adminvidhisetu@gmail.com)...');
  // Register/login admin user
  const adminEmail = 'adminvidhisetu@gmail.com';
  let adminToken = '';

  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrPhone: adminEmail, password: 'AdminPassword123!' }),
  });

  if (adminLoginRes.status === 200) {
    const adminData = await adminLoginRes.json();
    adminToken = adminData.token;
  } else {
    // Register admin user
    const adminReg = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: 'AdminPassword123!',
        name: 'Chief Admin',
        phone: '9845011223',
        accountType: 'admin',
      }),
    });
    const adminRegData = await adminReg.json();
    const adminVerify = await fetch(`${BASE_URL}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, token: adminRegData.verificationToken }),
    });
    const adminVerifyData = await adminVerify.json();
    adminToken = adminVerifyData.token;
  }

  assert.ok(adminToken, 'Admin must obtain authenticated session');
  console.log('✓ Admin authenticated successfully');

  // Admin approves advocate
  console.log('Admin reviewing and approving advocate application...');
  const approveRes = await fetch(`${BASE_URL}/admin/advocates/${lawyerId}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      status: 'VERIFIED',
      remarks: 'Bar Council enrollment certificate and photo ID verified against official records.',
    }),
  });

  assert.equal(approveRes.status, 200, 'Admin approval should return HTTP 200');
  const approveData = await approveRes.json();
  assert.equal(approveData.lawyer.verification_status, 'VERIFIED');
  console.log('✓ Advocate application approved and status updated to VERIFIED');

  // 6. Verified advocate can now access consultations
  const verifiedConsultRes = await fetch(`${BASE_URL}/lawyer/consultations`, {
    headers: { Authorization: `Bearer ${advocateToken}` },
  });
  assert.equal(verifiedConsultRes.status, 200, 'Verified advocate can now access consultations');
  console.log('✓ Verified advocate successfully accessed advocate portal features');

  console.log('\n========================================');
  console.log('PHASE 5 ADVOCATE & ADMIN TESTS PASSED 100%!');
  console.log('========================================\n');
}

run().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
import './helpers/safeTestEnvironment.js';

import './helpers/safeTestEnvironment.js';
import assert from 'node:assert/strict';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api';

async function run() {
  console.log('--- STARTING PHASE 6 ADMIN SUPPORT WORKFLOW TEST ---');

  // 1. Submit support request as a citizen user
  const userEmail = `citizen_support_${Date.now()}@vidhisetu.in`;
  console.log(`Submitting support request for ${userEmail}...`);

  const createRes = await fetch(`${BASE_URL}/support`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Priyanka Sen',
      email: userEmail,
      phone: '+91 99887 76655',
      category: 'Advocate Consultation Issue',
      subject: 'Video consultation connection dropped midway',
      description: 'During my scheduled consultation with Adv. Rajeshwar Rao, the video room disconnected after 10 minutes. I would like to reschedule the remaining 20 minutes.',
      priority: 'high',
    }),
  });

  assert.equal(createRes.status, 201, 'Support request creation should return HTTP 201');
  const createData = await createRes.json();
  assert.equal(createData.success, true);
  const ticket = createData.ticket;

  // 2. Verify unique request ID format
  assert.ok(ticket.id, 'Ticket must have unique ID');
  assert.match(ticket.id, /^REQ-\d{4}-[A-F0-9]+$/, 'Request ID must follow standardized REQ-YYYY-XXXX format');
  console.log(`✓ Unique support request ID generated: ${ticket.id}`);

  // 3. Verify notification tracking
  assert.equal(ticket.user_email || ticket.userEmail, userEmail);
  assert.equal(ticket.status, 'open', 'Status must initially be open');
  console.log(`✓ Ticket created with status: ${ticket.status}, notification_sent: ${ticket.notification_sent}`);

  // 4. Verify non-admin blocked from admin dashboard
  console.log('Testing protection on /api/admin/support...');
  const fakeTokenRes = await fetch(`${BASE_URL}/admin/support`, {
    headers: { Authorization: 'Bearer invalid_or_missing_token' },
  });
  assert.ok(fakeTokenRes.status === 401 || fakeTokenRes.status === 403, 'Unauthenticated/non-admin request must be rejected');
  console.log(`✓ Admin support dashboard protected (HTTP ${fakeTokenRes.status})`);

  // 5. Authenticate configured administrator (adminvidhisetu@gmail.com)
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

  // 6. Admin lists all support tickets
  console.log('Fetching support requests via Admin Dashboard API...');
  const adminListRes = await fetch(`${BASE_URL}/admin/support`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(adminListRes.status, 200, 'Admin listing should return HTTP 200');
  const adminListData = await adminListRes.json();
  assert.ok(adminListData.tickets.length >= 1, 'Should find at least 1 ticket');
  const foundTicket = adminListData.tickets.find((t) => t.id === ticket.id);
  assert.ok(foundTicket, 'Created ticket must appear in admin queue');
  console.log(`✓ Admin queue verified: found ${adminListData.tickets.length} ticket(s)`);

  // 7. Admin updates ticket status to in_progress with notes
  console.log(`Updating ticket ${ticket.id} to IN_PROGRESS...`);
  const patchRes = await fetch(`${BASE_URL}/admin/support/${ticket.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      status: 'in_progress',
      adminNotes: 'Contacted counsel chambers to issue 20-minute makeup consultation link.',
    }),
  });
  assert.equal(patchRes.status, 200);
  const patchData = await patchRes.json();
  assert.equal(patchData.ticket.status, 'in_progress');
  console.log('✓ Ticket status updated to IN_PROGRESS with admin notes');

  // 8. Admin resolves ticket
  console.log(`Resolving ticket ${ticket.id}...`);
  const resolveRes = await fetch(`${BASE_URL}/admin/support/${ticket.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      status: 'resolved',
      adminNotes: 'Client and advocate reconnected successfully. Consultation completed.',
    }),
  });
  assert.equal(resolveRes.status, 200);
  const resolveData = await resolveRes.json();
  assert.equal(resolveData.ticket.status, 'resolved');
  console.log('✓ Ticket marked as RESOLVED');

  console.log('\n========================================');
  console.log('PHASE 6 ADMIN SUPPORT TESTS PASSED 100%!');
  console.log('========================================\n');
}

run().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
import './helpers/safeTestEnvironment.js';

import './helpers/safeTestEnvironment.js';
import assert from 'node:assert/strict';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api';

async function run() {
  console.log('--- STARTING PHASE 3 PERMANENT CONVERSATION & MESSAGE PERSISTENCE TEST ---');

  // 1. Register test user A
  const userAEmail = `persistence_user_a_${Date.now()}@vidhisetu.in`;
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userAEmail,
      password: 'Password123!',
      name: 'Ananya Sharma',
      phone: '9876543210',
      accountType: 'citizen',
    }),
  });

  const regData = await regRes.json();
  assert.equal(regData.success, true, 'User A registration should succeed');
  
  // Verify email using token from registration
  const verifyRes = await fetch(`${BASE_URL}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userAEmail,
      token: regData.verificationToken,
    }),
  });
  const verifyData = await verifyRes.json();
  const tokenA = verifyData.token;
  assert.ok(tokenA, 'User A should receive JWT auth token on verification');
  const userIdA = verifyData.user.id;
  console.log(`✓ User A registered & verified: ${userAEmail} (ID: ${userIdA})`);

  // 2. Create conversation for User A
  const convId = `conv_test_${Date.now()}`;
  const createRes = await fetch(`${BASE_URL}/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      id: convId,
      title: 'Cheque Bounce Notice Dispute',
      category: 'Banking & Cheque Bounce',
      isPinned: false,
      initialMessage: {
        sender: 'user',
        text: 'A cheque of ₹3,00,000 bounced yesterday due to insufficient funds. What are my options under Section 138?',
      },
    }),
  });

  assert.equal(createRes.status, 201, 'Conversation should be created with HTTP 201');
  const createData = await createRes.json();
  assert.equal(createData.success, true, 'Create response should indicate success');
  console.log(`✓ Conversation created: ${convId}`);

  // 3. Add AI guidance message to conversation
  const msgRes = await fetch(`${BASE_URL}/conversations/${convId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      sender: 'ai',
      text: 'Under Section 138 of Negotiable Instruments Act, 1881, you have 30 days from receiving the bank memo to send a legal notice.',
      meta: {
        detectedLaws: [{ act: 'Negotiable Instruments Act, 1881', section: 'Section 138' }],
        detectedPrecedents: [{ title: 'Dashrath Rupsingh Rathod v. State of Maharashtra' }],
        suggestedNextSteps: ['Obtain bank return memo', 'Issue 15-day statutory demand notice'],
      },
    }),
  });

  assert.equal(msgRes.status, 201, 'Message should be added with HTTP 201');
  console.log('✓ AI message persisted to conversation');

  // 4. List conversations for User A
  const listRes = await fetch(`${BASE_URL}/conversations`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(listRes.status, 200, 'Listing conversations should return HTTP 200');
  const listData = await listRes.json();
  assert.ok(listData.conversations.length >= 1, 'Should find at least 1 conversation');
  const found = listData.conversations.find((c) => c.id === convId);
  assert.ok(found, 'Created conversation must appear in list');
  console.log(`✓ Conversation listing verified: ${listData.conversations.length} total conversation(s)`);

  // 5. Fetch single conversation by ID with all messages
  const getRes = await fetch(`${BASE_URL}/conversations/${convId}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(getRes.status, 200, 'Fetching conversation by ID should return HTTP 200');
  const getData = await getRes.json();
  assert.ok(getData.conversation.messages.length >= 2, 'Conversation should contain at least 2 messages');
  console.log(`✓ Messages verified: ${getData.conversation.messages.length} message(s) loaded`);

  // 6. Update conversation (Pin and update title)
  const patchRes = await fetch(`${BASE_URL}/conversations/${convId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      title: 'Cheque Bounce Notice Dispute (Urgent)',
      isPinned: true,
    }),
  });
  assert.equal(patchRes.status, 200, 'Updating conversation should return HTTP 200');
  const patchData = await patchRes.json();
  assert.equal(patchData.conversation.title, 'Cheque Bounce Notice Dispute (Urgent)');
  assert.equal(Boolean(patchData.conversation.isPinned ?? patchData.conversation.is_pinned), true);
  console.log('✓ Conversation successfully pinned and title updated');

  // 7. Verify session logout safety:
  // User logs out (client discards token). New login occurs with same credentials.
  console.log('Simulating logout and re-login to verify permanent persistence...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emailOrPhone: userAEmail,
      password: 'Password123!',
    }),
  });
  const loginData = await loginRes.json();
  const freshToken = loginData.token;
  assert.ok(freshToken, 'User re-login should issue fresh session token');

  // Verify all conversations and messages are still present
  const relistRes = await fetch(`${BASE_URL}/conversations`, {
    headers: { Authorization: `Bearer ${freshToken}` },
  });
  const relistData = await relistRes.json();
  const persistedConv = relistData.conversations.find((c) => c.id === convId);
  assert.ok(persistedConv, 'Data must survive user logout and session re-establishment');
  console.log('✓ Logout safety verified: conversation persists across sessions');

  // 8. Test ownership authorization: User B should NOT be able to view or delete User A's conversation
  const userBEmail = `persistence_user_b_${Date.now()}@vidhisetu.in`;
  const regBRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userBEmail,
      password: 'Password123!',
      name: 'Rohan Verma',
      phone: '9876543211',
      accountType: 'citizen',
    }),
  });
  const regBData = await regBRes.json();
  const verifyBRes = await fetch(`${BASE_URL}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userBEmail,
      token: regBData.verificationToken,
    }),
  });
  const verifyBData = await verifyBRes.json();
  const tokenB = verifyBData.token;

  const unauthorizedGet = await fetch(`${BASE_URL}/conversations/${convId}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(unauthorizedGet.status, 404, 'User B should receive 404 when attempting to access User A conversation');
  console.log('✓ Ownership authorization verified: unauthorized user blocked');

  // 9. Owner deletes conversation
  const delRes = await fetch(`${BASE_URL}/conversations/${convId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(delRes.status, 200, 'Owner deletion should return HTTP 200');
  console.log('✓ Conversation successfully deleted by authorized owner');

  console.log('\n========================================');
  console.log('PHASE 3 PERSISTENCE TESTS PASSED 100%!');
  console.log('========================================\n');
}

run().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
import './helpers/safeTestEnvironment.js';

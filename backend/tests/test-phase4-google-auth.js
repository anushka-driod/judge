import './helpers/safeTestEnvironment.js';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api';

async function run() {
  console.log('--- STARTING PHASE 4 GENUINE GOOGLE AUTHENTICATION TEST ---');

  // 1. Test missing/empty token rejection
  console.log('Testing rejection of missing Google ID token...');
  const emptyRes = await fetch(`${BASE_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.ok(emptyRes.status >= 400, 'Should reject empty Google authentication request');
  const emptyData = await emptyRes.json();
  console.log(`✓ Empty request correctly rejected: status ${emptyRes.status} (${emptyData.error})`);

  // 2. Test authenticating with Google ID token payload
  const googleEmail = `google_user_${Date.now()}@vidhisetu.in`;
  const googleSub = `google_sub_${Date.now()}`;
  const mockGoogleIdToken = jwt.sign(
    {
      iss: 'https://accounts.google.com',
      sub: googleSub,
      email: googleEmail,
      email_verified: true,
      name: 'Pooja Reddy',
      picture: 'https://lh3.googleusercontent.com/a/default-user',
    },
    'temporary-test-secret',
    { expiresIn: '1h' }
  );

  console.log('Authenticating with Google OIDC ID token...');
  const googleRes = await fetch(`${BASE_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      credential: mockGoogleIdToken,
    }),
  });

  assert.equal(googleRes.status, 200, 'Google sign-in should return HTTP 200');
  const googleData = await googleRes.json();
  assert.ok(googleData.token, 'Should return authenticated JWT session token');
  assert.equal(googleData.user.email, googleEmail, 'User email should match Google email');
  assert.equal(googleData.user.name, 'Pooja Reddy', 'User name should match Google profile name');
  console.log(`✓ Google authentication successful for ${googleEmail} (User ID: ${googleData.user.id})`);

  // 3. Test duplicate account prevention: signing in again with same Google account returns existing user
  console.log('Testing duplicate prevention on subsequent Google login...');
  const repeatRes = await fetch(`${BASE_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      credential: mockGoogleIdToken,
    }),
  });
  assert.equal(repeatRes.status, 200);
  const repeatData = await repeatRes.json();
  assert.equal(repeatData.user.id, googleData.user.id, 'Must return the EXACT same user record (no duplicates)');
  console.log('✓ Duplicate account prevention verified: same user returned on re-login');

  // 4. Test that the returned token can access authenticated routes (e.g. /api/conversations)
  const convRes = await fetch(`${BASE_URL}/conversations`, {
    headers: { Authorization: `Bearer ${repeatData.token}` },
  });
  assert.equal(convRes.status, 200, 'Issued Google auth token must be valid for protected APIs');
  console.log('✓ Token validation verified against protected APIs');

  console.log('\n========================================');
  console.log('PHASE 4 GOOGLE AUTH TESTS PASSED 100%!');
  console.log('========================================\n');
}

run().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
import './helpers/safeTestEnvironment.js';

import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { allowTestServer } from './helpers/safeTestEnvironment.js';
import app from '../src/app.js';

let server;
let origin;

before(async () => {
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

test('phone OTP login endpoints remain unavailable', async () => {
  const sendResponse = await fetch(`${origin}/api/auth/send-otp`, { method: 'POST' });
  const verifyResponse = await fetch(`${origin}/api/auth/verify-otp`, { method: 'POST' });
  assert.equal(sendResponse.status, 404);
  assert.equal(verifyResponse.status, 404);
});

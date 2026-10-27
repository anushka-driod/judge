import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { allowTestServer } from './helpers/safeTestEnvironment.js';
import {
  isOriginAllowed,
  getAllowedOrigins,
  normalizeOrigin,
  parseOrigins,
  DEFAULT_PRODUCTION_ORIGINS,
  DEFAULT_DEV_ORIGINS,
} from '../src/config/corsConfig.js';

let app;
let server;
let baseUrl;

before(async () => {
  ({ default: app } = await import('../src/app.js'));

  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  allowTestServer(baseUrl);
});

after(async () => {
  if (server?.listening) {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test('CORS: Unit - normalizeOrigin and parseOrigins handle edge cases and whitespace', () => {
  assert.equal(normalizeOrigin('https://vidhi-setu.in/'), 'https://vidhi-setu.in');
  assert.equal(normalizeOrigin('  https://www.vidhi-setu.in/// '), 'https://www.vidhi-setu.in');
  assert.equal(normalizeOrigin(''), '');
  assert.equal(normalizeOrigin(null), '');

  const parsed = parseOrigins('https://vidhi-setu.in, https://www.vidhi-setu.in; http://localhost:5173');
  assert.deepEqual(parsed, [
    'https://vidhi-setu.in',
    'https://www.vidhi-setu.in',
    'http://localhost:5173',
  ]);
});

test('CORS: Unit - Production environment allows both production frontend domains and rejects arbitrary origins', () => {
  const prodEnv = { NODE_ENV: 'production' };

  // Production domains MUST be allowed
  assert.equal(isOriginAllowed('https://vidhi-setu.in', prodEnv), true);
  assert.equal(isOriginAllowed('https://www.vidhi-setu.in', prodEnv), true);
  assert.equal(isOriginAllowed('https://vidhi-setu.in/', prodEnv), true, 'Trailing slash normalized');
  assert.equal(isOriginAllowed('HTTPS://WWW.VIDHI-SETU.IN', prodEnv), true, 'Case-insensitive');

  // Arbitrary external origins MUST be rejected in production
  assert.equal(isOriginAllowed('https://evil-attacker.com', prodEnv), false);
  assert.equal(isOriginAllowed('https://fake-vidhi-setu.in.attacker.org', prodEnv), false);
  assert.equal(isOriginAllowed('http://localhost:5173', prodEnv), false, 'Default localhost disallowed in production unless configured');

  // Server-to-server / curl without Origin header is allowed
  assert.equal(isOriginAllowed(null, prodEnv), true);
  assert.equal(isOriginAllowed(undefined, prodEnv), true);
});

test('CORS: Unit - Development environment allows local origins and tunnels', () => {
  const devEnv = { NODE_ENV: 'development' };

  assert.equal(isOriginAllowed('http://localhost:5173', devEnv), true);
  assert.equal(isOriginAllowed('http://localhost:5174', devEnv), true);
  assert.equal(isOriginAllowed('http://127.0.0.1:5173', devEnv), true);
  assert.equal(isOriginAllowed('http://127.0.0.1:5174', devEnv), true);
  assert.equal(isOriginAllowed('https://custom-demo.trycloudflare.com', devEnv), true);
  assert.equal(isOriginAllowed('https://preview.vercel.app', devEnv), true);

  // Production domains still allowed in dev
  assert.equal(isOriginAllowed('https://vidhi-setu.in', devEnv), true);
  assert.equal(isOriginAllowed('https://www.vidhi-setu.in', devEnv), true);
});

test('CORS: Unit - Configurable origins via environment variables in production', () => {
  const customProdEnv = {
    NODE_ENV: 'production',
    ALLOWED_ORIGINS: 'https://staging.vidhi-setu.in, https://custom-portal.in',
    FRONTEND_URL: 'https://admin.vidhi-setu.in',
  };

  assert.equal(isOriginAllowed('https://staging.vidhi-setu.in', customProdEnv), true);
  assert.equal(isOriginAllowed('https://custom-portal.in', customProdEnv), true);
  assert.equal(isOriginAllowed('https://admin.vidhi-setu.in', customProdEnv), true);
  assert.equal(isOriginAllowed('https://vidhi-setu.in', customProdEnv), true, 'Base domain still preserved');
  assert.equal(isOriginAllowed('https://www.vidhi-setu.in', customProdEnv), true, 'WWW domain still preserved');
  assert.equal(isOriginAllowed('https://random-unauthorized.com', customProdEnv), false);
});

test('CORS: HTTP - Production origin https://vidhi-setu.in succeeds with credentials and valid headers', async () => {
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const res = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: {
        Origin: 'https://vidhi-setu.in',
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://vidhi-setu.in');
    assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
    assert.notEqual(res.headers.get('access-control-allow-origin'), '*', 'Never combines credentials with wildcard');
  } finally {
    process.env.NODE_ENV = prevEnv;
  }
});

test('CORS: HTTP - Production origin https://www.vidhi-setu.in succeeds with credentials and valid headers', async () => {
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const res = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: {
        Origin: 'https://www.vidhi-setu.in',
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://www.vidhi-setu.in');
    assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
    assert.notEqual(res.headers.get('access-control-allow-origin'), '*', 'Never combines credentials with wildcard');
  } finally {
    process.env.NODE_ENV = prevEnv;
  }
});

test('CORS: HTTP - OPTIONS preflight handles production origins correctly with 204 status', async () => {
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    // 1. Preflight for apex domain
    const preflightApex = await fetch(`${baseUrl}/api/cases`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://vidhi-setu.in',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
      },
    });

    assert.equal(preflightApex.status, 204);
    assert.equal(preflightApex.headers.get('access-control-allow-origin'), 'https://vidhi-setu.in');
    assert.equal(preflightApex.headers.get('access-control-allow-credentials'), 'true');
    assert.match(preflightApex.headers.get('access-control-allow-methods'), /POST/);
    assert.match(preflightApex.headers.get('access-control-allow-headers'), /Authorization/i);

    // 2. Preflight for www subdomain
    const preflightWww = await fetch(`${baseUrl}/api/legal/analyze`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://www.vidhi-setu.in',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
      },
    });

    assert.equal(preflightWww.status, 204);
    assert.equal(preflightWww.headers.get('access-control-allow-origin'), 'https://www.vidhi-setu.in');
    assert.equal(preflightWww.headers.get('access-control-allow-credentials'), 'true');
  } finally {
    process.env.NODE_ENV = prevEnv;
  }
});

test('CORS: HTTP - Unauthorized origin in production is rejected and receives no allow-origin header', async () => {
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const res = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: {
        Origin: 'https://malicious-attacker.com',
      },
    });

    // In production, unauthorized origins are rejected
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.match(data.error, /Origin https:\/\/malicious-attacker\.com not allowed by CORS policy/);
    assert.equal(res.headers.get('access-control-allow-origin'), null, 'No allow-origin header returned');
  } finally {
    process.env.NODE_ENV = prevEnv;
  }
});

test('CORS: HTTP - Preflight OPTIONS from unauthorized origin in production is rejected', async () => {
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const preflight = await fetch(`${baseUrl}/api/cases`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://evil-phishing-site.com',
        'Access-Control-Request-Method': 'POST',
      },
    });

    assert.equal(preflight.status, 403);
    assert.equal(preflight.headers.get('access-control-allow-origin'), null, 'No allow-origin header returned to attacker');
  } finally {
    process.env.NODE_ENV = prevEnv;
  }
});

test('CORS: HTTP - Requests without Origin header (curl, server-to-server) proceed successfully', async () => {
  const res = await fetch(`${baseUrl}/health`, {
    method: 'GET',
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.project, 'EarnLaw (VidhiSetu)');
});

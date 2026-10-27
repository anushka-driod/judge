import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

if (process.env.NODE_ENV !== 'test' || process.env.VIDHISETU_TEST_MODE !== 'isolated') {
  throw new Error('Refusing to run tests: load backend/.env.test and use the isolated test environment.');
}

const liveCredentialKeys = [
  'DATABASE_URL',
  'ANUDB_HOST',
  'ANUDB_PORT',
  'ANUDB_DATABASE',
  'ANUDB_USER',
  'ANUDB_PASSWORD',
  'PGHOST',
  'PGPORT',
  'PGDATABASE',
  'PGUSER',
  'PGPASSWORD',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_PASSWORD',
  'SMTP_FROM',
  'EMAIL_FROM',
  'EMAIL_USER',
  'EMAIL_PASSWORD',
  'GMAIL_USER',
  'GMAIL_APP_PASSWORD',
  'FAST2SMS_API_KEY',
  'FAST2SMS_SENDER_ID',
  'FAST2SMS_DLT_TEMPLATE_ID',
  'FAST2SMS_OTP_ID',
  'FAST2SMS_OTP_EXPIRY_MINUTES',
  'FAST2SMS_WHATSAPP_ENABLED',
  'FAST2SMS_WHATSAPP_PHONE_NUMBER_ID',
  'FAST2SMS_WHATSAPP_TEMPLATE_NAME',
  'FAST2SMS_WHATSAPP_TEMPLATE_LANGUAGE',
  'FAST2SMS_WHATSAPP_API_VERSION',
  'FAST2SMS_WHATSAPP_SMS_FALLBACK',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'SMS_GATEWAY_URL',
  'SMS_GATEWAY_BEARER',
  'GOOGLE_CLIENT_ID',
];

const configuredLiveKeys = liveCredentialKeys.filter((key) => process.env[key]?.trim());
if (configuredLiveKeys.length) {
  throw new Error(`Refusing to run isolated tests with configured live integrations: ${configuredLiveKeys.join(', ')}`);
}

process.env.JWT_SECRET = 'vidhisetu-isolated-test-only-signing-key';
process.env.ADMIN_EMAIL = 'admin@example.test';
for (const key of liveCredentialKeys) process.env[key] = '';
process.env.USE_MEMORY_FALLBACK = 'true';
process.env.ENABLE_DEMO_OTP = 'false';
process.env.MOCK_EMAIL = 'true';
process.env.MOCK_SMS = 'true';

const testDataDir = path.join(os.tmpdir(), `vidhisetu-isolated-tests-${process.pid}-${randomUUID()}`);
fs.mkdirSync(testDataDir, { recursive: true });
process.env.VIDHISETU_DATA_DIR = testDataDir;
process.env.VIDHISETU_UPLOAD_DIR = path.join(testDataDir, 'uploads');
process.once('exit', () => fs.rmSync(testDataDir, { recursive: true, force: true }));

const allowedOrigins = new Set();
const allowedPorts = new Set();
const nativeFetch = globalThis.fetch.bind(globalThis);

export function allowTestServer(origin) {
  const url = new URL(origin);
  if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
    throw new Error('Isolated tests may only allow loopback server origins.');
  }
  allowedOrigins.add(url.origin);
  allowedPorts.add(Number(url.port));
}

globalThis.fetch = (input, ...args) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (!allowedOrigins.has(url.origin)) {
    return Promise.reject(new Error(`Network access blocked by isolated test environment: ${url.origin}`));
  }
  return nativeFetch(input, ...args);
};

const nativeSocketConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function safeTestSocketConnect(...args) {
  const connection = Array.isArray(args[0]) ? args[0][0] : args[0];
  const options = typeof connection === 'object'
    ? connection
    : { port: connection, host: typeof args[1] === 'string' ? args[1] : 'localhost' };
  const host = options.host || options.hostname || 'localhost';
  const isLoopback = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  if (isLoopback && allowedPorts.has(Number(options.port))) {
    return nativeSocketConnect.apply(this, args);
  }
  throw new Error(`Socket access blocked by isolated test environment: ${host}:${options.port}`);
};

import { networkManager } from '../src/services/networkManager.js';

const integrationKeys = [
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
  'GEMINI_API_KEY',
  'INDIANKANOON_API_TOKEN',
  'INDIAN_KANOON_API_TOKEN',
];

const configuredIntegrations = integrationKeys.filter((key) => process.env[key]?.trim());
if (configuredIntegrations.length > 0) {
  throw new Error(`Refusing to run isolated tests with configured live integrations: ${configuredIntegrations.join(', ')}`);
}

process.env.NODE_ENV = 'test';
process.env.VIDHISETU_TEST_MODE = 'isolated';
networkManager.setOfflineMode(true);

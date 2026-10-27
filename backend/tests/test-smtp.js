import './helpers/safeTestEnvironment.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

console.log('Testing SMTP connection with:');
console.log('Host:', process.env.SMTP_HOST);
console.log('Port:', process.env.SMTP_PORT);
console.log('User:', process.env.SMTP_USER);
console.log('Pass exists:', Boolean(process.env.SMTP_PASS));

const user = (process.env.SMTP_USER || '').trim().replace(/\s+/g, '');
const pass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '').trim().replace(/\s+/g, '');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user, pass },
});

transporter.verify()
  .then(() => {
    console.log('SUCCESS: SMTP connection verified successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('ERROR: SMTP verify failed:', err.message);
    process.exit(1);
  });
import './helpers/safeTestEnvironment.js';

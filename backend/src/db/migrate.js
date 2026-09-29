import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  console.log('====================================================');
  console.log('EarnLaw AnuDB Migration Runner — Member 2');
  console.log('====================================================');

  const isConnected = await db.testConnection();
  if (!isConnected) {
    console.warn('[Migration Warning] Cannot connect to AnuDB PostgreSQL. Ensure PostgreSQL is active.');
    if (process.env.USE_MEMORY_FALLBACK === 'true') {
      console.log('[Migration Info] Fallback memory mode is enabled. Server can still operate with in-memory store.');
      process.exit(0);
    } else {
      process.exit(1);
    }
  }

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    try {
      console.log(`Applying ${file} to AnuDB...`);
      await db.query(sql);
      console.log(`  ✓ ${file} applied successfully.`);
    } catch (err) {
      console.error(`Migration failed on ${file}:`, err.message);
      process.exit(1);
    }
  }
  console.log(' All AnuDB migrations completed successfully.');
  process.exit(0);
}

runMigrations();

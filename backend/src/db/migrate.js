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

  const migrationFile = path.join(__dirname, 'migrations', '001_master_anudb_schema.sql');
  if (!fs.existsSync(migrationFile)) {
    console.error(`Migration file not found: ${migrationFile}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationFile, 'utf-8');
  try {
    console.log('Applying 001_master_anudb_schema.sql to AnuDB...');
    await db.query(sql);
    console.log(' Master schema applied successfully to AnuDB.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

runMigrations();

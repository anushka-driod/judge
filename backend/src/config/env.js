import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Robust environment variable loader.
 * Ensures backend/.env is consistently loaded regardless of whether
 * node is launched from the project root, backend subfolder, or container root.
 */
export function loadEnvironment() {
  if (process.env.NODE_ENV === 'test' && process.env.VIDHISETU_TEST_MODE === 'isolated') {
    return;
  }

  // 1. Explicitly load backend/.env
  const backendEnv = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(backendEnv)) {
    dotenv.config({ path: backendEnv });
  }

  // 2. Load root .env if it exists
  const rootEnv = path.resolve(__dirname, '../../../.env');
  if (fs.existsSync(rootEnv)) {
    dotenv.config({ path: rootEnv });
  }

  // 3. Fallback to process.cwd() .env
  dotenv.config();
}

loadEnvironment();

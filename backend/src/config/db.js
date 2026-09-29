import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// AnuDB PostgreSQL Connection Pool Configuration
const poolConfig = {
  host: process.env.ANUDB_HOST || 'localhost',
  port: parseInt(process.env.ANUDB_PORT || '5432', 10),
  database: process.env.ANUDB_DATABASE || 'anudb',
  user: process.env.ANUDB_USER || 'postgres',
  password: process.env.ANUDB_PASSWORD || 'postgres',
  max: parseInt(process.env.ANUDB_POOL_MAX || '20', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
  ssl: process.env.ANUDB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

let pool = null;
let isConnected = false;

try {
  pool = new Pool(poolConfig);
  pool.on('error', (err) => {
    console.error('[AnuDB Client] Unexpected idle client error:', err.message);
  });
} catch (err) {
  console.warn('[AnuDB Client] Failed to initialize connection pool:', err.message);
}

/**
 * Execute a SQL query against AnuDB with fallback awareness
 * @param {string} text - SQL Query String
 * @param {Array} [params] - Query Parameters
 * @returns {Promise<Object>} Query Result with rows array
 */
export async function query(text, params = []) {
  if (pool) {
    try {
      const start = Date.now();
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      if (process.env.NODE_ENV === 'development') {
        console.log(`[AnuDB Query] (${duration}ms): ${text.substring(0, 80).replace(/\s+/g, ' ')}...`);
      }
      return res;
    } catch (err) {
      // If live AnuDB database is unavailable and fallback enabled
      if (process.env.USE_MEMORY_FALLBACK === 'true') {
        console.warn(`[AnuDB Fallback] Live database unreachable (${err.code || err.message}). Using memory layer.`);
        return { rows: [], rowCount: 0, isFallback: true };
      }
      throw err;
    }
  }
  return { rows: [], rowCount: 0, isFallback: true };
}

/**
 * Test connectivity to AnuDB
 */
export async function testConnection() {
  try {
    if (!pool) return false;
    const res = await pool.query('SELECT NOW() AS current_time');
    isConnected = true;
    console.log(`[AnuDB Connection] Connected successfully at ${res.rows[0].current_time}`);
    return true;
  } catch (err) {
    isConnected = false;
    console.warn(`[AnuDB Connection] Live PostgreSQL not responding on ${poolConfig.host}:${poolConfig.port}: ${err.message}`);
    return false;
  }
}

export function getPool() {
  return pool;
}

export default {
  query,
  testConnection,
  getPool,
};

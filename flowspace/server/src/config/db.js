import mysql from 'mysql2/promise';
import { env } from './env.js';

/**
 * Returns a cached MySQL connection pool stored on globalThis.__flowspacePool.
 * Caching on globalThis ensures warm Vercel serverless function invocations
 * reuse existing TCP/TLS connections instead of exhausting TiDB Cloud / MySQL
 * connection limits on every request.
 */
export function getPool() {
  if (!globalThis.__flowspacePool) {
    const poolConfig = {
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      timezone: 'Z',
      charset: 'utf8mb4',
      dateStrings: ['DATE'],
    };

    if (env.DB_SSL === true) {
      poolConfig.ssl = {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true,
      };
    }

    globalThis.__flowspacePool = mysql.createPool(poolConfig);
  }

  return globalThis.__flowspacePool;
}

/**
 * Executes a parameterized SQL query using prepared statements (`pool.execute`).
 * Converts any `undefined` bind parameters to `null` to prevent mysql2 errors.
 *
 * @param {string} sql - Parameterized SQL string with `?` placeholders
 * @param {Array<any>} [params=[]] - Bind parameter values
 * @param {import('mysql2/promise').PoolConnection | import('mysql2/promise').Pool} [executor] - Optional transaction connection
 * @returns {Promise<[any, import('mysql2/promise').FieldPacket[]]>}
 */
export async function query(sql, params = [], executor = null) {
  const safeParams = params.map((p) => (p === undefined ? null : p));
  const target = executor || getPool();
  return target.execute(sql, safeParams);
}

/**
 * Runs a callback inside an ACID database transaction.
 * Automatically commits on resolve, rolls back on throw, and always releases
 * the connection back to the pool.
 *
 * @template T
 * @param {(conn: import('mysql2/promise').PoolConnection) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withTransaction(fn) {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      // Ignore rollback errors if connection already dropped
    }
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Health check query used by GET /api/health to verify MySQL / TiDB connectivity.
 *
 * @returns {Promise<{ ok: boolean, latencyMs: number, error?: string }>}
 */
export async function checkDbHealth() {
  const start = Date.now();
  try {
    const pool = getPool();
    await pool.execute('SELECT 1 AS ok');
    return {
      ok: true,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: err.message,
    };
  }
}

/**
 * Closes the cached pool (used during graceful shutdown or test teardown).
 */
export async function closePool() {
  if (globalThis.__flowspacePool) {
    const pool = globalThis.__flowspacePool;
    globalThis.__flowspacePool = null;
    await pool.end();
  }
}

export default {
  getPool,
  query,
  withTransaction,
  checkDbHealth,
  closePool,
};

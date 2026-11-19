import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { env } from '../src/config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.resolve(__dirname, 'schema.sql');

/**
 * Strips SQL line comments and splits a schema file into individual executable statements.
 */
function parseSqlStatements(sqlContent) {
  const withoutComments = sqlContent
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

  return withoutComments
    .split(';')
    .map((stmt) => stmt.trim())
    .filter(Boolean);
}

/**
 * Creates the target database if it does not exist and runs all DDL statements in schema.sql.
 */
export async function runSetup({ silent = false } = {}) {
  const baseConfig = {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    timezone: 'Z',
    charset: 'utf8mb4',
  };

  if (env.DB_SSL === true) {
    baseConfig.ssl = {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
    };
  }

  let bootstrapConn;
  try {
    // 1. Connect without database to ensure the target schema exists
    bootstrapConn = await mysql.createConnection(baseConfig);
    const safeDbName = env.DB_NAME.replace(/[^a-zA-Z0-9_]/g, '');
    await bootstrapConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${safeDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await bootstrapConn.end();

    // 2. Connect directly to the target database and run schema.sql
    const dbConn = await mysql.createConnection({
      ...baseConfig,
      database: safeDbName,
    });

    const schemaRaw = await fs.readFile(SCHEMA_PATH, 'utf8');
    const statements = parseSqlStatements(schemaRaw);

    for (const statement of statements) {
      await dbConn.query(statement);
    }

    await dbConn.end();

    if (!silent) {
      console.log(
        `✅ Database "${safeDbName}" initialized (${statements.length} tables verified on ${env.DB_HOST}:${env.DB_PORT}).`
      );
    }
  } catch (err) {
    if (bootstrapConn) {
      try {
        await bootstrapConn.end();
      } catch {
        // Ignore close error
      }
    }

    if (!silent) {
      console.error('\n❌ Database setup failed:', err.message);
      if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        console.error(
          '💡 Tip: Check DB_USER and DB_PASSWORD in flowspace/.env (e.g., set your local MySQL root password or TiDB Cloud credentials).'
        );
      } else if (err.code === 'ECONNREFUSED') {
        console.error(
          `💡 Tip: Ensure MySQL is running on ${env.DB_HOST}:${env.DB_PORT} (e.g., \`brew services start mysql\`).`
        );
      }
    }
    throw err;
  }
}

// Execute immediately if run via `node server/db/setup.js`
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runSetup()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

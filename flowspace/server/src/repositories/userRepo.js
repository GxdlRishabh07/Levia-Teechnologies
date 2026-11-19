import { query } from '../config/db.js';

/**
 * Maps a raw MySQL `users` row (snake_case) to a camelCase user object.
 */
function mapUserRow(row, { includePassword = false } = {}) {
  if (!row) return null;
  const user = {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    createdAt: row.created_at,
  };
  if (includePassword) {
    user.passwordHash = row.password_hash;
  }
  return user;
}

/**
 * Inserts a new user into `users` and returns the created user record.
 *
 * @param {{ name: string, email: string, passwordHash: string }} data
 * @param {import('mysql2/promise').PoolConnection} [conn]
 */
export async function createUser({ name, email, passwordHash }, conn = null) {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();

  const [result] = await query(
    `INSERT INTO users (name, email, password_hash)
     VALUES (?, ?, ?)`,
    [trimmedName, normalizedEmail, passwordHash],
    conn
  );

  return findById(result.insertId, conn);
}

/**
 * Finds a user by email address (includes `passwordHash` for login verification).
 *
 * @param {string} email
 * @param {import('mysql2/promise').PoolConnection} [conn]
 */
export async function findByEmail(email, conn = null) {
  if (!email) return null;
  const normalizedEmail = email.trim().toLowerCase();

  const [rows] = await query(
    `SELECT id, name, email, password_hash, created_at
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [normalizedEmail],
    conn
  );

  return mapUserRow(rows[0], { includePassword: true });
}

/**
 * Finds a user by primary key `id` (excludes `passwordHash` for safe serialization).
 *
 * @param {number} id
 * @param {import('mysql2/promise').PoolConnection} [conn]
 */
export async function findById(id, conn = null) {
  const [rows] = await query(
    `SELECT id, name, email, created_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [Number(id)],
    conn
  );

  return mapUserRow(rows[0], { includePassword: false });
}

export default {
  createUser,
  findByEmail,
  findById,
};

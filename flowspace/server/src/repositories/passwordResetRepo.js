import { query } from '../config/db.js';

/**
 * Inserts a new password reset token record.
 *
 * @param {{ userId: number, tokenHash: string, expiresAt: Date | string }} data
 * @param {import('mysql2/promise').PoolConnection} [conn]
 */
export async function createResetToken({ userId, tokenHash, expiresAt }, conn = null) {
  const [result] = await query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES (?, ?, ?)`,
    [Number(userId), tokenHash, expiresAt],
    conn
  );

  return {
    id: result.insertId,
    userId: Number(userId),
    tokenHash,
    expiresAt,
  };
}

/**
 * Finds an unexpired, unused reset token by its SHA-256 hash.
 *
 * @param {string} tokenHash
 * @param {import('mysql2/promise').PoolConnection} [conn]
 */
export async function findValidToken(tokenHash, conn = null) {
  if (!tokenHash) return null;

  const [rows] = await query(
    `SELECT id, user_id, token_hash, expires_at, used_at, created_at
     FROM password_reset_tokens
     WHERE token_hash = ?
       AND used_at IS NULL
       AND expires_at > UTC_TIMESTAMP()
     LIMIT 1`,
    [tokenHash],
    conn
  );

  if (!rows || rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    createdAt: row.created_at,
  };
}

/**
 * Marks a password reset token as used.
 *
 * @param {number} id
 * @param {import('mysql2/promise').PoolConnection} [conn]
 */
export async function markTokenUsed(id, conn = null) {
  const [result] = await query(
    `UPDATE password_reset_tokens
     SET used_at = UTC_TIMESTAMP()
     WHERE id = ?`,
    [Number(id)],
    conn
  );

  return result.affectedRows > 0;
}

/**
 * Invalidates all active reset tokens for a given user.
 *
 * @param {number} userId
 * @param {import('mysql2/promise').PoolConnection} [conn]
 */
export async function invalidateUserTokens(userId, conn = null) {
  const [result] = await query(
    `UPDATE password_reset_tokens
     SET used_at = UTC_TIMESTAMP()
     WHERE user_id = ? AND used_at IS NULL`,
    [Number(userId)],
    conn
  );

  return result.affectedRows;
}

export default {
  createResetToken,
  findValidToken,
  markTokenUsed,
  invalidateUserTokens,
};

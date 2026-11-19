import { query } from '../config/db.js';

/**
 * Safely parses a MySQL JSON column value (which mysql2 may return as a parsed object or string).
 */
function parseMeta(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return { raw };
    }
  }
  return null;
}

/**
 * Maps a joined `activities` row to a camelCase activity object.
 */
function mapActivityRow(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    workspaceId: Number(row.workspace_id),
    actorId: Number(row.actor_id),
    actorName: row.actor_name ?? null,
    actorEmail: row.actor_email ?? null,
    taskId:
      row.task_id !== null && row.task_id !== undefined
        ? Number(row.task_id)
        : null,
    taskCode: row.task_code ?? null,
    taskTitle: row.task_title ?? null,
    taskStatus: row.task_status ?? null,
    type: row.type,
    meta: parseMeta(row.meta),
    createdAt: row.created_at,
  };
}

const BASE_ACTIVITY_SELECT = `
  SELECT
    a.id,
    a.workspace_id,
    a.actor_id,
    u.name AS actor_name,
    u.email AS actor_email,
    a.task_id,
    t.code AS task_code,
    t.title AS task_title,
    t.status AS task_status,
    a.type,
    a.meta,
    a.created_at
  FROM activities a
  INNER JOIN users u ON u.id = a.actor_id
  LEFT JOIN tasks t ON t.id = a.task_id
`;

/**
 * Finds a single activity entry by primary key `id`.
 *
 * @param {number} id
 * @param {import('mysql2/promise').PoolConnection} [conn]
 */
export async function findById(id, conn = null) {
  const [rows] = await query(
    `${BASE_ACTIVITY_SELECT}
     WHERE a.id = ?
     LIMIT 1`,
    [Number(id)],
    conn
  );

  return mapActivityRow(rows[0]);
}

/**
 * Creates a new activity log entry inside a workspace and returns the enriched record.
 *
 * @param {{
 *   workspaceId: number,
 *   actorId: number,
 *   taskId?: number | null,
 *   type: string,
 *   meta?: Record<string, any> | null
 * }} data
 * @param {import('mysql2/promise').PoolConnection} [conn]
 */
export async function createActivity(
  { workspaceId, actorId, taskId = null, type, meta = null },
  conn = null
) {
  const serializedMeta =
    meta !== null && meta !== undefined
      ? typeof meta === 'string'
        ? meta
        : JSON.stringify(meta)
      : null;

  const [result] = await query(
    `INSERT INTO activities (workspace_id, actor_id, task_id, type, meta)
     VALUES (?, ?, ?, ?, ?)`,
    [
      Number(workspaceId),
      Number(actorId),
      taskId !== null && taskId !== undefined ? Number(taskId) : null,
      String(type).trim(),
      serializedMeta,
    ],
    conn
  );

  return findById(result.insertId, conn);
}

/**
 * Lists workspace activity using keyset pagination (`WHERE a.id < ? ORDER BY a.id DESC LIMIT ?`).
 * Returns an Array of activity items with non-enumerable `{ activities, nextCursor, hasMore }`
 * properties so both array callers and destructuring callers work seamlessly.
 *
 * @param {number} workspaceId
 * @param {{ before?: number | string | null, limit?: number }} [options={}]
 * @param {import('mysql2/promise').PoolConnection} [conn]
 */
export async function listActivities(workspaceId, options = {}, conn = null) {
  const { before, limit = 25 } = options;
  const safeLimit = Math.min(
    100,
    Math.max(1, Number.parseInt(String(limit), 10) || 25)
  );

  const whereClauses = ['a.workspace_id = ?'];
  const params = [Number(workspaceId)];

  const beforeId =
    before !== undefined && before !== null && before !== ''
      ? Number.parseInt(String(before), 10)
      : null;

  if (beforeId && !Number.isNaN(beforeId) && beforeId > 0) {
    whereClauses.push('a.id < ?');
    params.push(beforeId);
  }

  // Fetch safeLimit + 1 rows to determine if another page exists
  const [rows] = await query(
    `${BASE_ACTIVITY_SELECT}
     WHERE ${whereClauses.join(' AND ')}
     ORDER BY a.id DESC
     LIMIT ?`,
    [...params, safeLimit + 1],
    conn
  );

  const hasMore = rows.length > safeLimit;
  const items = rows.slice(0, safeLimit).map(mapActivityRow);
  const nextCursor =
    hasMore && items.length > 0 ? items[items.length - 1].id : null;

  Object.defineProperties(items, {
    activities: { value: items, enumerable: false },
    nextCursor: { value: nextCursor, enumerable: false },
    hasMore: { value: hasMore, enumerable: false },
  });

  return items;
}

/**
 * Lists recent workspace activities from the past `hours` hours (default 24h)
 * for generating the AI Daily Standup summary.
 *
 * @param {number} workspaceId
 * @param {number} [hours=24]
 * @param {import('mysql2/promise').PoolConnection} [conn]
 */
export async function listRecentActivities(
  workspaceId,
  hours = 24,
  conn = null
) {
  const safeHours = Math.min(
    168,
    Math.max(1, Number.parseInt(String(hours), 10) || 24)
  );

  const [rows] = await query(
    `${BASE_ACTIVITY_SELECT}
     WHERE a.workspace_id = ?
       AND a.created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? HOUR)
     ORDER BY a.id DESC
     LIMIT 100`,
    [Number(workspaceId), safeHours],
    conn
  );

  return rows.map(mapActivityRow);
}

export default {
  findById,
  createActivity,
  listActivities,
  listRecentActivities,
};

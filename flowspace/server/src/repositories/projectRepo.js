import { query } from '../config/db.js';

/**
 * Maps a raw MySQL `projects` row to camelCase.
 */
function mapProjectRow(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    workspaceId: Number(row.workspace_id),
    name: row.name,
    key: row.key,
    description: row.description ?? null,
    createdAt: row.created_at,
  };
}

/**
 * Lists all projects belonging to a workspace, ordered by creation time.
 *
 * @param {number} workspaceId
 * @param {import('mysql2/promise').PoolConnection} [conn]
 */
export async function listByWorkspace(workspaceId, conn = null) {
  const [rows] = await query(
    `SELECT id, workspace_id, name, \`key\`, description, created_at
     FROM projects
     WHERE workspace_id = ?
     ORDER BY created_at ASC, id ASC`,
    [Number(workspaceId)],
    conn
  );

  return rows.map(mapProjectRow);
}

/**
 * Finds a project by `id` (and enforces tenant isolation via `workspaceId` when provided).
 *
 * @param {number} id
 * @param {number} [workspaceId]
 * @param {import('mysql2/promise').PoolConnection} [conn]
 */
export async function findById(id, workspaceId = null, conn = null) {
  if (workspaceId !== null && workspaceId !== undefined) {
    const [rows] = await query(
      `SELECT id, workspace_id, name, \`key\`, description, created_at
       FROM projects
       WHERE id = ? AND workspace_id = ?
       LIMIT 1`,
      [Number(id), Number(workspaceId)],
      conn
    );
    return mapProjectRow(rows[0]);
  }

  const [rows] = await query(
    `SELECT id, workspace_id, name, \`key\`, description, created_at
     FROM projects
     WHERE id = ?
     LIMIT 1`,
    [Number(id)],
    conn
  );

  return mapProjectRow(rows[0]);
}

/**
 * Finds a project within a workspace by its short key (e.g. `FLOW` or `AI`).
 *
 * @param {number} workspaceId
 * @param {string} key
 * @param {import('mysql2/promise').PoolConnection} [conn]
 */
export async function findByKey(workspaceId, key, conn = null) {
  if (!key) return null;
  const normalizedKey = String(key).trim().toUpperCase();

  const [rows] = await query(
    `SELECT id, workspace_id, name, \`key\`, description, created_at
     FROM projects
     WHERE workspace_id = ? AND \`key\` = ?
     LIMIT 1`,
    [Number(workspaceId), normalizedKey],
    conn
  );

  return mapProjectRow(rows[0]);
}

/**
 * Creates a new project inside a workspace.
 *
 * @param {{ workspaceId: number, name: string, key: string, description?: string | null }} data
 * @param {import('mysql2/promise').PoolConnection} [conn]
 */
export async function createProject(
  { workspaceId, name, key, description = null },
  conn = null
) {
  const normalizedKey = String(key).trim().toUpperCase();
  const trimmedName = String(name).trim();

  const [result] = await query(
    `INSERT INTO projects (workspace_id, name, \`key\`, description)
     VALUES (?, ?, ?, ?)`,
    [Number(workspaceId), trimmedName, normalizedKey, description || null],
    conn
  );

  return findById(result.insertId, workspaceId, conn);
}

export default {
  listByWorkspace,
  findById,
  findByKey,
  createProject,
};

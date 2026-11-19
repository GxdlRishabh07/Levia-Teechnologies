import { query, withTransaction } from '../config/db.js';

/**
 * Maps a raw MySQL `workspaces` row to camelCase.
 */
function mapWorkspaceRow(row) {
  if (!row) return null;
  const ws = {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    taskCounter: Number(row.task_counter ?? 0),
    createdAt: row.created_at,
  };
  if (row.role !== undefined) {
    ws.role = row.role;
  }
  return ws;
}

/**
 * Generates a URL-friendly slug from a workspace name.
 */
function slugify(text) {
  return (
    String(text || 'workspace')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'workspace'
  );
}

/**
 * Atomically creates a workspace, assigns the creator as OWNER in `memberships`,
 * provisions a default project (defaults to `FLOW` / `Core Platform`), and logs
 * the initial workspace creation activity.
 *
 * @param {{
 *   name: string,
 *   slug?: string,
 *   ownerId: number,
 *   defaultProjectName?: string,
 *   defaultProjectKey?: string
 * }} params
 * @param {import('mysql2/promise').PoolConnection} [existingConn]
 */
export async function createWorkspaceWithOwner(
  {
    name,
    slug,
    ownerId,
    defaultProjectName = 'Core Platform',
    defaultProjectKey = 'FLOW',
  },
  existingConn = null
) {
  const trimmedName = name.trim();
  const finalSlug = (slug ? slug.trim().toLowerCase() : `${slugify(trimmedName)}-${Date.now().toString(36)}`);
  const projectKey = defaultProjectKey.trim().toUpperCase();
  const projectName = defaultProjectName.trim();

  const runInTx = async (conn) => {
    // 1. Insert workspace
    const [wsResult] = await query(
      `INSERT INTO workspaces (name, slug, task_counter)
       VALUES (?, ?, 0)`,
      [trimmedName, finalSlug],
      conn
    );
    const workspaceId = Number(wsResult.insertId);

    // 2. Insert OWNER membership
    await query(
      `INSERT INTO memberships (user_id, workspace_id, role)
       VALUES (?, ?, 'OWNER')`,
      [Number(ownerId), workspaceId],
      conn
    );

    // 3. Insert default project
    const [projResult] = await query(
      `INSERT INTO projects (workspace_id, name, \`key\`, description)
       VALUES (?, ?, ?, ?)`,
      [
        workspaceId,
        projectName,
        projectKey,
        `Default project for ${trimmedName}`,
      ],
      conn
    );

    // 4. Record workspace creation activity
    await query(
      `INSERT INTO activities (workspace_id, actor_id, task_id, type, meta)
       VALUES (?, ?, NULL, 'workspace.created', ?)`,
      [
        workspaceId,
        Number(ownerId),
        JSON.stringify({
          workspaceName: trimmedName,
          slug: finalSlug,
          defaultProjectKey: projectKey,
        }),
      ],
      conn
    );

    const workspace = await findById(workspaceId, conn);
    return {
      ...workspace,
      role: 'OWNER',
      defaultProject: {
        id: Number(projResult.insertId),
        workspaceId,
        name: projectName,
        key: projectKey,
        description: `Default project for ${trimmedName}`,
      },
    };
  };

  if (existingConn) {
    return runInTx(existingConn);
  }
  return withTransaction(runInTx);
}

/**
 * Lists all workspaces a user belongs to along with their membership role.
 *
 * @param {number} userId
 */
export async function listUserWorkspaces(userId) {
  const [rows] = await query(
    `SELECT w.id, w.name, w.slug, w.task_counter, w.created_at, m.role
     FROM workspaces w
     INNER JOIN memberships m ON m.workspace_id = w.id
     WHERE m.user_id = ?
     ORDER BY w.created_at ASC, w.id ASC`,
    [Number(userId)]
  );

  return rows.map(mapWorkspaceRow);
}

/**
 * Finds a workspace by primary key `id`.
 *
 * @param {number} workspaceId
 * @param {import('mysql2/promise').PoolConnection} [conn]
 */
export async function findById(workspaceId, conn = null) {
  const [rows] = await query(
    `SELECT id, name, slug, task_counter, created_at
     FROM workspaces
     WHERE id = ?
     LIMIT 1`,
    [Number(workspaceId)],
    conn
  );

  return mapWorkspaceRow(rows[0]);
}

/**
 * Finds a workspace by its unique `slug`.
 *
 * @param {string} slug
 * @param {import('mysql2/promise').PoolConnection} [conn]
 */
export async function findBySlug(slug, conn = null) {
  const [rows] = await query(
    `SELECT id, name, slug, task_counter, created_at
     FROM workspaces
     WHERE slug = ?
     LIMIT 1`,
    [String(slug).trim().toLowerCase()],
    conn
  );

  return mapWorkspaceRow(rows[0]);
}

/**
 * Retrieves a user's membership record for a given workspace.
 * Used by `requireMembership` middleware and `/api/realtime/auth`.
 *
 * @param {number} userId
 * @param {number} workspaceId
 * @param {import('mysql2/promise').PoolConnection} [conn]
 */
export async function getMembership(userId, workspaceId, conn = null) {
  const [rows] = await query(
    `SELECT user_id, workspace_id, role, created_at
     FROM memberships
     WHERE user_id = ? AND workspace_id = ?
     LIMIT 1`,
    [Number(userId), Number(workspaceId)],
    conn
  );

  if (!rows[0]) return null;
  return {
    userId: Number(rows[0].user_id),
    workspaceId: Number(rows[0].workspace_id),
    role: rows[0].role,
    createdAt: rows[0].created_at,
  };
}

/**
 * Lists all members of a workspace with their user profile details.
 *
 * @param {number} workspaceId
 * @param {import('mysql2/promise').PoolConnection} [conn]
 */
export async function listMembers(workspaceId, conn = null) {
  const [rows] = await query(
    `SELECT
       u.id AS user_id,
       u.name,
       u.email,
       m.workspace_id,
       m.role,
       m.created_at AS joined_at
     FROM memberships m
     INNER JOIN users u ON u.id = m.user_id
     WHERE m.workspace_id = ?
     ORDER BY CASE WHEN m.role = 'OWNER' THEN 0 ELSE 1 END, u.name ASC`,
    [Number(workspaceId)],
    conn
  );

  return rows.map((row) => ({
    id: Number(row.user_id),
    userId: Number(row.user_id),
    workspaceId: Number(row.workspace_id),
    name: row.name,
    email: row.email,
    role: row.role,
    joinedAt: row.joined_at,
  }));
}

/**
 * Adds a registered user to a workspace with the specified role (`OWNER` | `MEMBER`).
 *
 * @param {{ workspaceId: number, userId: number, role?: 'OWNER' | 'MEMBER' }} params
 * @param {import('mysql2/promise').PoolConnection} [conn]
 */
export async function addMember(
  { workspaceId, userId, role = 'MEMBER' },
  conn = null
) {
  await query(
    `INSERT INTO memberships (user_id, workspace_id, role)
     VALUES (?, ?, ?)`,
    [Number(userId), Number(workspaceId), role],
    conn
  );

  const [rows] = await query(
    `SELECT
       u.id AS user_id,
       u.name,
       u.email,
       m.workspace_id,
       m.role,
       m.created_at AS joined_at
     FROM memberships m
     INNER JOIN users u ON u.id = m.user_id
     WHERE m.user_id = ? AND m.workspace_id = ?
     LIMIT 1`,
    [Number(userId), Number(workspaceId)],
    conn
  );

  const row = rows[0];
  return {
    id: Number(row.user_id),
    userId: Number(row.user_id),
    workspaceId: Number(row.workspace_id),
    name: row.name,
    email: row.email,
    role: row.role,
    joinedAt: row.joined_at,
  };
}

/**
 * Atomically locks the workspace row (`SELECT ... FOR UPDATE`), increments `task_counter`,
 * and returns the new sequence number for generating human-readable task codes (e.g. `FLOW-12`).
 * Must be called inside a transaction (`withTransaction`).
 *
 * @param {number} workspaceId
 * @param {import('mysql2/promise').PoolConnection} conn
 * @returns {Promise<number>} The newly incremented task counter
 */
export async function incrementTaskCounter(workspaceId, conn) {
  const [rows] = await query(
    `SELECT task_counter
     FROM workspaces
     WHERE id = ?
     FOR UPDATE`,
    [Number(workspaceId)],
    conn
  );

  if (!rows[0]) {
    const err = new Error(`Workspace ${workspaceId} not found`);
    err.status = 404;
    err.code = 'WORKSPACE_NOT_FOUND';
    throw err;
  }

  const nextCounter = Number(rows[0].task_counter) + 1;

  await query(
    `UPDATE workspaces
     SET task_counter = task_counter + 1
     WHERE id = ?`,
    [Number(workspaceId)],
    conn
  );

  return nextCounter;
}

export default {
  createWorkspaceWithOwner,
  listUserWorkspaces,
  findById,
  findBySlug,
  getMembership,
  listMembers,
  addMember,
  incrementTaskCounter,
};

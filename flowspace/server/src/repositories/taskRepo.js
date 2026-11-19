import { query } from '../config/db.js';

/**
 * Formats a MySQL DATE value (`YYYY-MM-DD` string or Date object) to `'YYYY-MM-DD'` or `null`.
 */
function formatDueDate(val) {
  if (!val) return null;
  if (typeof val === 'string') {
    return val.slice(0, 10);
  }
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10);
  }
  return null;
}

/**
 * Normalizes and deduplicates an array of tag strings.
 */
function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  const seen = new Set();
  const result = [];
  for (const raw of tags) {
    const clean = String(raw || '')
      .trim()
      .toLowerCase()
      .slice(0, 64);
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      result.push(clean);
    }
  }
  return result;
}

/**
 * Maps a joined `tasks` row and its tags array into a clean camelCase object.
 */
function mapTaskRow(row, tags = []) {
  if (!row) return null;
  const assigneeId =
    row.assignee_id !== null && row.assignee_id !== undefined
      ? Number(row.assignee_id)
      : null;

  return {
    id: Number(row.id),
    workspaceId: Number(row.workspace_id),
    projectId: Number(row.project_id),
    projectKey: row.project_key ?? null,
    projectName: row.project_name ?? null,
    code: row.code,
    title: row.title,
    description: row.description ?? null,
    status: row.status,
    priority: row.priority,
    dueDate: formatDueDate(row.due_date),
    assigneeId,
    assigneeName: row.assignee_name ?? null,
    assigneeEmail: row.assignee_email ?? null,
    assignee: assigneeId
      ? {
          id: assigneeId,
          name: row.assignee_name ?? null,
          email: row.assignee_email ?? null,
        }
      : null,
    createdBy: Number(row.created_by),
    creatorName: row.creator_name ?? null,
    source: row.source,
    position: Number(row.position ?? 0),
    tags,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Batch-fetches tags for a list of task IDs and returns a Map<taskId, string[]>.
 */
async function fetchTagsForTaskIds(taskIds, conn = null) {
  const tagsMap = new Map();
  if (!taskIds || taskIds.length === 0) return tagsMap;

  const placeholders = taskIds.map(() => '?').join(', ');
  const [tagRows] = await query(
    `SELECT task_id, tag
     FROM task_tags
     WHERE task_id IN (${placeholders})
     ORDER BY tag ASC`,
    taskIds.map(Number),
    conn
  );

  for (const row of tagRows) {
    const tid = Number(row.task_id);
    if (!tagsMap.has(tid)) {
      tagsMap.set(tid, []);
    }
    tagsMap.get(tid).push(row.tag);
  }

  return tagsMap;
}

const BASE_TASK_SELECT = `
  SELECT
    t.id,
    t.workspace_id,
    t.project_id,
    p.\`key\` AS project_key,
    p.name AS project_name,
    t.code,
    t.title,
    t.description,
    t.status,
    t.priority,
    t.due_date,
    t.assignee_id,
    u.name AS assignee_name,
    u.email AS assignee_email,
    t.created_by,
    c.name AS creator_name,
    t.source,
    t.position,
    t.created_at,
    t.updated_at
  FROM tasks t
  LEFT JOIN users u ON u.id = t.assignee_id
  LEFT JOIN projects p ON p.id = t.project_id
  LEFT JOIN users c ON c.id = t.created_by
`;

/**
 * Lists tasks for a workspace with dynamic filtering, search (`LIKE ?`), and offset pagination.
 *
 * @param {number} workspaceId
 * @param {{
 *   status?: string,
 *   priority?: string,
 *   assigneeId?: number | string,
 *   assignee?: number | string,
 *   projectId?: number | string,
 *   tag?: string,
 *   tags?: string[] | string,
 *   q?: string,
 *   page?: number,
 *   limit?: number
 * }} [filters={}]
 * @param {import('mysql2/promise').PoolConnection} [conn]
 */
export async function listTasks(workspaceId, filters = {}, conn = null) {
  const {
    status,
    priority,
    assigneeId,
    assignee,
    projectId,
    tag,
    tags,
    q,
    page = 1,
    limit = 50,
  } = filters;

  const whereClauses = ['t.workspace_id = ?'];
  const params = [Number(workspaceId)];

  if (status) {
    whereClauses.push('t.status = ?');
    params.push(String(status).trim().toUpperCase());
  }

  if (priority) {
    whereClauses.push('t.priority = ?');
    params.push(String(priority).trim().toUpperCase());
  }

  const effectiveAssignee = assigneeId ?? assignee;
  if (
    effectiveAssignee !== undefined &&
    effectiveAssignee !== null &&
    effectiveAssignee !== ''
  ) {
    if (String(effectiveAssignee).toLowerCase() === 'unassigned') {
      whereClauses.push('t.assignee_id IS NULL');
    } else {
      whereClauses.push('t.assignee_id = ?');
      params.push(Number(effectiveAssignee));
    }
  }

  if (projectId !== undefined && projectId !== null && projectId !== '') {
    whereClauses.push('t.project_id = ?');
    params.push(Number(projectId));
  }

  // Support filtering by single `tag` or array/CSV `tags`
  const tagFilters = [];
  if (tag && String(tag).trim()) {
    tagFilters.push(String(tag).trim().toLowerCase());
  }
  if (tags) {
    const extraTags = Array.isArray(tags)
      ? tags
      : String(tags)
          .split(',')
          .map((s) => s.trim());
    for (const item of extraTags) {
      if (item) tagFilters.push(item.toLowerCase());
    }
  }

  if (tagFilters.length > 0) {
    const uniqueTags = [...new Set(tagFilters)];
    const placeholders = uniqueTags.map(() => '?').join(', ');
    whereClauses.push(
      `EXISTS (
         SELECT 1 FROM task_tags tt_f
         WHERE tt_f.task_id = t.id AND tt_f.tag IN (${placeholders})
       )`
    );
    params.push(...uniqueTags);
  }

  if (q && String(q).trim()) {
    const likePattern = `%${String(q).trim()}%`;
    whereClauses.push('(t.title LIKE ? OR t.code LIKE ? OR t.description LIKE ?)');
    params.push(likePattern, likePattern, likePattern);
  }

  const whereSql = whereClauses.join(' AND ');
  const safePage = Math.max(1, Number.parseInt(String(page), 10) || 1);
  const safeLimit = Math.min(
    200,
    Math.max(1, Number.parseInt(String(limit), 10) || 50)
  );
  const offset = (safePage - 1) * safeLimit;

  // 1. Total count for pagination metadata
  const [countRows] = await query(
    `SELECT COUNT(*) AS total
     FROM tasks t
     WHERE ${whereSql}`,
    params,
    conn
  );
  const total = Number(countRows[0]?.total ?? 0);

  // 2. Paginated task rows ordered by status, position ASC, id DESC
  const [rows] = await query(
    `${BASE_TASK_SELECT}
     WHERE ${whereSql}
     ORDER BY t.status, t.position ASC, t.id DESC
     LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset],
    conn
  );

  // 3. Attach tags array to each task
  const taskIds = rows.map((r) => Number(r.id));
  const tagsMap = await fetchTagsForTaskIds(taskIds, conn);

  const tasks = rows.map((row) =>
    mapTaskRow(row, tagsMap.get(Number(row.id)) || [])
  );

  return {
    tasks,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  };
}

/**
 * Finds a single task by primary key `id` scoped to `workspaceId`.
 *
 * @param {number} taskId
 * @param {number} workspaceId
 * @param {import('mysql2/promise').PoolConnection} [conn]
 */
export async function findById(taskId, workspaceId, conn = null) {
  const [rows] = await query(
    `${BASE_TASK_SELECT}
     WHERE t.id = ? AND t.workspace_id = ?
     LIMIT 1`,
    [Number(taskId), Number(workspaceId)],
    conn
  );

  if (!rows[0]) return null;

  const tagsMap = await fetchTagsForTaskIds([Number(rows[0].id)], conn);
  return mapTaskRow(rows[0], tagsMap.get(Number(rows[0].id)) || []);
}

/**
 * Finds a single task inside a workspace by its unique human-readable code (e.g. `FLOW-12`).
 *
 * @param {number} workspaceId
 * @param {string} code
 * @param {import('mysql2/promise').PoolConnection} [conn]
 */
export async function findByCode(workspaceId, code, conn = null) {
  if (!code) return null;
  const normalizedCode = String(code).trim().toUpperCase();

  const [rows] = await query(
    `${BASE_TASK_SELECT}
     WHERE t.workspace_id = ? AND t.code = ?
     LIMIT 1`,
    [Number(workspaceId), normalizedCode],
    conn
  );

  if (!rows[0]) return null;

  const tagsMap = await fetchTagsForTaskIds([Number(rows[0].id)], conn);
  return mapTaskRow(rows[0], tagsMap.get(Number(rows[0].id)) || []);
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'that',
  'this',
  'into',
  'move',
  'task',
  'tasks',
  'status',
  'mark',
  'set',
  'update',
  'change',
  'backlog',
  'progress',
  'in_progress',
  'review',
  'in_review',
  'done',
  'complete',
  'completed',
  'karo',
  'kar',
  'krdo',
  'kardo',
  'please',
]);

/**
 * Searches candidate tasks in a workspace for AI command disambiguation (e.g. `UPDATE_STATUS`).
 * Matches explicit task codes (`FLOW-12`) or title keywords via portable `LIKE ?`.
 *
 * @param {number} workspaceId
 * @param {string} [queryText='']
 * @param {import('mysql2/promise').PoolConnection} [conn]
 */
export async function searchCandidates(workspaceId, queryText = '', conn = null) {
  const raw = String(queryText || '').trim();

  if (!raw) {
    const [rows] = await query(
      `${BASE_TASK_SELECT}
       WHERE t.workspace_id = ?
       ORDER BY t.updated_at DESC, t.id DESC
       LIMIT 20`,
      [Number(workspaceId)],
      conn
    );
    const tagsMap = await fetchTagsForTaskIds(
      rows.map((r) => Number(r.id)),
      conn
    );
    return rows.map((row) => mapTaskRow(row, tagsMap.get(Number(row.id)) || []));
  }

  // Extract explicit codes like FLOW-12 and meaningful search keywords
  const codeMatches = raw.match(/\b[A-Za-z]{2,10}-\d+\b/g) || [];
  const words = raw
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
    .slice(0, 6);

  const orClauses = ['t.title LIKE ?', 't.code LIKE ?'];
  const orParams = [`%${raw}%`, `%${raw.toUpperCase()}%`];

  for (const code of codeMatches) {
    orClauses.push('t.code = ?');
    orParams.push(code.toUpperCase());
  }

  for (const word of words) {
    orClauses.push('t.title LIKE ?');
    orParams.push(`%${word}%`);
  }

  const [rows] = await query(
    `${BASE_TASK_SELECT}
     WHERE t.workspace_id = ? AND (${orClauses.join(' OR ')})
     ORDER BY t.updated_at DESC, t.id DESC
     LIMIT 15`,
    [Number(workspaceId), ...orParams],
    conn
  );

  // If no keyword matched directly, return recent workspace tasks as context candidates for the LLM
  if (rows.length === 0) {
    return searchCandidates(workspaceId, '', conn);
  }

  const tagsMap = await fetchTagsForTaskIds(
    rows.map((r) => Number(r.id)),
    conn
  );
  return rows.map((row) => mapTaskRow(row, tagsMap.get(Number(row.id)) || []));
}

/**
 * Inserts a new task into `tasks` and its associated tags into `task_tags`.
 *
 * @param {{
 *   workspaceId: number,
 *   projectId: number,
 *   code: string,
 *   title: string,
 *   description?: string | null,
 *   status?: 'BACKLOG' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE',
 *   priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
 *   dueDate?: string | null,
 *   assigneeId?: number | null,
 *   createdBy: number,
 *   source?: 'MANUAL' | 'AI_TEXT' | 'AI_VOICE',
 *   position?: number,
 *   tags?: string[]
 * }} taskData
 * @param {import('mysql2/promise').PoolConnection} [conn]
 */
export async function createTask(taskData, conn = null) {
  const {
    workspaceId,
    projectId,
    code,
    title,
    description = null,
    status = 'BACKLOG',
    priority = 'MEDIUM',
    dueDate = null,
    assigneeId = null,
    createdBy,
    source = 'MANUAL',
    position,
    tags = [],
  } = taskData;

  let resolvedPosition = position;
  if (resolvedPosition === undefined || resolvedPosition === null) {
    const [posRows] = await query(
      `SELECT COALESCE(MAX(position), -1) + 1 AS next_pos
       FROM tasks
       WHERE workspace_id = ? AND status = ?`,
      [Number(workspaceId), status],
      conn
    );
    resolvedPosition = Number(posRows[0]?.next_pos ?? 0);
  }

  const [result] = await query(
    `INSERT INTO tasks (
       workspace_id,
       project_id,
       code,
       title,
       description,
       status,
       priority,
       due_date,
       assignee_id,
       created_by,
       source,
       position
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      Number(workspaceId),
      Number(projectId),
      String(code).trim().toUpperCase(),
      String(title).trim(),
      description ?? null,
      status,
      priority,
      formatDueDate(dueDate),
      assigneeId !== null && assigneeId !== undefined ? Number(assigneeId) : null,
      Number(createdBy),
      source,
      Number(resolvedPosition),
    ],
    conn
  );

  const taskId = Number(result.insertId);
  const cleanTags = normalizeTags(tags);

  for (const tag of cleanTags) {
    await query(
      `INSERT INTO task_tags (task_id, tag)
       VALUES (?, ?)`,
      [taskId, tag],
      conn
    );
  }

  return findById(taskId, workspaceId, conn);
}

/**
 * Partially updates a task in `tasks` and replaces its `task_tags` if `updates.tags` is provided.
 *
 * @param {number} taskId
 * @param {number} workspaceId
 * @param {Record<string, any>} updates
 * @param {import('mysql2/promise').PoolConnection} [conn]
 */
export async function updateTask(taskId, workspaceId, updates = {}, conn = null) {
  const existing = await findById(taskId, workspaceId, conn);
  if (!existing) return null;

  const setClauses = [];
  const params = [];

  if (updates.title !== undefined) {
    setClauses.push('title = ?');
    params.push(String(updates.title).trim());
  }

  if (updates.description !== undefined) {
    setClauses.push('description = ?');
    params.push(updates.description ?? null);
  }

  if (updates.status !== undefined) {
    setClauses.push('status = ?');
    params.push(String(updates.status).trim().toUpperCase());
  }

  if (updates.priority !== undefined) {
    setClauses.push('priority = ?');
    params.push(String(updates.priority).trim().toUpperCase());
  }

  if (updates.dueDate !== undefined || updates.due_date !== undefined) {
    const rawDue =
      updates.dueDate !== undefined ? updates.dueDate : updates.due_date;
    setClauses.push('due_date = ?');
    params.push(formatDueDate(rawDue));
  }

  if (updates.assigneeId !== undefined || updates.assignee_id !== undefined) {
    const rawAssignee =
      updates.assigneeId !== undefined
        ? updates.assigneeId
        : updates.assignee_id;
    setClauses.push('assignee_id = ?');
    params.push(
      rawAssignee !== null && rawAssignee !== undefined && rawAssignee !== ''
        ? Number(rawAssignee)
        : null
    );
  }

  if (updates.projectId !== undefined || updates.project_id !== undefined) {
    const rawProject =
      updates.projectId !== undefined ? updates.projectId : updates.project_id;
    setClauses.push('project_id = ?');
    params.push(Number(rawProject));
  }

  if (updates.position !== undefined) {
    setClauses.push('position = ?');
    params.push(Number(updates.position));
  }

  if (setClauses.length > 0) {
    await query(
      `UPDATE tasks
       SET ${setClauses.join(', ')}
       WHERE id = ? AND workspace_id = ?`,
      [...params, Number(taskId), Number(workspaceId)],
      conn
    );
  }

  if (Array.isArray(updates.tags)) {
    await query(
      `DELETE FROM task_tags
       WHERE task_id = ?`,
      [Number(taskId)],
      conn
    );

    const cleanTags = normalizeTags(updates.tags);
    for (const tag of cleanTags) {
      await query(
        `INSERT INTO task_tags (task_id, tag)
         VALUES (?, ?)`,
        [Number(taskId), tag],
        conn
      );
    }
  }

  return findById(taskId, workspaceId, conn);
}

/**
 * Deletes a task scoped by `workspaceId`.
 *
 * @param {number} taskId
 * @param {number} workspaceId
 * @param {import('mysql2/promise').PoolConnection} [conn]
 * @returns {Promise<boolean>} True if a row was deleted
 */
export async function deleteTask(taskId, workspaceId, conn = null) {
  const [result] = await query(
    `DELETE FROM tasks
     WHERE id = ? AND workspace_id = ?`,
    [Number(taskId), Number(workspaceId)],
    conn
  );

  return result.affectedRows > 0;
}

/**
 * Computes aggregated workspace dashboard metrics using SQL `GROUP BY` and `CURDATE()`.
 *
 * @param {number} workspaceId
 * @param {import('mysql2/promise').PoolConnection} [conn]
 */
export async function getWorkspaceStats(workspaceId, conn = null) {
  const wid = Number(workspaceId);

  // 1. Count by status
  const [statusRows] = await query(
    `SELECT status, COUNT(*) AS count
     FROM tasks
     WHERE workspace_id = ?
     GROUP BY status`,
    [wid],
    conn
  );

  // 2. Count by priority
  const [priorityRows] = await query(
    `SELECT priority, COUNT(*) AS count
     FROM tasks
     WHERE workspace_id = ?
     GROUP BY priority`,
    [wid],
    conn
  );

  // 3. Overdue tasks count (due before today in UTC and not DONE)
  const [overdueRows] = await query(
    `SELECT COUNT(*) AS overdue_count
     FROM tasks
     WHERE workspace_id = ?
       AND due_date IS NOT NULL
       AND due_date < CURDATE()
       AND status != 'DONE'`,
    [wid],
    conn
  );

  const byStatus = {
    BACKLOG: 0,
    IN_PROGRESS: 0,
    IN_REVIEW: 0,
    DONE: 0,
  };

  let total = 0;
  for (const row of statusRows) {
    const count = Number(row.count);
    if (byStatus[row.status] !== undefined) {
      byStatus[row.status] = count;
    }
    total += count;
  }

  const byPriority = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    URGENT: 0,
  };

  for (const row of priorityRows) {
    const count = Number(row.count);
    if (byPriority[row.priority] !== undefined) {
      byPriority[row.priority] = count;
    }
  }

  const completed = byStatus.DONE;
  const overdue = Number(overdueRows[0]?.overdue_count ?? 0);
  const completionPercentage =
    total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    overdue,
    completionRate: completionPercentage,
    completionPercentage,
    byStatus,
    byPriority,
  };
}

export default {
  listTasks,
  findById,
  findByCode,
  searchCandidates,
  createTask,
  updateTask,
  deleteTask,
  getWorkspaceStats,
};

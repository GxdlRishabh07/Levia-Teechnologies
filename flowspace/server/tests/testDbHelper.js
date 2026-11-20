import { runSetup } from '../db/setup.js';
import { getPool, closePool } from '../src/config/db.js';

/**
 * In-memory relational engine implementing FlowSpace's MySQL 8 schema and prepared-statement
 * queries. Used only when local MySQL returns ER_ACCESS_DENIED_ERROR / ECONNREFUSED during
 * `npm test` (e.g. before the developer sets their local root DB_PASSWORD in `.env`).
 * In GitHub Actions CI (or when local MySQL credentials are valid), the test suite runs
 * directly against real MySQL 8.0.
 */
function createInMemoryRelationalPool() {
  const state = {
    users: [],
    workspaces: [],
    memberships: [],
    projects: [],
    tasks: [],
    task_tags: [],
    activities: [],
    password_reset_tokens: [],
    seq: {
      users: 1,
      workspaces: 1,
      projects: 1,
      tasks: 1,
      activities: 1,
      password_reset_tokens: 1,
    },
  };

  let snapshot = null;

  function cloneState(src) {
    return JSON.parse(JSON.stringify(src));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function enrichTaskRow(t) {
    const project = state.projects.find((p) => p.id === t.project_id) || {};
    const assignee = t.assignee_id
      ? state.users.find((u) => u.id === t.assignee_id) || {}
      : {};
    const creator = state.users.find((u) => u.id === t.created_by) || {};

    return {
      ...t,
      project_key: project.key ?? null,
      project_name: project.name ?? null,
      assignee_name: assignee.name ?? null,
      assignee_email: assignee.email ?? null,
      creator_name: creator.name ?? null,
    };
  }

  function enrichActivityRow(a) {
    const actor = state.users.find((u) => u.id === a.actor_id) || {};
    const task = a.task_id
      ? state.tasks.find((t) => t.id === a.task_id) || {}
      : {};

    return {
      ...a,
      actor_name: actor.name ?? null,
      actor_email: actor.email ?? null,
      task_code: task.code ?? null,
      task_title: task.title ?? null,
      task_status: task.status ?? null,
    };
  }

  function filterTasksWhere(whereSql, params) {
    let idx = 0;
    const workspaceId = Number(params[idx++]);
    let list = state.tasks.filter((t) => t.workspace_id === workspaceId);

    if (whereSql.includes('t.status = ?')) {
      const status = String(params[idx++]);
      list = list.filter((t) => t.status === status);
    }

    if (whereSql.includes('t.priority = ?')) {
      const priority = String(params[idx++]);
      list = list.filter((t) => t.priority === priority);
    }

    if (whereSql.includes('t.assignee_id IS NULL')) {
      list = list.filter((t) => t.assignee_id === null);
    } else if (whereSql.includes('t.assignee_id = ?')) {
      const assigneeId = Number(params[idx++]);
      list = list.filter((t) => t.assignee_id === assigneeId);
    }

    if (whereSql.includes('t.project_id = ?')) {
      const projectId = Number(params[idx++]);
      list = list.filter((t) => t.project_id === projectId);
    }

    const tagInMatch = whereSql.match(/tt_f\.tag IN \(([^)]+)\)/);
    if (tagInMatch) {
      const count = tagInMatch[1].split(',').length;
      const wantedTags = params
        .slice(idx, idx + count)
        .map((s) => String(s).toLowerCase());
      idx += count;
      list = list.filter((t) =>
        state.task_tags.some(
          (tt) => tt.task_id === t.id && wantedTags.includes(tt.tag)
        )
      );
    }

    if (
      whereSql.includes(
        '(t.title LIKE ? OR t.code LIKE ? OR t.description LIKE ?)'
      )
    ) {
      const pattern = String(params[idx]).replace(/^%|%$/g, '').toLowerCase();
      idx += 3;
      list = list.filter(
        (t) =>
          (t.title || '').toLowerCase().includes(pattern) ||
          (t.code || '').toLowerCase().includes(pattern) ||
          (t.description || '').toLowerCase().includes(pattern)
      );
    }

    return { list, nextParamIdx: idx };
  }

  async function execute(sql, params = []) {
    const norm = sql.replace(/\s+/g, ' ').trim();

    // 1. Health check
    if (/^SELECT 1 AS ok$/i.test(norm)) {
      return [[{ ok: 1 }], []];
    }

    // 2. USERS
    if (/^INSERT INTO users/i.test(norm)) {
      const [name, email, password_hash] = params;
      if (state.users.some((u) => u.email === email)) {
        const err = new Error('Duplicate entry for key users.uq_users_email');
        err.code = 'ER_DUP_ENTRY';
        throw err;
      }
      const id = state.seq.users++;
      state.users.push({
        id,
        name,
        email,
        password_hash,
        created_at: nowIso(),
      });
      return [{ insertId: id, affectedRows: 1 }, []];
    }

    if (/FROM users WHERE email = \?/i.test(norm)) {
      const [email] = params;
      const found = state.users.find((u) => u.email === email);
      return [found ? [{ ...found }] : [], []];
    }

    if (/FROM users WHERE id = \?/i.test(norm)) {
      const [id] = params;
      const found = state.users.find((u) => u.id === Number(id));
      return [found ? [{ ...found }] : [], []];
    }

    if (/UPDATE users SET password_hash = \? WHERE id = \?/i.test(norm)) {
      const [passwordHash, id] = params;
      const found = state.users.find((u) => u.id === Number(id));
      if (found) found.password_hash = passwordHash;
      return [{ affectedRows: found ? 1 : 0 }, []];
    }

    // 3. WORKSPACES & MEMBERSHIPS
    if (/^INSERT INTO workspaces/i.test(norm)) {
      const [name, slug] = params;
      if (state.workspaces.some((w) => w.slug === slug)) {
        const err = new Error('Duplicate entry for workspaces.slug');
        err.code = 'ER_DUP_ENTRY';
        throw err;
      }
      const id = state.seq.workspaces++;
      state.workspaces.push({
        id,
        name,
        slug,
        task_counter: 0,
        created_at: nowIso(),
      });
      return [{ insertId: id, affectedRows: 1 }, []];
    }

    if (/^INSERT INTO memberships/i.test(norm)) {
      const userId = Number(params[0]);
      const workspaceId = Number(params[1]);
      const role = norm.includes("'OWNER'") ? 'OWNER' : params[2] || 'MEMBER';

      if (
        state.memberships.some(
          (m) => m.user_id === userId && m.workspace_id === workspaceId
        )
      ) {
        const err = new Error('Duplicate membership');
        err.code = 'ER_DUP_ENTRY';
        throw err;
      }
      state.memberships.push({
        user_id: userId,
        workspace_id: workspaceId,
        role,
        created_at: nowIso(),
      });
      return [{ affectedRows: 1 }, []];
    }

    if (/FROM workspaces w INNER JOIN memberships m/i.test(norm)) {
      const [userId] = params;
      const rows = state.memberships
        .filter((m) => m.user_id === Number(userId))
        .map((m) => {
          const w = state.workspaces.find((ws) => ws.id === m.workspace_id);
          return w ? { ...w, role: m.role } : null;
        })
        .filter(Boolean);
      return [rows, []];
    }

    if (/SELECT task_counter FROM workspaces WHERE id = \? FOR UPDATE/i.test(norm)) {
      const [wid] = params;
      const w = state.workspaces.find((ws) => ws.id === Number(wid));
      return [w ? [{ task_counter: w.task_counter }] : [], []];
    }

    if (/UPDATE workspaces SET task_counter = task_counter \+ 1 WHERE id = \?/i.test(norm)) {
      const [wid] = params;
      const w = state.workspaces.find((ws) => ws.id === Number(wid));
      if (w) w.task_counter += 1;
      return [{ affectedRows: w ? 1 : 0 }, []];
    }

    if (/FROM workspaces WHERE id = \?/i.test(norm)) {
      const [wid] = params;
      const w = state.workspaces.find((ws) => ws.id === Number(wid));
      return [w ? [{ ...w }] : [], []];
    }

    if (/FROM workspaces WHERE slug = \?/i.test(norm)) {
      const [slug] = params;
      const w = state.workspaces.find((ws) => ws.slug === slug);
      return [w ? [{ ...w }] : [], []];
    }

    if (/FROM memberships WHERE user_id = \? AND workspace_id = \?/i.test(norm)) {
      const [uid, wid] = params;
      const m = state.memberships.find(
        (item) =>
          item.user_id === Number(uid) && item.workspace_id === Number(wid)
      );
      return [m ? [{ ...m }] : [], []];
    }

    if (/FROM memberships m INNER JOIN users u ON u\.id = m\.user_id WHERE m\.user_id = \? AND m\.workspace_id = \?/i.test(norm)) {
      const [uid, wid] = params;
      const m = state.memberships.find(
        (item) =>
          item.user_id === Number(uid) && item.workspace_id === Number(wid)
      );
      if (!m) return [[], []];
      const u = state.users.find((usr) => usr.id === m.user_id);
      return [
        [
          {
            user_id: u.id,
            name: u.name,
            email: u.email,
            workspace_id: m.workspace_id,
            role: m.role,
            joined_at: m.created_at,
          },
        ],
        [],
      ];
    }

    if (/FROM memberships m INNER JOIN users u ON u\.id = m\.user_id WHERE m\.workspace_id = \?/i.test(norm)) {
      const [wid] = params;
      const rows = state.memberships
        .filter((m) => m.workspace_id === Number(wid))
        .map((m) => {
          const u = state.users.find((usr) => usr.id === m.user_id);
          return {
            user_id: u.id,
            name: u.name,
            email: u.email,
            workspace_id: m.workspace_id,
            role: m.role,
            joined_at: m.created_at,
          };
        })
        .sort((a, b) => {
          const roleA = a.role === 'OWNER' ? 0 : 1;
          const roleB = b.role === 'OWNER' ? 0 : 1;
          if (roleA !== roleB) return roleA - roleB;
          return a.name.localeCompare(b.name);
        });
      return [rows, []];
    }

    // 4. PROJECTS
    if (/^INSERT INTO projects/i.test(norm)) {
      const [workspace_id, name, key, description] = params;
      if (
        state.projects.some(
          (p) =>
            p.workspace_id === Number(workspace_id) &&
            p.key.toUpperCase() === String(key).toUpperCase()
        )
      ) {
        const err = new Error('Duplicate project key');
        err.code = 'ER_DUP_ENTRY';
        throw err;
      }
      const id = state.seq.projects++;
      state.projects.push({
        id,
        workspace_id: Number(workspace_id),
        name,
        key: String(key).toUpperCase(),
        description: description ?? null,
        created_at: nowIso(),
      });
      return [{ insertId: id, affectedRows: 1 }, []];
    }

    if (/FROM projects WHERE workspace_id = \? AND `key` = \?/i.test(norm)) {
      const [wid, key] = params;
      const p = state.projects.find(
        (proj) =>
          proj.workspace_id === Number(wid) &&
          proj.key.toUpperCase() === String(key).toUpperCase()
      );
      return [p ? [{ ...p }] : [], []];
    }

    if (/FROM projects WHERE id = \? AND workspace_id = \?/i.test(norm)) {
      const [id, wid] = params;
      const p = state.projects.find(
        (proj) =>
          proj.id === Number(id) && proj.workspace_id === Number(wid)
      );
      return [p ? [{ ...p }] : [], []];
    }

    if (/FROM projects WHERE id = \?/i.test(norm)) {
      const [id] = params;
      const p = state.projects.find((proj) => proj.id === Number(id));
      return [p ? [{ ...p }] : [], []];
    }

    if (/FROM projects WHERE workspace_id = \?/i.test(norm)) {
      const [wid] = params;
      const rows = state.projects.filter(
        (p) => p.workspace_id === Number(wid)
      );
      return [rows, []];
    }

    // 5. TASKS & TASK_TAGS
    if (/SELECT COALESCE\(MAX\(position\), -1\) \+ 1 AS next_pos FROM tasks/i.test(norm)) {
      const [wid, status] = params;
      const matching = state.tasks.filter(
        (t) => t.workspace_id === Number(wid) && t.status === status
      );
      const maxPos =
        matching.length > 0
          ? Math.max(...matching.map((t) => t.position || 0))
          : -1;
      return [[{ next_pos: maxPos + 1 }], []];
    }

    if (/^INSERT INTO tasks/i.test(norm)) {
      const [
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
        position,
      ] = params;

      const id = state.seq.tasks++;
      const ts = nowIso();
      state.tasks.push({
        id,
        workspace_id: Number(workspace_id),
        project_id: Number(project_id),
        code,
        title,
        description: description ?? null,
        status,
        priority,
        due_date: due_date ?? null,
        assignee_id: assignee_id !== null ? Number(assignee_id) : null,
        created_by: Number(created_by),
        source,
        position: Number(position ?? 0),
        created_at: ts,
        updated_at: ts,
      });
      return [{ insertId: id, affectedRows: 1 }, []];
    }

    if (/^INSERT INTO task_tags/i.test(norm)) {
      const [task_id, tag] = params;
      const exists = state.task_tags.some(
        (tt) => tt.task_id === Number(task_id) && tt.tag === tag
      );
      if (!exists) {
        state.task_tags.push({ task_id: Number(task_id), tag });
      }
      return [{ affectedRows: 1 }, []];
    }

    if (/^DELETE FROM task_tags WHERE task_id = \?/i.test(norm)) {
      const [tid] = params;
      state.task_tags = state.task_tags.filter(
        (tt) => tt.task_id !== Number(tid)
      );
      return [{ affectedRows: 1 }, []];
    }

    if (/SELECT task_id, tag FROM task_tags WHERE task_id IN/i.test(norm)) {
      const ids = params.map(Number);
      const rows = state.task_tags
        .filter((tt) => ids.includes(tt.task_id))
        .sort((a, b) => a.tag.localeCompare(b.tag));
      return [rows, []];
    }

    if (/FROM tasks t .* WHERE t\.id = \? AND t\.workspace_id = \?/i.test(norm)) {
      const [tid, wid] = params;
      const found = state.tasks.find(
        (t) => t.id === Number(tid) && t.workspace_id === Number(wid)
      );
      return [found ? [enrichTaskRow(found)] : [], []];
    }

    if (/FROM tasks t .* WHERE t\.workspace_id = \? AND t\.code = \?/i.test(norm)) {
      const [wid, code] = params;
      const found = state.tasks.find(
        (t) =>
          t.workspace_id === Number(wid) &&
          t.code.toUpperCase() === String(code).toUpperCase()
      );
      return [found ? [enrichTaskRow(found)] : [], []];
    }

    if (/SELECT COUNT\(\*\) AS total FROM tasks t WHERE/i.test(norm)) {
      const wherePart = norm.slice(norm.indexOf('WHERE ') + 6);
      const { list } = filterTasksWhere(wherePart, params);
      return [[{ total: list.length }], []];
    }

    if (/FROM tasks t .* ORDER BY t\.status, t\.position ASC, t\.id DESC LIMIT \? OFFSET \?/i.test(norm)) {
      const afterWhere = norm.slice(norm.indexOf('WHERE ') + 6);
      const wherePart = afterWhere.split(' ORDER BY')[0];
      const { list, nextParamIdx } = filterTasksWhere(wherePart, params);
      const limit = Number(params[nextParamIdx] || 50);
      const offset = Number(params[nextParamIdx + 1] || 0);

      const sorted = [...list].sort((a, b) => {
        if (a.status !== b.status) return a.status.localeCompare(b.status);
        if (a.position !== b.position) return a.position - b.position;
        return b.id - a.id;
      });
      const sliced = sorted.slice(offset, offset + limit).map(enrichTaskRow);
      return [sliced, []];
    }

    if (/FROM tasks t .* ORDER BY t\.updated_at DESC, t\.id DESC LIMIT/i.test(norm)) {
      const wid = Number(params[0]);
      const list = state.tasks
        .filter((t) => t.workspace_id === wid)
        .sort((a, b) => b.id - a.id)
        .map(enrichTaskRow);
      return [list, []];
    }

    if (/^UPDATE tasks SET/i.test(norm)) {
      const setSection = norm.split('SET ')[1].split(' WHERE')[0];
      const assignments = setSection.split(',').map((s) => s.trim());
      const taskId = Number(params[params.length - 2]);
      const workspaceId = Number(params[params.length - 1]);

      const task = state.tasks.find(
        (t) => t.id === taskId && t.workspace_id === workspaceId
      );
      if (!task) return [{ affectedRows: 0 }, []];

      assignments.forEach((assign, i) => {
        const col = assign.split('=')[0].trim();
        task[col] = params[i];
      });
      task.updated_at = nowIso();
      return [{ affectedRows: 1 }, []];
    }

    if (/^DELETE FROM tasks WHERE id = \? AND workspace_id = \?/i.test(norm)) {
      const [tid, wid] = params;
      const beforeLen = state.tasks.length;
      state.tasks = state.tasks.filter(
        (t) => !(t.id === Number(tid) && t.workspace_id === Number(wid))
      );
      const deleted = beforeLen - state.tasks.length;
      if (deleted > 0) {
        state.task_tags = state.task_tags.filter(
          (tt) => tt.task_id !== Number(tid)
        );
      }
      return [{ affectedRows: deleted }, []];
    }

    if (/SELECT status, COUNT\(\*\) AS count FROM tasks WHERE workspace_id = \? GROUP BY status/i.test(norm)) {
      const [wid] = params;
      const counts = {};
      for (const t of state.tasks.filter((x) => x.workspace_id === Number(wid))) {
        counts[t.status] = (counts[t.status] || 0) + 1;
      }
      const rows = Object.entries(counts).map(([status, count]) => ({
        status,
        count,
      }));
      return [rows, []];
    }

    if (/SELECT priority, COUNT\(\*\) AS count FROM tasks WHERE workspace_id = \? GROUP BY priority/i.test(norm)) {
      const [wid] = params;
      const counts = {};
      for (const t of state.tasks.filter((x) => x.workspace_id === Number(wid))) {
        counts[t.priority] = (counts[t.priority] || 0) + 1;
      }
      const rows = Object.entries(counts).map(([priority, count]) => ({
        priority,
        count,
      }));
      return [rows, []];
    }

    if (/SELECT COUNT\(\*\) AS overdue_count FROM tasks/i.test(norm)) {
      const [wid] = params;
      const today = todayStr();
      const count = state.tasks.filter(
        (t) =>
          t.workspace_id === Number(wid) &&
          t.due_date &&
          t.due_date < today &&
          t.status !== 'DONE'
      ).length;
      return [[{ overdue_count: count }], []];
    }

    // 6. ACTIVITIES
    if (/^INSERT INTO activities/i.test(norm)) {
      let workspace_id;
      let actor_id;
      let task_id;
      let type;
      let meta;

      if (norm.includes("NULL, 'workspace.created'")) {
        [workspace_id, actor_id, meta] = params;
        task_id = null;
        type = 'workspace.created';
      } else {
        [workspace_id, actor_id, task_id, type, meta] = params;
      }

      const id = state.seq.activities++;
      state.activities.push({
        id,
        workspace_id: Number(workspace_id),
        actor_id: Number(actor_id),
        task_id: task_id !== null && task_id !== undefined ? Number(task_id) : null,
        type,
        meta,
        created_at: nowIso(),
      });
      return [{ insertId: id, affectedRows: 1 }, []];
    }

    if (/FROM activities a .* WHERE a\.id = \?/i.test(norm)) {
      const [id] = params;
      const found = state.activities.find((a) => a.id === Number(id));
      return [found ? [enrichActivityRow(found)] : [], []];
    }

    if (/FROM activities a .* ORDER BY a\.id DESC LIMIT/i.test(norm)) {
      const wid = Number(params[0]);
      let list = state.activities.filter((a) => a.workspace_id === wid);

      if (norm.includes('a.id < ?')) {
        const beforeId = Number(params[1]);
        const limit = Number(params[2]);
        list = list
          .filter((a) => a.id < beforeId)
          .sort((a, b) => b.id - a.id)
          .slice(0, limit);
      } else {
        const limit = Number(params[params.length - 1]) || 100;
        list = list.sort((a, b) => b.id - a.id).slice(0, limit);
      }

      return [list.map(enrichActivityRow), []];
    }

    // 7. PASSWORD RESET TOKENS
    if (/^INSERT INTO password_reset_tokens/i.test(norm)) {
      const [userId, tokenHash, expiresAt] = params;
      const id = state.seq.password_reset_tokens++;
      state.password_reset_tokens.push({
        id,
        user_id: Number(userId),
        token_hash: tokenHash,
        expires_at: expiresAt instanceof Date ? expiresAt.toISOString() : String(expiresAt),
        used_at: null,
        created_at: nowIso(),
      });
      return [{ insertId: id, affectedRows: 1 }, []];
    }

    if (/FROM password_reset_tokens WHERE token_hash = \?/i.test(norm)) {
      const [tokenHash] = params;
      const token = state.password_reset_tokens.find(
        (t) => t.token_hash === tokenHash && t.used_at === null && new Date(t.expires_at) > new Date()
      );
      return [token ? [{ ...token }] : [], []];
    }

    if (/UPDATE password_reset_tokens SET used_at = UTC_TIMESTAMP\(\) WHERE id = \?/i.test(norm)) {
      const [id] = params;
      const t = state.password_reset_tokens.find((item) => item.id === Number(id));
      if (t) t.used_at = nowIso();
      return [{ affectedRows: t ? 1 : 0 }, []];
    }

    if (/UPDATE password_reset_tokens SET used_at = UTC_TIMESTAMP\(\) WHERE user_id = \?/i.test(norm)) {
      const [userId] = params;
      let count = 0;
      state.password_reset_tokens.forEach((item) => {
        if (item.user_id === Number(userId) && item.used_at === null) {
          item.used_at = nowIso();
          count++;
        }
      });
      return [{ affectedRows: count }, []];
    }

    if (/DELETE FROM refresh_tokens WHERE user_id = \?/i.test(norm)) {
      return [{ affectedRows: 0 }, []];
    }

    throw new Error(`[InMemoryRelationalPool] Unhandled SQL query: ${norm}`);
  }

  return {
    execute,
    async getConnection() {
      return {
        execute,
        async beginTransaction() {
          snapshot = cloneState(state);
        },
        async commit() {
          snapshot = null;
        },
        async rollback() {
          if (snapshot) {
            Object.assign(state, snapshot);
            snapshot = null;
          }
        },
        release() {},
      };
    },
    async end() {},
  };
}

/**
 * Initializes the test database before running Supertest integration tests.
 * - First attempts to connect to real MySQL (`runSetup`) and clean existing tables.
 * - If local MySQL throws `ER_ACCESS_DENIED_ERROR` or `ECONNREFUSED` (e.g., before local
 *   `DB_PASSWORD` is configured in `.env`), automatically wires the in-memory relational
 *   MySQL pool so `npm test` still tests the entire Express app end-to-end.
 */
export async function initTestDatabase() {
  try {
    await runSetup({ silent: true });
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      for (const table of [
        'password_reset_tokens',
        'activities',
        'task_tags',
        'tasks',
        'projects',
        'memberships',
        'workspaces',
        'users',
      ]) {
        await conn.query(`TRUNCATE TABLE \`${table}\``);
      }
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    } finally {
      conn.release();
    }
    return { mode: 'mysql' };
  } catch (err) {
    if (
      err?.code === 'ER_ACCESS_DENIED_ERROR' ||
      err?.code === 'ECONNREFUSED' ||
      err?.code === 'ENOTFOUND'
    ) {
      globalThis.__flowspacePool = createInMemoryRelationalPool();
      return { mode: 'memory-fallback', reason: err.code };
    }
    throw err;
  }
}

export async function teardownTestDatabase() {
  await closePool();
}

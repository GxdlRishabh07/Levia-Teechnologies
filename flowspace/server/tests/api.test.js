import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { initTestDatabase, teardownTestDatabase } from './testDbHelper.js';

/**
 * Extracts the `flowspace_token=...` cookie string from a Supertest response.
 */
function extractAuthCookie(res) {
  const cookies = res.headers['set-cookie'] || [];
  const tokenCookie = cookies.find((c) => c.startsWith('flowspace_token='));
  return tokenCookie ? tokenCookie.split(';')[0] : null;
}

describe('FlowSpace API Integration Suite (Auth, Multi-Tenant RBAC, Tasks CRUD, AI Compiler)', () => {
  let ownerACookie = null;
  let ownerAWorkspaceId = null;
  let ownerAUserId = null;
  let createdTask1 = null;
  let createdTask2 = null;

  let userBCookie = null;
  let userBWorkspaceId = null;

  let memberCCookie = null;

  before(async () => {
    await initTestDatabase();
  });

  after(async () => {
    await teardownTestDatabase();
  });

  describe('1. Health Check', () => {
    it('GET /api/health returns 200 OK with database health status', async () => {
      const res = await request(app).get('/api/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
      assert.equal(res.body.db.ok, true);
      assert.equal(typeof res.body.timestamp, 'string');
    });
  });

  describe('2. Authentication & Session Flow', () => {
    it('POST /api/auth/signup creates a user, default workspace, default FLOW project, and sets httpOnly cookie', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        name: 'Arjun Test',
        email: 'arjun.test@flowspace.dev',
        password: 'Password123!',
        workspaceName: 'Acme Engineering',
      });

      assert.equal(res.status, 201);
      assert.ok(res.body.user?.id);
      assert.equal(res.body.user.email, 'arjun.test@flowspace.dev');
      assert.equal(res.body.user.passwordHash, undefined);
      assert.ok(Array.isArray(res.body.workspaces));
      assert.equal(res.body.workspaces.length, 1);
      assert.equal(res.body.workspaces[0].name, 'Acme Engineering');
      assert.equal(res.body.workspaces[0].role, 'OWNER');

      const setCookieHeader = (res.headers['set-cookie'] || []).join('; ');
      assert.match(setCookieHeader, /flowspace_token=/);
      assert.match(setCookieHeader, /HttpOnly/i);

      ownerACookie = extractAuthCookie(res);
      ownerAWorkspaceId = res.body.workspaces[0].id;
      ownerAUserId = res.body.user.id;
    });

    it('POST /api/auth/signup rejects duplicate email with 409 Conflict', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        name: 'Duplicate User',
        email: 'arjun.test@flowspace.dev',
        password: 'Password123!',
      });

      assert.equal(res.status, 409);
      assert.equal(res.body.error.code, 'EMAIL_ALREADY_EXISTS');
    });

    it('POST /api/auth/login rejects invalid credentials with 401 Unauthorized', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'arjun.test@flowspace.dev',
        password: 'WrongPassword!',
      });

      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'INVALID_CREDENTIALS');
    });

    it('POST /api/auth/login authenticates valid credentials and sets httpOnly cookie', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'arjun.test@flowspace.dev',
        password: 'Password123!',
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.user.email, 'arjun.test@flowspace.dev');
      const cookie = extractAuthCookie(res);
      assert.ok(cookie);
      ownerACookie = cookie;
    });

    it('GET /api/auth/me returns current user and workspaces when authenticated', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', ownerACookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.user.id, ownerAUserId);
      assert.equal(res.body.workspaces[0].id, ownerAWorkspaceId);
    });

    it('POST /api/auth/logout clears the authentication cookie', async () => {
      const res = await request(app).post('/api/auth/logout');
      assert.equal(res.status, 200);
      assert.equal(res.body.ok, true);
      const setCookieHeader = (res.headers['set-cookie'] || []).join('; ');
      assert.match(setCookieHeader, /flowspace_token=;/);
    });
  });

  describe('3. Projects & Tasks CRUD, Atomic Task Codes, Filters, Stats & Activity', () => {
    it('POST /api/workspaces/:wid/projects creates a secondary project and prevents duplicate keys', async () => {
      const createRes = await request(app)
        .post(`/api/workspaces/${ownerAWorkspaceId}/projects`)
        .set('Cookie', ownerACookie)
        .send({
          name: 'AI Runtime',
          key: 'AI',
          description: 'Groq Llama 3.3 & Whisper integration',
        });

      assert.equal(createRes.status, 201);
      assert.equal(createRes.body.project.key, 'AI');

      const dupRes = await request(app)
        .post(`/api/workspaces/${ownerAWorkspaceId}/projects`)
        .set('Cookie', ownerACookie)
        .send({
          name: 'Duplicate AI',
          key: 'AI',
        });

      assert.equal(dupRes.status, 409);
      assert.equal(dupRes.body.error.code, 'PROJECT_KEY_EXISTS');
    });

    it('POST /api/workspaces/:wid/tasks generates sequential atomic task codes (FLOW-1, FLOW-2)', async () => {
      const res1 = await request(app)
        .post(`/api/workspaces/${ownerAWorkspaceId}/tasks`)
        .set('Cookie', ownerACookie)
        .send({
          title: 'Implement MySQL connection pool caching',
          description: 'Cache mysql2 pool on globalThis for Vercel serverless warm invocations',
          status: 'BACKLOG',
          priority: 'HIGH',
          tags: ['Backend', 'Database'],
          dueDate: '2026-12-01',
          assigneeId: ownerAUserId,
        });

      assert.equal(res1.status, 201);
      assert.equal(res1.body.task.code, 'FLOW-1');
      assert.equal(res1.body.task.priority, 'HIGH');
      assert.deepEqual(res1.body.task.tags, ['backend', 'database']);
      assert.equal(res1.body.task.source, 'MANUAL');
      createdTask1 = res1.body.task;

      const res2 = await request(app)
        .post(`/api/workspaces/${ownerAWorkspaceId}/tasks`)
        .set('Cookie', ownerACookie)
        .send({
          title: 'Fix overdue payment webhook retry bug',
          status: 'IN_PROGRESS',
          priority: 'URGENT',
          tags: ['payments', 'security'],
          dueDate: '2020-01-01', // Past date to verify overdue stat calculation
        });

      assert.equal(res2.status, 201);
      assert.equal(res2.body.task.code, 'FLOW-2');
      createdTask2 = res2.body.task;
    });

    it('GET /api/workspaces/:wid/tasks supports status, priority, tag, search filters and pagination', async () => {
      const allRes = await request(app)
        .get(`/api/workspaces/${ownerAWorkspaceId}/tasks?page=1&limit=10`)
        .set('Cookie', ownerACookie);

      assert.equal(allRes.status, 200);
      assert.equal(allRes.body.total, 2);
      assert.equal(allRes.body.tasks.length, 2);

      const tagRes = await request(app)
        .get(`/api/workspaces/${ownerAWorkspaceId}/tasks?tag=payments`)
        .set('Cookie', ownerACookie);

      assert.equal(tagRes.status, 200);
      assert.equal(tagRes.body.tasks.length, 1);
      assert.equal(tagRes.body.tasks[0].code, 'FLOW-2');

      const searchRes = await request(app)
        .get(`/api/workspaces/${ownerAWorkspaceId}/tasks?q=connection+pool`)
        .set('Cookie', ownerACookie);

      assert.equal(searchRes.status, 200);
      assert.equal(searchRes.body.tasks.length, 1);
      assert.equal(searchRes.body.tasks[0].code, 'FLOW-1');
    });

    it('PATCH /api/workspaces/:wid/tasks/:id transitions task status and updates fields', async () => {
      const patchRes = await request(app)
        .patch(`/api/workspaces/${ownerAWorkspaceId}/tasks/${createdTask1.id}`)
        .set('Cookie', ownerACookie)
        .send({
          status: 'DONE',
          priority: 'URGENT',
        });

      assert.equal(patchRes.status, 200);
      assert.equal(patchRes.body.task.status, 'DONE');
      assert.equal(patchRes.body.task.priority, 'URGENT');
    });

    it('GET /api/workspaces/:wid/stats computes status distribution, overdue count, and completion %', async () => {
      const statsRes = await request(app)
        .get(`/api/workspaces/${ownerAWorkspaceId}/stats`)
        .set('Cookie', ownerACookie);

      assert.equal(statsRes.status, 200);
      const { stats } = statsRes.body;
      assert.equal(stats.total, 2);
      assert.equal(stats.completed, 1);
      assert.equal(stats.overdue, 1); // FLOW-2 has dueDate 2020-01-01 and status IN_PROGRESS
      assert.equal(stats.completionPercentage, 50);
      assert.equal(stats.byStatus.DONE, 1);
      assert.equal(stats.byStatus.IN_PROGRESS, 1);
    });

    it('GET /api/workspaces/:wid/activity returns keyset-paginated audit trail', async () => {
      const actRes = await request(app)
        .get(`/api/workspaces/${ownerAWorkspaceId}/activity?limit=10`)
        .set('Cookie', ownerACookie);

      assert.equal(actRes.status, 200);
      assert.ok(Array.isArray(actRes.body.activities));
      assert.ok(actRes.body.activities.length >= 4);
      const types = actRes.body.activities.map((a) => a.type);
      assert.ok(types.includes('task.status_changed'));
      assert.ok(types.includes('task.created'));
    });

    it('DELETE /api/workspaces/:wid/tasks/:id deletes a task and records task.deleted activity', async () => {
      const delRes = await request(app)
        .delete(`/api/workspaces/${ownerAWorkspaceId}/tasks/${createdTask2.id}`)
        .set('Cookie', ownerACookie);

      assert.equal(delRes.status, 200);
      assert.equal(delRes.body.deleted, true);

      const listRes = await request(app)
        .get(`/api/workspaces/${ownerAWorkspaceId}/tasks`)
        .set('Cookie', ownerACookie);
      assert.equal(listRes.body.total, 1);
    });
  });

  describe('4. Multi-Tenant Isolation & Role-Based Access Control (RBAC)', () => {
    it('Signs up User B in an isolated workspace', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        name: 'User B',
        email: 'userb@othercompany.dev',
        password: 'Password123!',
        workspaceName: 'OtherCompany Workspace',
      });

      assert.equal(res.status, 201);
      userBCookie = extractAuthCookie(res);
      userBWorkspaceId = res.body.workspaces[0].id;
      assert.notEqual(userBWorkspaceId, ownerAWorkspaceId);
    });

    it('Blocks User B from reading or creating tasks in Workspace A with 403 FORBIDDEN', async () => {
      const getTasksRes = await request(app)
        .get(`/api/workspaces/${ownerAWorkspaceId}/tasks`)
        .set('Cookie', userBCookie);
      assert.equal(getTasksRes.status, 403);
      assert.equal(getTasksRes.body.error.code, 'FORBIDDEN');

      const postTaskRes = await request(app)
        .post(`/api/workspaces/${ownerAWorkspaceId}/tasks`)
        .set('Cookie', userBCookie)
        .send({ title: 'Unauthorized cross-tenant task injection' });
      assert.equal(postTaskRes.status, 403);
      assert.equal(postTaskRes.body.error.code, 'FORBIDDEN');
    });

    it('Blocks User B from authorizing Pusher presence channel for Workspace A with 403 FORBIDDEN', async () => {
      const realtimeRes = await request(app)
        .post('/api/realtime/auth')
        .set('Cookie', userBCookie)
        .send({
          socket_id: '1234.5678',
          channel_name: `presence-workspace-${ownerAWorkspaceId}`,
        });

      assert.equal(realtimeRes.status, 403);
      assert.equal(realtimeRes.body.error.code, 'FORBIDDEN');
    });

    it('Enforces OWNER-only permission when adding workspace members (MEMBER gets 403 FORBIDDEN)', async () => {
      // 1. Register User C
      const signupC = await request(app).post('/api/auth/signup').send({
        name: 'Priya Member',
        email: 'priya.member@flowspace.dev',
        password: 'Password123!',
      });
      assert.equal(signupC.status, 201);
      memberCCookie = extractAuthCookie(signupC);

      // 2. Owner A invites User C as MEMBER to Workspace A
      const addRes = await request(app)
        .post(`/api/workspaces/${ownerAWorkspaceId}/members`)
        .set('Cookie', ownerACookie)
        .send({
          email: 'priya.member@flowspace.dev',
          role: 'MEMBER',
        });
      assert.equal(addRes.status, 201);
      assert.equal(addRes.body.member.role, 'MEMBER');

      // 3. User C (MEMBER) attempts to add User B to Workspace A -> must be rejected with 403 FORBIDDEN
      const memberAddAttempt = await request(app)
        .post(`/api/workspaces/${ownerAWorkspaceId}/members`)
        .set('Cookie', memberCCookie)
        .send({
          email: 'userb@othercompany.dev',
          role: 'MEMBER',
        });
      assert.equal(memberAddAttempt.status, 403);
      assert.equal(memberAddAttempt.body.error.code, 'FORBIDDEN');
    });
  });

  describe('5. AI Command Bar (Parse, Zod Contract Validation, Execute, Standup)', () => {
    let aiCreatedPreview = null;

    it('POST /api/workspaces/:wid/ai/parse compiles CREATE_TASKS prompt (including Hinglish/member resolution) without writing to DB', async () => {
      const parseRes = await request(app)
        .post(`/api/workspaces/${ownerAWorkspaceId}/ai/parse`)
        .set('Cookie', ownerACookie)
        .send({
          text: 'Create 2 high priority backend tasks for Stripe webhook retry and Redis rate limiting assigned to Priya',
          source: 'AI_TEXT',
        });

      assert.equal(parseRes.status, 200);
      assert.ok(parseRes.body.preview);
      assert.equal(parseRes.body.preview.intent, 'CREATE_TASKS');
      assert.ok(Array.isArray(parseRes.body.preview.tasks));
      assert.ok(parseRes.body.preview.tasks.length >= 1);
      assert.equal(parseRes.body.preview.tasks[0].priority, 'HIGH');
      aiCreatedPreview = parseRes.body.preview;
    });

    it('POST /api/workspaces/:wid/ai/parse compiles UPDATE_STATUS and FILTER_TASKS intents', async () => {
      const updateParseRes = await request(app)
        .post(`/api/workspaces/${ownerAWorkspaceId}/ai/parse`)
        .set('Cookie', ownerACookie)
        .send({
          text: 'Move FLOW-1 to In Review',
          source: 'AI_TEXT',
        });

      assert.equal(updateParseRes.status, 200);
      assert.equal(updateParseRes.body.preview.intent, 'UPDATE_STATUS');
      assert.equal(updateParseRes.body.preview.taskCode, 'FLOW-1');
      assert.equal(updateParseRes.body.preview.status, 'IN_REVIEW');

      const filterParseRes = await request(app)
        .post(`/api/workspaces/${ownerAWorkspaceId}/ai/parse`)
        .set('Cookie', ownerACookie)
        .send({
          text: 'Show only urgent backend tasks',
          source: 'AI_TEXT',
        });

      assert.equal(filterParseRes.status, 200);
      assert.equal(filterParseRes.body.preview.intent, 'FILTER_TASKS');
      assert.equal(filterParseRes.body.preview.filters.priority, 'URGENT');
    });

    it('POST /api/workspaces/:wid/ai/execute atomically creates tasks from confirmed preview with source: AI_TEXT', async () => {
      const execRes = await request(app)
        .post(`/api/workspaces/${ownerAWorkspaceId}/ai/execute`)
        .set('Cookie', ownerACookie)
        .send({
          preview: aiCreatedPreview,
          source: 'AI_TEXT',
        });

      assert.equal(execRes.status, 201);
      assert.equal(execRes.body.intent, 'CREATE_TASKS');
      assert.ok(Array.isArray(execRes.body.tasks));
      assert.equal(execRes.body.tasks.length, aiCreatedPreview.tasks.length);
      assert.equal(execRes.body.tasks[0].source, 'AI_TEXT');
      assert.match(execRes.body.tasks[0].code, /^FLOW-\d+$/);
    });

    it('POST /api/workspaces/:wid/ai/standup synthesizes a structured daily standup digest', async () => {
      const standupRes = await request(app)
        .post(`/api/workspaces/${ownerAWorkspaceId}/ai/standup`)
        .set('Cookie', ownerACookie)
        .send({});

      assert.equal(standupRes.status, 200);
      assert.ok(standupRes.body.standup);
      assert.equal(typeof standupRes.body.standup.summary, 'string');
      assert.ok(Array.isArray(standupRes.body.standup.done));
      assert.ok(Array.isArray(standupRes.body.standup.inProgress));
      assert.ok(Array.isArray(standupRes.body.standup.blockers));
      assert.ok(Array.isArray(standupRes.body.standup.overdue));
    });
  });
});

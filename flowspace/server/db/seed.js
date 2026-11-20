import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { runSetup } from './setup.js';
import { closePool, query, withTransaction } from '../src/config/db.js';
import * as userRepo from '../src/repositories/userRepo.js';
import * as workspaceRepo from '../src/repositories/workspaceRepo.js';
import * as projectRepo from '../src/repositories/projectRepo.js';
import * as taskRepo from '../src/repositories/taskRepo.js';
import * as activityRepo from '../src/repositories/activityRepo.js';

const DEMO_PASSWORD = 'Demo@1234';
const BCRYPT_ROUNDS = 10;

/**
 * Helper to return a YYYY-MM-DD date string offset by `daysOffset` from today (UTC).
 */
function offsetDate(daysOffset) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysOffset);
  return d.toISOString().slice(0, 10);
}

/**
 * Idempotently seeds the FlowSpace database with demo users, workspace,
 * projects, 8 sprint tasks across all statuses/priorities, and activity logs.
 */
export async function runSeed({ silent = false } = {}) {
  await runSetup({ silent });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

  // 1. Upsert Demo Users
  const demoUsers = [
    { name: 'Arjun Mehta', email: 'arjun@flowspace.dev', role: 'OWNER' },
    { name: 'Priya Sharma', email: 'priya@flowspace.dev', role: 'MEMBER' },
    { name: 'Rahul Verma', email: 'rahul@flowspace.dev', role: 'MEMBER' },
  ];

  const usersByEmail = {};
  for (const u of demoUsers) {
    let existing = await userRepo.findByEmail(u.email);
    if (!existing) {
      existing = await userRepo.createUser({
        name: u.name,
        email: u.email,
        passwordHash,
      });
    }
    usersByEmail[u.email] = existing;
  }

  const arjun = usersByEmail['arjun@flowspace.dev'];
  const priya = usersByEmail['priya@flowspace.dev'];
  const rahul = usersByEmail['rahul@flowspace.dev'];

  // 2. Ensure Demo Workspace exists
  let workspace = await workspaceRepo.findBySlug('flowspace-eng');
  if (!workspace) {
    workspace = await workspaceRepo.createWorkspaceWithOwner({
      name: 'FlowSpace Engineering',
      slug: 'flowspace-eng',
      ownerId: arjun.id,
      defaultProjectName: 'Core Platform',
      defaultProjectKey: 'FLOW',
    });
  }

  // 3. Ensure Memberships for Priya and Rahul
  for (const member of [priya, rahul]) {
    const existingMembership = await workspaceRepo.getMembership(
      member.id,
      workspace.id
    );
    if (!existingMembership) {
      await workspaceRepo.addMember({
        workspaceId: workspace.id,
        userId: member.id,
        role: 'MEMBER',
      });
      await activityRepo.createActivity({
        workspaceId: workspace.id,
        actorId: arjun.id,
        taskId: null,
        type: 'member.added',
        meta: {
          memberId: member.id,
          memberName: member.name,
          memberEmail: member.email,
          role: 'MEMBER',
        },
      });
    }
  }

  // 4. Ensure Projects (`Core Platform` [FLOW] and `AI Runtime` [AI])
  let flowProject = await projectRepo.findByKey(workspace.id, 'FLOW');
  if (!flowProject) {
    flowProject = await projectRepo.createProject({
      workspaceId: workspace.id,
      name: 'Core Platform',
      key: 'FLOW',
      description:
        'Multi-tenant workspace engine, RBAC, Kanban state & Pusher Channels live sync',
    });
  }

  let aiProject = await projectRepo.findByKey(workspace.id, 'AI');
  if (!aiProject) {
    aiProject = await projectRepo.createProject({
      workspaceId: workspace.id,
      name: 'AI Runtime',
      key: 'AI',
      description:
        'Groq Llama 3.3 deterministic JSON command bar, Hinglish normalization & Whisper voice transcription',
    });
  }

  // 5. Seed 8 realistic engineering sprint tasks across BACKLOG, IN_PROGRESS, IN_REVIEW, DONE
  const seedTasks = [
    {
      code: 'FLOW-1',
      projectId: flowProject.id,
      title: 'Design normalized MySQL schema with composite workspace indexes',
      description:
        'Define InnoDB tables (users, workspaces, memberships, projects, tasks, task_tags, activities) with CASCADE/SET NULL foreign keys and composite index (workspace_id, status, position).',
      status: 'DONE',
      priority: 'HIGH',
      dueDate: offsetDate(-2),
      assigneeId: arjun.id,
      createdBy: arjun.id,
      source: 'MANUAL',
      position: 0,
      tags: ['database', 'mysql', 'architecture'],
    },
    {
      code: 'FLOW-2',
      projectId: flowProject.id,
      title: 'Implement JWT httpOnly cookie auth and workspace RBAC middleware',
      description:
        'Secure endpoints with bcrypt (cost 10), SameSite=Lax httpOnly cookies, and per-route requireMembership(wid) verification.',
      status: 'DONE',
      priority: 'URGENT',
      dueDate: offsetDate(-1),
      assigneeId: rahul.id,
      createdBy: arjun.id,
      source: 'MANUAL',
      position: 1,
      tags: ['security', 'auth', 'backend'],
    },
    {
      code: 'FLOW-3',
      projectId: flowProject.id,
      title: 'Fix Razorpay webhook signature verification and retry idempotency',
      description:
        'Validate X-Razorpay-Signature HMAC-SHA256 payload before committing payment status updates.',
      status: 'IN_REVIEW',
      priority: 'URGENT',
      dueDate: offsetDate(-1), // Overdue task for dashboard metric verification
      assigneeId: rahul.id,
      createdBy: arjun.id,
      source: 'AI_TEXT',
      position: 0,
      tags: ['backend', 'payments', 'security'],
    },
    {
      code: 'AI-4',
      projectId: aiProject.id,
      title: 'Build Groq Llama 3.3 70B structured command parser with Zod contract',
      description:
        'Parse English and Hinglish prompts into CREATE_TASKS, UPDATE_STATUS, and FILTER_TASKS previews with temperature 0 and automatic disambiguation.',
      status: 'IN_REVIEW',
      priority: 'HIGH',
      dueDate: offsetDate(1),
      assigneeId: priya.id,
      createdBy: priya.id,
      source: 'AI_TEXT',
      position: 1,
      tags: ['ai', 'groq', 'zod'],
    },
    {
      code: 'FLOW-5',
      projectId: flowProject.id,
      title: 'Wire Pusher presence channels and React Query optimistic cache sync',
      description:
        'Authenticate presence-workspace-<wid> via POST /api/realtime/auth, exclude sender via X-Socket-Id, and patch board cache on task.updated.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: offsetDate(2),
      assigneeId: arjun.id,
      createdBy: arjun.id,
      source: 'MANUAL',
      position: 0,
      tags: ['realtime', 'pusher', 'frontend'],
    },
    {
      code: 'FLOW-6',
      projectId: flowProject.id,
      title: 'Polish frosted glass Kanban board drag-and-drop and responsive layout',
      description:
        'Apply frosted glassmorphism tokens, dark blue spotlight theme, mobile drawer navigation, and touch-friendly card reordering.',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      dueDate: offsetDate(3),
      assigneeId: priya.id,
      createdBy: arjun.id,
      source: 'MANUAL',
      position: 1,
      tags: ['frontend', 'ui', 'design'],
    },
    {
      code: 'AI-7',
      projectId: aiProject.id,
      title: 'Add Groq Whisper voice capture with 60s MediaRecorder guard',
      description:
        'Stream WebM/Opus audio blob under Vercel 4.5MB payload limit to POST /api/workspaces/:wid/ai/transcribe and feed transcript into AI preview.',
      status: 'BACKLOG',
      priority: 'MEDIUM',
      dueDate: offsetDate(5),
      assigneeId: priya.id,
      createdBy: priya.id,
      source: 'AI_VOICE',
      position: 0,
      tags: ['ai', 'voice', 'whisper'],
    },
    {
      code: 'AI-8',
      projectId: aiProject.id,
      title: 'Generate AI Daily Standup digest from 24h workspace activity log',
      description:
        'Summarize completed, in-progress, and blocked tasks per teammate from recent activity records.',
      status: 'BACKLOG',
      priority: 'LOW',
      dueDate: offsetDate(7),
      assigneeId: rahul.id,
      createdBy: arjun.id,
      source: 'MANUAL',
      position: 1,
      tags: ['ai', 'standup', 'productivity'],
    },
  ];

  let createdCount = 0;

  await withTransaction(async (conn) => {
    for (const item of seedTasks) {
      const existingTask = await taskRepo.findByCode(
        workspace.id,
        item.code,
        conn
      );
      if (!existingTask) {
        const created = await taskRepo.createTask(
          {
            workspaceId: workspace.id,
            projectId: item.projectId,
            code: item.code,
            title: item.title,
            description: item.description,
            status: item.status,
            priority: item.priority,
            dueDate: item.dueDate,
            assigneeId: item.assigneeId,
            createdBy: item.createdBy,
            source: item.source,
            position: item.position,
            tags: item.tags,
          },
          conn
        );

        await activityRepo.createActivity(
          {
            workspaceId: workspace.id,
            actorId: item.createdBy,
            taskId: created.id,
            type: 'task.created',
            meta: {
              code: created.code,
              title: created.title,
              status: created.status,
              priority: created.priority,
              source: created.source,
            },
          },
          conn
        );

        if (item.status === 'DONE' || item.status === 'IN_REVIEW') {
          await activityRepo.createActivity(
            {
              workspaceId: workspace.id,
              actorId: item.assigneeId || item.createdBy,
              taskId: created.id,
              type: 'task.status_changed',
              meta: {
                code: created.code,
                title: created.title,
                from: 'IN_PROGRESS',
                to: item.status,
              },
            },
            conn
          );
        }

        createdCount += 1;
      }
    }

    // Ensure workspace.task_counter is at least 8 so new tasks start at -9
    await query(
      `UPDATE workspaces
       SET task_counter = GREATEST(task_counter, ?)
       WHERE id = ?`,
      [seedTasks.length, workspace.id],
      conn
    );
  });

  if (!silent) {
    console.log('✅ FlowSpace demo seed complete:');
    console.log(
      `   • Workspace : ${workspace.name} (slug: "${workspace.slug}", id: ${workspace.id})`
    );
    console.log(
      `   • Owner     : ${arjun.email} / ${DEMO_PASSWORD}`
    );
    console.log(
      `   • Members   : ${priya.email}, ${rahul.email} (Password: ${DEMO_PASSWORD})`
    );
    console.log(
      `   • Projects  : ${flowProject.key} (${flowProject.name}), ${aiProject.key} (${aiProject.name})`
    );
    console.log(
      `   • Tasks     : ${seedTasks.length} sprint tasks verified (${createdCount} newly inserted)`
    );
  }

  return {
    workspace,
    users: { arjun, priya, rahul },
    projects: { flowProject, aiProject },
  };
}

// Execute immediately if run via `node server/db/seed.js`
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  runSeed()
    .then(async () => {
      await closePool();
      process.exit(0);
    })
    .catch(async () => {
      await closePool();
      process.exit(1);
    });
}

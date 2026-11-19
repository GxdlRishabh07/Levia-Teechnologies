import { withTransaction } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import workspaceRepo from '../repositories/workspaceRepo.js';
import projectRepo from '../repositories/projectRepo.js';
import taskRepo from '../repositories/taskRepo.js';
import activityRepo from '../repositories/activityRepo.js';
import publisher from './realtime/publisher.js';

/**
 * Resolves an assignee userId from either an explicit `assigneeId` or a free-text `assigneeName`
 * against the workspace's member list.
 */
function resolveMemberAssigneeId(members, { assigneeId, assigneeName }) {
  if (assigneeId !== undefined && assigneeId !== null && assigneeId !== '') {
    const found = members.find((m) => Number(m.userId) === Number(assigneeId));
    return found ? Number(found.userId) : null;
  }

  if (assigneeName && typeof assigneeName === 'string' && assigneeName.trim()) {
    const needle = assigneeName.trim().toLowerCase();
    // 1. Exact full name or email match
    const exact = members.find(
      (m) =>
        m.name.toLowerCase() === needle ||
        m.email.toLowerCase() === needle
    );
    if (exact) return Number(exact.userId);

    // 2. First name or partial match
    const partial = members.find(
      (m) =>
        m.name.toLowerCase().split(/\s+/)[0] === needle ||
        m.name.toLowerCase().includes(needle) ||
        m.email.toLowerCase().startsWith(needle)
    );
    if (partial) return Number(partial.userId);
  }

  return null;
}

/**
 * Creates a single task inside a workspace within an ACID transaction:
 * 1. Validates project & assignee membership
 * 2. Atomically increments `workspaces.task_counter` with `SELECT ... FOR UPDATE`
 * 3. Inserts `tasks` + `task_tags`
 * 4. Inserts `activities` (`task.created`)
 * 5. Publishes `task.created` and `activity.new` to Pusher after commit
 */
export async function createTaskInWorkspace({
  workspaceId,
  actorId,
  data,
  source = 'MANUAL',
  socketId = null,
}) {
  const wid = Number(workspaceId);
  const uid = Number(actorId);

  const { task, activity } = await withTransaction(async (conn) => {
    let project = null;

    if (data.projectId) {
      project = await projectRepo.findById(Number(data.projectId), wid, conn);
      if (!project) {
        throw new AppError(
          400,
          'INVALID_PROJECT',
          'Selected project does not belong to this workspace'
        );
      }
    } else if (data.projectKey) {
      project = await projectRepo.findByKey(wid, data.projectKey, conn);
    }

    if (!project) {
      const projects = await projectRepo.listByWorkspace(wid, conn);
      project = projects[0] || null;
    }

    if (!project) {
      throw new AppError(
        400,
        'NO_PROJECT',
        'No project exists in this workspace. Create a project first.'
      );
    }

    let resolvedAssigneeId =
      data.assigneeId !== undefined && data.assigneeId !== null
        ? Number(data.assigneeId)
        : null;

    if (resolvedAssigneeId) {
      const membership = await workspaceRepo.getMembership(
        resolvedAssigneeId,
        wid,
        conn
      );
      if (!membership) {
        throw new AppError(
          400,
          'INVALID_ASSIGNEE',
          'Assignee must be a member of this workspace'
        );
      }
    } else if (data.assigneeName) {
      const members = await workspaceRepo.listMembers(wid, conn);
      resolvedAssigneeId = resolveMemberAssigneeId(members, {
        assigneeName: data.assigneeName,
      });
    }

    const num = await workspaceRepo.incrementTaskCounter(wid, conn);
    const code = `${project.key}-${num}`;
    const effectiveSource = data.source || source || 'MANUAL';

    const createdTask = await taskRepo.createTask(
      {
        ...data,
        workspaceId: wid,
        projectId: project.id,
        assigneeId: resolvedAssigneeId,
        code,
        createdBy: uid,
        source: effectiveSource,
      },
      conn
    );

    const createdActivity = await activityRepo.createActivity(
      {
        workspaceId: wid,
        actorId: uid,
        taskId: createdTask.id,
        type: 'task.created',
        meta: {
          code: createdTask.code,
          title: createdTask.title,
          status: createdTask.status,
          priority: createdTask.priority,
          source: effectiveSource,
        },
      },
      conn
    );

    return { task: createdTask, activity: createdActivity };
  });

  await publisher.publish(wid, 'task.created', task, socketId);
  await publisher.publish(wid, 'activity.new', activity, socketId);

  return task;
}

/**
 * Atomically creates multiple tasks in a single transaction (used by AI Command Bar `CREATE_TASKS`).
 * Keeps Pusher payload under the 10 KB limit by publishing `tasks.bulkCreated` with `{ ids, count }`
 * when more than 1 task is created.
 */
export async function createBulkTasksInWorkspace({
  workspaceId,
  actorId,
  tasksData = [],
  source = 'AI_TEXT',
  socketId = null,
}) {
  const wid = Number(workspaceId);
  const uid = Number(actorId);

  if (!Array.isArray(tasksData) || tasksData.length === 0) {
    throw new AppError(400, 'EMPTY_TASKS', 'No tasks provided to create');
  }

  const { createdTasks, activities } = await withTransaction(async (conn) => {
    const projects = await projectRepo.listByWorkspace(wid, conn);
    if (!projects.length) {
      throw new AppError(
        400,
        'NO_PROJECT',
        'No project exists in this workspace'
      );
    }

    const members = await workspaceRepo.listMembers(wid, conn);
    const results = [];
    const loggedActivities = [];

    for (const item of tasksData) {
      let project = null;
      if (item.projectId) {
        project = projects.find((p) => p.id === Number(item.projectId)) || null;
      }
      if (!project && item.projectKey) {
        const keyUpper = String(item.projectKey).trim().toUpperCase();
        project = projects.find((p) => p.key.toUpperCase() === keyUpper) || null;
      }
      if (!project) {
        project = projects[0];
      }

      const assigneeId = resolveMemberAssigneeId(members, {
        assigneeId: item.assigneeId,
        assigneeName: item.assigneeName,
      });

      const num = await workspaceRepo.incrementTaskCounter(wid, conn);
      const code = `${project.key}-${num}`;
      const effectiveSource = item.source || source || 'AI_TEXT';

      const task = await taskRepo.createTask(
        {
          ...item,
          workspaceId: wid,
          projectId: project.id,
          assigneeId,
          code,
          createdBy: uid,
          source: effectiveSource,
        },
        conn
      );

      const activity = await activityRepo.createActivity(
        {
          workspaceId: wid,
          actorId: uid,
          taskId: task.id,
          type: 'task.created',
          meta: {
            code: task.code,
            title: task.title,
            status: task.status,
            priority: task.priority,
            source: effectiveSource,
          },
        },
        conn
      );

      results.push(task);
      loggedActivities.push(activity);
    }

    return { createdTasks: results, activities: loggedActivities };
  });

  if (createdTasks.length === 1) {
    await publisher.publish(wid, 'task.created', createdTasks[0], socketId);
  } else if (createdTasks.length > 1) {
    await publisher.publish(
      wid,
      'tasks.bulkCreated',
      {
        ids: createdTasks.map((t) => t.id),
        count: createdTasks.length,
      },
      socketId
    );
  }

  if (activities.length > 0) {
    await publisher.publish(
      wid,
      'activity.new',
      activities[activities.length - 1],
      socketId
    );
  }

  return createdTasks;
}

/**
 * Updates an existing task inside a workspace, records activity (`task.status_changed` or `task.updated`),
 * and broadcasts `task.updated` and `activity.new`.
 */
export async function updateTaskInWorkspace({
  workspaceId,
  taskId,
  actorId,
  updates,
  socketId = null,
}) {
  const wid = Number(workspaceId);
  const tid = Number(taskId);
  const uid = Number(actorId);

  const { updated, activity } = await withTransaction(async (conn) => {
    const existing = await taskRepo.findById(tid, wid, conn);
    if (!existing) {
      throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
    }

    if (updates.projectId !== undefined && updates.projectId !== null) {
      const project = await projectRepo.findById(
        Number(updates.projectId),
        wid,
        conn
      );
      if (!project) {
        throw new AppError(
          400,
          'INVALID_PROJECT',
          'Project does not belong to this workspace'
        );
      }
    }

    if (updates.assigneeId !== undefined && updates.assigneeId !== null) {
      const membership = await workspaceRepo.getMembership(
        Number(updates.assigneeId),
        wid,
        conn
      );
      if (!membership) {
        throw new AppError(
          400,
          'INVALID_ASSIGNEE',
          'Assignee must be a member of this workspace'
        );
      }
    }

    const updatedTask = await taskRepo.updateTask(tid, wid, updates, conn);

    const statusChanged =
      updates.status !== undefined && existing.status !== updatedTask.status;
    const activityType = statusChanged ? 'task.status_changed' : 'task.updated';

    const loggedActivity = await activityRepo.createActivity(
      {
        workspaceId: wid,
        actorId: uid,
        taskId: updatedTask.id,
        type: activityType,
        meta: {
          code: updatedTask.code,
          title: updatedTask.title,
          from: existing.status,
          to: updatedTask.status,
          fromStatus: existing.status,
          toStatus: updatedTask.status,
          changes: Object.keys(updates),
        },
      },
      conn
    );

    return { updated: updatedTask, activity: loggedActivity };
  });

  await publisher.publish(wid, 'task.updated', updated, socketId);
  await publisher.publish(wid, 'activity.new', activity, socketId);

  return updated;
}

/**
 * Updates a task's status by its human-readable task code (e.g. `FLOW-12`).
 * Used by AI Command Bar `UPDATE_STATUS` execution.
 */
export async function updateTaskStatusByCode({
  workspaceId,
  taskCode,
  status,
  actorId,
  source: _source = 'AI_TEXT',
  socketId = null,
}) {
  const wid = Number(workspaceId);
  const task = await taskRepo.findByCode(wid, taskCode);
  if (!task) {
    throw new AppError(
      404,
      'TASK_NOT_FOUND',
      `Task ${String(taskCode).toUpperCase()} not found in this workspace`
    );
  }

  return updateTaskInWorkspace({
    workspaceId: wid,
    taskId: task.id,
    actorId,
    updates: { status },
    socketId,
  });
}

/**
 * Deletes a task inside a workspace, records a persistent `task.deleted` activity (`taskId: null`),
 * and broadcasts `task.deleted` and `activity.new`.
 */
export async function deleteTaskInWorkspace({
  workspaceId,
  taskId,
  actorId,
  socketId = null,
}) {
  const wid = Number(workspaceId);
  const tid = Number(taskId);
  const uid = Number(actorId);

  const { existing, activity } = await withTransaction(async (conn) => {
    const found = await taskRepo.findById(tid, wid, conn);
    if (!found) {
      throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
    }

    const loggedActivity = await activityRepo.createActivity(
      {
        workspaceId: wid,
        actorId: uid,
        taskId: null,
        type: 'task.deleted',
        meta: {
          code: found.code,
          title: found.title,
        },
      },
      conn
    );

    await taskRepo.deleteTask(tid, wid, conn);

    return { existing: found, activity: loggedActivity };
  });

  await publisher.publish(
    wid,
    'task.deleted',
    { id: tid, code: existing.code },
    socketId
  );
  await publisher.publish(wid, 'activity.new', activity, socketId);

  return { id: tid, deleted: true };
}

export default {
  createTaskInWorkspace,
  createBulkTasksInWorkspace,
  updateTaskInWorkspace,
  updateTaskStatusByCode,
  deleteTaskInWorkspace,
};

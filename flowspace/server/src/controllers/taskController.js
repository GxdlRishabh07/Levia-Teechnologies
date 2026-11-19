import taskRepo from '../repositories/taskRepo.js';
import taskService from '../services/taskService.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

/**
 * GET /api/workspaces/:wid/tasks
 */
export const listTasks = asyncHandler(async (req, res) => {
  const result = await taskRepo.listTasks(req.workspaceId, req.query);
  return res.status(200).json(result);
});

/**
 * POST /api/workspaces/:wid/tasks
 */
export const createTask = asyncHandler(async (req, res) => {
  const socketId = req.get('x-socket-id') || null;
  const task = await taskService.createTaskInWorkspace({
    workspaceId: req.workspaceId,
    actorId: req.user.id,
    data: req.body,
    source: 'MANUAL',
    socketId,
  });

  return res.status(201).json({ task });
});

/**
 * PATCH /api/workspaces/:wid/tasks/:id
 */
export const updateTask = asyncHandler(async (req, res) => {
  const taskId = Number(req.params.id);
  if (!Number.isInteger(taskId) || taskId <= 0) {
    throw new AppError(400, 'INVALID_TASK_ID', 'Invalid task ID');
  }

  const socketId = req.get('x-socket-id') || null;
  const task = await taskService.updateTaskInWorkspace({
    workspaceId: req.workspaceId,
    taskId,
    actorId: req.user.id,
    updates: req.body,
    socketId,
  });

  return res.status(200).json({ task });
});

/**
 * DELETE /api/workspaces/:wid/tasks/:id
 */
export const deleteTask = asyncHandler(async (req, res) => {
  const taskId = Number(req.params.id);
  if (!Number.isInteger(taskId) || taskId <= 0) {
    throw new AppError(400, 'INVALID_TASK_ID', 'Invalid task ID');
  }

  const socketId = req.get('x-socket-id') || null;
  const result = await taskService.deleteTaskInWorkspace({
    workspaceId: req.workspaceId,
    taskId,
    actorId: req.user.id,
    socketId,
  });

  return res.status(200).json(result);
});

/**
 * GET /api/workspaces/:wid/stats
 */
export const getStats = asyncHandler(async (req, res) => {
  const stats = await taskRepo.getWorkspaceStats(req.workspaceId);
  return res.status(200).json({ stats });
});

export default {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  getStats,
};

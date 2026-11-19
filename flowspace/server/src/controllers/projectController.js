import projectRepo from '../repositories/projectRepo.js';
import activityService from '../services/activityService.js';
import publisher from '../services/realtime/publisher.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

/**
 * GET /api/workspaces/:wid/projects
 */
export const listProjects = asyncHandler(async (req, res) => {
  const projects = await projectRepo.listByWorkspace(req.workspaceId);
  return res.status(200).json({ projects });
});

/**
 * POST /api/workspaces/:wid/projects
 */
export const createProject = asyncHandler(async (req, res) => {
  const { name, key, description = null } = req.body;
  const workspaceId = req.workspaceId;

  const existing = await projectRepo.findByKey(workspaceId, key);
  if (existing) {
    throw new AppError(
      409,
      'PROJECT_KEY_EXISTS',
      `Project key "${key.toUpperCase()}" already exists in this workspace`
    );
  }

  const project = await projectRepo.createProject({
    workspaceId,
    name,
    key,
    description,
  });

  const activity = await activityService.recordActivity({
    workspaceId,
    actorId: req.user.id,
    taskId: null,
    type: 'project.created',
    meta: {
      projectId: project.id,
      name: project.name,
      key: project.key,
    },
  });

  const socketId = req.get('x-socket-id') || null;
  await publisher.publish(workspaceId, 'activity.new', activity, socketId);

  return res.status(201).json({ project });
});

export default {
  listProjects,
  createProject,
};

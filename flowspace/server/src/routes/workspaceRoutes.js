import { Router } from 'express';
import workspaceController from '../controllers/workspaceController.js';
import projectController from '../controllers/projectController.js';
import taskController from '../controllers/taskController.js';
import activityController from '../controllers/activityController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireMembership, requireOwner } from '../middleware/membership.js';
import { validate } from '../middleware/validate.js';
import {
  createWorkspaceSchema,
  addMemberSchema,
  createProjectSchema,
  createTaskSchema,
  updateTaskSchema,
} from '../validators/schemas.js';

const router = Router();

// All workspace routes require an authenticated user
router.use(requireAuth);

// User-level workspace list & creation
router.get('/', workspaceController.listWorkspaces);
router.post(
  '/',
  validate(createWorkspaceSchema),
  workspaceController.createWorkspace
);

// Workspace-scoped routes (every route enforces multi-tenant membership)
router.get(
  '/:wid/members',
  requireMembership,
  workspaceController.listMembers
);
router.post(
  '/:wid/members',
  requireMembership,
  requireOwner,
  validate(addMemberSchema),
  workspaceController.addMember
);

router.get(
  '/:wid/projects',
  requireMembership,
  projectController.listProjects
);
router.post(
  '/:wid/projects',
  requireMembership,
  validate(createProjectSchema),
  projectController.createProject
);

router.get('/:wid/tasks', requireMembership, taskController.listTasks);
router.post(
  '/:wid/tasks',
  requireMembership,
  validate(createTaskSchema),
  taskController.createTask
);
router.patch(
  '/:wid/tasks/:id',
  requireMembership,
  validate(updateTaskSchema),
  taskController.updateTask
);
router.delete('/:wid/tasks/:id', requireMembership, taskController.deleteTask);

router.get(
  '/:wid/activity',
  requireMembership,
  activityController.listActivity
);

router.get('/:wid/stats', requireMembership, taskController.getStats);

export default router;

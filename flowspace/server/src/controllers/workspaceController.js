import userRepo from '../repositories/userRepo.js';
import workspaceRepo from '../repositories/workspaceRepo.js';
import activityService from '../services/activityService.js';
import publisher from '../services/realtime/publisher.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

/**
 * GET /api/workspaces
 */
export const listWorkspaces = asyncHandler(async (req, res) => {
  const workspaces = await workspaceRepo.listUserWorkspaces(req.user.id);
  return res.status(200).json({ workspaces });
});

/**
 * POST /api/workspaces
 */
export const createWorkspace = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const workspace = await workspaceRepo.createWorkspaceWithOwner({
    name,
    ownerId: req.user.id,
  });
  return res.status(201).json({ workspace });
});

/**
 * GET /api/workspaces/:wid/members
 */
export const listMembers = asyncHandler(async (req, res) => {
  const members = await workspaceRepo.listMembers(req.workspaceId);
  return res.status(200).json({ members });
});

/**
 * POST /api/workspaces/:wid/members
 */
export const addMember = asyncHandler(async (req, res) => {
  const { email, role = 'MEMBER' } = req.body;
  const workspaceId = req.workspaceId;

  const targetUser = await userRepo.findByEmail(email);
  if (!targetUser) {
    throw new AppError(
      404,
      'USER_NOT_FOUND',
      'No registered user found with that email. Ask them to sign up first.'
    );
  }

  const existingMembership = await workspaceRepo.getMembership(
    targetUser.id,
    workspaceId
  );
  if (existingMembership) {
    throw new AppError(
      409,
      'ALREADY_MEMBER',
      'This user is already a member of the workspace'
    );
  }

  const member = await workspaceRepo.addMember({
    workspaceId,
    userId: targetUser.id,
    role,
  });

  const activity = await activityService.recordActivity({
    workspaceId,
    actorId: req.user.id,
    taskId: null,
    type: 'member.added',
    meta: {
      memberId: targetUser.id,
      memberName: targetUser.name,
      memberEmail: targetUser.email,
      role,
    },
  });

  const socketId = req.get('x-socket-id') || null;
  await publisher.publish(workspaceId, 'activity.new', activity, socketId);

  const members = await workspaceRepo.listMembers(workspaceId);
  return res.status(201).json({ member, members });
});

export default {
  listWorkspaces,
  createWorkspace,
  listMembers,
  addMember,
};

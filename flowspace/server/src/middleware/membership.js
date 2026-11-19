import workspaceRepo from '../repositories/workspaceRepo.js';
import { AppError, asyncHandler } from './errorHandler.js';

/**
 * Multi-tenant authorization middleware.
 * Verifies that `req.user` is an active member (`OWNER` or `MEMBER`) of workspace `:wid`,
 * and attaches `req.workspaceId` and `req.membership`.
 */
export const requireMembership = asyncHandler(async (req, _res, next) => {
  if (!req.user?.id) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  const wid = Number(req.params.wid);
  if (!Number.isInteger(wid) || wid <= 0) {
    throw new AppError(400, 'INVALID_WORKSPACE_ID', 'Invalid workspace ID');
  }

  const membership = await workspaceRepo.getMembership(req.user.id, wid);
  if (!membership) {
    throw new AppError(403, 'FORBIDDEN', 'You are not a member of this workspace');
  }

  req.workspaceId = wid;
  req.membership = membership;
  next();
});

/**
 * Role-based access control middleware that restricts actions to workspace owners (`OWNER`).
 * Must run after `requireMembership`.
 */
export function requireOwner(req, _res, next) {
  if (req.membership?.role !== 'OWNER') {
    return next(
      new AppError(403, 'FORBIDDEN', 'Only workspace owners can perform this action')
    );
  }
  return next();
}

export default {
  requireMembership,
  requireOwner,
};

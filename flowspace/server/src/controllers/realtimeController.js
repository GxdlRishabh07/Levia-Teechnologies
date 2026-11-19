import workspaceRepo from '../repositories/workspaceRepo.js';
import publisher from '../services/realtime/publisher.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const CHANNEL_PATTERN = /^(?:presence|private)-workspace-(\d+)$/;

/**
 * POST /api/realtime/auth
 * Pusher channel authorization endpoint.
 * Verifies the user's JWT cookie AND active workspace membership in MySQL before
 * signing the `presence-workspace-<wid>` subscription.
 */
export const authChannel = asyncHandler(async (req, res) => {
  const socketId = req.body?.socket_id;
  const channelName = req.body?.channel_name;

  if (!socketId || !channelName) {
    throw new AppError(
      400,
      'INVALID_REALTIME_AUTH',
      'socket_id and channel_name are required'
    );
  }

  const match = String(channelName).trim().match(CHANNEL_PATTERN);
  if (!match) {
    throw new AppError(
      400,
      'INVALID_CHANNEL',
      'Invalid workspace channel name'
    );
  }

  const workspaceId = Number(match[1]);
  const membership = await workspaceRepo.getMembership(
    req.user.id,
    workspaceId
  );

  if (!membership) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'You are not authorized to subscribe to this workspace channel'
    );
  }

  const authResponse = publisher.authorizePresenceChannel(
    String(socketId).trim(),
    String(channelName).trim(),
    req.user
  );

  return res.status(200).json(authResponse);
});

export default {
  authChannel,
};

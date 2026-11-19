import Pusher from 'pusher';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';

let pusherClient = null;

if (env.hasPusher) {
  pusherClient = new Pusher({
    appId: env.PUSHER_APP_ID,
    key: env.PUSHER_KEY,
    secret: env.PUSHER_SECRET,
    cluster: env.PUSHER_CLUSTER || 'ap2',
    useTLS: true,
  });
}

/**
 * Returns the standardized Pusher presence channel name for a workspace.
 *
 * @param {number | string} workspaceId
 * @returns {string}
 */
export function getChannelName(workspaceId) {
  return `presence-workspace-${workspaceId}`;
}

/**
 * Publishes a realtime event to a workspace's Pusher presence channel after a database commit.
 * If Pusher is not configured, degrades gracefully to a no-op so the REST API continues to work.
 *
 * @param {number | string} workspaceId
 * @param {string} event
 * @param {any} payload
 * @param {string | null} [excludeSocketId=null]
 * @returns {Promise<{ delivered: boolean, mode: string, error?: string }>}
 */
export async function publish(
  workspaceId,
  event,
  payload,
  excludeSocketId = null
) {
  if (!pusherClient || !env.hasPusher) {
    return { delivered: false, mode: 'noop' };
  }

  try {
    const channel = getChannelName(workspaceId);
    const params =
      excludeSocketId && typeof excludeSocketId === 'string' && excludeSocketId.trim()
        ? { socket_id: excludeSocketId.trim() }
        : undefined;

    await pusherClient.trigger(channel, event, payload, params);
    return { delivered: true, mode: 'pusher' };
  } catch (err) {
    if (!env.isTest) {
      console.warn(
        `[Pusher Warning] Failed to publish ${event} to workspace ${workspaceId}:`,
        err.message
      );
    }
    return { delivered: false, mode: 'pusher', error: err.message };
  }
}

/**
 * Generates a signed Pusher authorization payload for `presence-workspace-<wid>` or `private-workspace-<wid>`.
 *
 * @param {string} socketId
 * @param {string} channelName
 * @param {{ id: number, name: string, email: string }} user
 */
export function authorizePresenceChannel(socketId, channelName, user) {
  if (!pusherClient || !env.hasPusher) {
    throw new AppError(
      503,
      'REALTIME_UNAVAILABLE',
      'Realtime service is not configured'
    );
  }

  if (channelName.startsWith('presence-')) {
    return pusherClient.authorizeChannel(socketId, channelName, {
      user_id: String(user.id),
      user_info: {
        id: Number(user.id),
        name: user.name,
        email: user.email,
      },
    });
  }

  return pusherClient.authorizeChannel(socketId, channelName);
}

export default {
  publish,
  authorizePresenceChannel,
  getChannelName,
};

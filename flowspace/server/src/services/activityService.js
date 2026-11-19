import activityRepo from '../repositories/activityRepo.js';

/**
 * Records an activity log entry inside a workspace.
 *
 * @param {{
 *   workspaceId: number,
 *   actorId: number,
 *   taskId?: number | null,
 *   type: string,
 *   meta?: Record<string, any> | null
 * }} data
 * @param {import('mysql2/promise').PoolConnection} [conn]
 */
export async function recordActivity(
  { workspaceId, actorId, taskId = null, type, meta = null },
  conn = null
) {
  return activityRepo.createActivity(
    { workspaceId, actorId, taskId, type, meta },
    conn
  );
}

/**
 * Retrieves keyset-paginated activity items for a workspace.
 *
 * @param {number} workspaceId
 * @param {{ before?: number | string | null, limit?: number }} [options={}]
 */
export async function getWorkspaceActivity(
  workspaceId,
  { before, limit = 25 } = {}
) {
  const res = await activityRepo.listActivities(workspaceId, { before, limit });
  return {
    activities: res,
    nextCursor: res.nextCursor ?? null,
    hasMore: Boolean(res.hasMore),
  };
}

export default {
  recordActivity,
  getWorkspaceActivity,
};

import activityService from '../services/activityService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * GET /api/workspaces/:wid/activity?before=&limit=
 */
export const listActivity = asyncHandler(async (req, res) => {
  const { before, limit } = req.query;
  const result = await activityService.getWorkspaceActivity(req.workspaceId, {
    before,
    limit,
  });

  return res.status(200).json(result);
});

export default {
  listActivity,
};

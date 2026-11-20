import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import * as aiService from '../services/aiService.js';
import * as taskService from '../services/taskService.js';
import {
  aiExecuteRequestSchema,
  aiParseRequestSchema,
} from '../validators/aiSchemas.js';

/**
 * POST /api/workspaces/:wid/ai/parse
 * Parses a natural language command (English / Hindi / Hinglish) into a structured,
 * Zod-validated preview without writing to the database.
 */
export const parseCommand = asyncHandler(async (req, res) => {
  const { text, source } = aiParseRequestSchema.parse(req.body || {});

  const result = await aiService.parseCommand({
    workspaceId: req.workspaceId,
    text,
    source,
  });

  return res.status(200).json(result);
});

/**
 * POST /api/workspaces/:wid/ai/execute
 * Validates the user-confirmed AI preview with Zod and executes the action
 * atomically via `taskService`.
 */
export const executeCommand = asyncHandler(async (req, res) => {
  const { preview, source } = aiExecuteRequestSchema.parse(req.body || {});
  const socketId = req.get('x-socket-id') || null;

  if (preview.intent === 'CREATE_TASKS') {
    const tasks = await taskService.createBulkTasksInWorkspace({
      workspaceId: req.workspaceId,
      actorId: req.user.id,
      tasksData: preview.tasks,
      source,
      socketId,
    });

    return res.status(201).json({
      intent: 'CREATE_TASKS',
      tasks,
      count: tasks.length,
    });
  }

  if (preview.intent === 'UPDATE_STATUS') {
    if (!preview.taskCode) {
      throw new AppError(
        400,
        'CLARIFICATION_REQUIRED',
        'Please select a specific task to update'
      );
    }

    const task = await taskService.updateTaskStatusByCode({
      workspaceId: req.workspaceId,
      taskCode: preview.taskCode,
      status: preview.status,
      actorId: req.user.id,
      source,
      socketId,
    });

    return res.status(200).json({
      intent: 'UPDATE_STATUS',
      task,
    });
  }

  if (preview.intent === 'FILTER_TASKS') {
    return res.status(200).json({
      intent: 'FILTER_TASKS',
      filters: preview.filters,
    });
  }

  throw new AppError(400, 'UNSUPPORTED_INTENT', 'Unsupported AI command intent');
});

/**
 * POST /api/workspaces/:wid/ai/transcribe
 * Accepts a `multipart/form-data` audio file (<= 4 MB) and transcribes it
 * via Groq Whisper (`whisper-large-v3`) at temperature 0.
 */
export const transcribeVoice = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError(400, 'AUDIO_REQUIRED', 'Audio file is required');
  }

  const { text, latencyMs } = await aiService.transcribeAudio({
    buffer: req.file.buffer,
    filename: req.file.originalname || 'voice.webm',
    mimeType: req.file.mimetype || 'audio/webm',
    workspaceId: req.workspaceId,
  });

  return res.status(200).json({ text, latencyMs });
});

/**
 * POST /api/workspaces/:wid/ai/standup
 * Synthesizes a structured daily standup report (`{ summary, done, inProgress, blockers, overdue }`)
 * from the workspace's last 24h activity log and current tasks.
 */
export const generateStandup = asyncHandler(async (req, res) => {
  const standup = await aiService.generateStandup({
    workspaceId: req.workspaceId,
  });

  return res.status(200).json({ standup });
});

export default {
  parseCommand,
  executeCommand,
  transcribeVoice,
  generateStandup,
};

import { z } from 'zod';

export const TASK_STATUS_VALUES = ['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
export const TASK_PRIORITY_VALUES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
export const AI_SOURCE_VALUES = ['AI_TEXT', 'AI_VOICE'];

export const aiParseRequestSchema = z.object({
  text: z
    .string({ error: 'Command text is required' })
    .trim()
    .min(1, 'Command text is required')
    .max(1500, 'Command text cannot exceed 1500 characters'),
  source: z.enum(AI_SOURCE_VALUES).optional().default('AI_TEXT'),
});

export const aiTaskDraftSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required').max(255),
  description: z.string().trim().max(2000).optional().nullable().default(null),
  priority: z.enum(TASK_PRIORITY_VALUES).default('MEDIUM'),
  status: z.enum(TASK_STATUS_VALUES).default('BACKLOG'),
  tags: z.array(z.string().trim().min(1).max(64)).max(10).default([]),
  dueDate: z
    .preprocess((val) => {
      if (val === '' || val === undefined || val === null) return null;
      return String(val).trim();
    }, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dueDate must be YYYY-MM-DD').nullable())
    .optional()
    .default(null),
  assigneeName: z.string().trim().optional().nullable().default(null),
  assigneeId: z.number().int().positive().optional().nullable().default(null),
  projectKey: z.string().trim().optional().nullable().default(null),
  projectId: z.number().int().positive().optional().nullable().default(null),
});

export const aiTaskOptionSchema = z.object({
  id: z.number(),
  code: z.string(),
  title: z.string(),
  status: z.string(),
  priority: z.string().optional(),
});

export const aiCreateTasksIntentSchema = z.object({
  intent: z.literal('CREATE_TASKS'),
  summary: z.string().optional(),
  tasks: z.array(aiTaskDraftSchema).min(1, 'At least one task is required').max(15),
});

export const aiUpdateStatusIntentSchema = z.object({
  intent: z.literal('UPDATE_STATUS'),
  summary: z.string().optional(),
  taskCode: z.string().trim().nullable().optional().default(null),
  taskTitle: z.string().optional().nullable().default(null),
  status: z.enum(TASK_STATUS_VALUES),
  searchQuery: z.string().optional().nullable().default(null),
  needsClarification: z.boolean().optional().default(false),
  options: z.array(aiTaskOptionSchema).optional().default([]),
});

export const aiFilterTasksIntentSchema = z.object({
  intent: z.literal('FILTER_TASKS'),
  summary: z.string().optional(),
  filters: z.object({
    status: z.enum(TASK_STATUS_VALUES).optional().nullable().default(null),
    priority: z.enum(TASK_PRIORITY_VALUES).optional().nullable().default(null),
    assigneeName: z.string().optional().nullable().default(null),
    assigneeId: z.number().int().positive().optional().nullable().default(null),
    tag: z.string().optional().nullable().default(null),
    tags: z.array(z.string().trim().min(1)).optional().nullable(),
    q: z.string().optional().nullable().default(null),
  }),
});

export const aiPreviewContractSchema = z.discriminatedUnion('intent', [
  aiCreateTasksIntentSchema,
  aiUpdateStatusIntentSchema,
  aiFilterTasksIntentSchema,
]);

export const aiExecuteRequestSchema = z.preprocess(
  (val) => {
    if (val && typeof val === 'object' && !val.preview && val.intent) {
      const { source, ...rest } = val;
      return {
        preview: rest,
        source: source || 'AI_TEXT',
      };
    }
    return val;
  },
  z.object({
    preview: aiPreviewContractSchema,
    source: z.enum(AI_SOURCE_VALUES).optional().default('AI_TEXT'),
  })
);

export const aiStandupOutputSchema = z.object({
  summary: z.string().trim().min(1),
  done: z.array(z.string()).default([]),
  inProgress: z.array(z.string()).default([]),
  blockers: z.array(z.string()).default([]),
  overdue: z.array(z.string()).default([]),
  generatedAt: z.string().optional(),
});

export default {
  aiParseRequestSchema,
  aiTaskDraftSchema,
  aiTaskOptionSchema,
  aiCreateTasksIntentSchema,
  aiUpdateStatusIntentSchema,
  aiFilterTasksIntentSchema,
  aiPreviewContractSchema,
  aiExecuteRequestSchema,
  aiStandupOutputSchema,
};

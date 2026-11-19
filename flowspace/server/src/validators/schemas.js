import { z } from 'zod';

export const TASK_STATUSES = ['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
export const WORKSPACE_ROLES = ['OWNER', 'MEMBER'];

const optionalPositiveInt = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : val),
  z.coerce.number().int().positive().optional()
);

const nullablePositiveInt = z.preprocess(
  (val) => {
    if (val === undefined) return undefined;
    if (val === '' || val === null) return null;
    return val;
  },
  z.coerce.number().int().positive().nullable().optional()
);

const nullableDueDate = z.preprocess(
  (val) => {
    if (val === undefined) return undefined;
    if (val === '' || val === null) return null;
    return val;
  },
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format')
    .nullable()
    .optional()
);

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().trim().email('Valid email is required').toLowerCase(),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(128),
  workspaceName: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z.string().trim().min(2).max(120).optional()
  ),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Valid email is required').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Workspace name must be at least 2 characters')
    .max(120),
});

export const addMemberSchema = z.object({
  email: z.string().trim().email('Valid email is required').toLowerCase(),
  role: z.enum(WORKSPACE_ROLES).optional().default('MEMBER'),
});

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Project name must be at least 2 characters')
    .max(120),
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z][A-Z0-9]{1,9}$/,
      'Project key must be 2-10 uppercase alphanumeric characters starting with a letter'
    ),
  description: z.string().trim().max(1000).optional().nullable(),
});

export const createTaskSchema = z.object({
  projectId: optionalPositiveInt,
  title: z.string().trim().min(1, 'Task title is required').max(255),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(TASK_STATUSES).optional().default('BACKLOG'),
  priority: z.enum(TASK_PRIORITIES).optional().default('MEDIUM'),
  tags: z
    .array(z.string().trim().min(1).max(64))
    .max(12)
    .optional()
    .default([]),
  dueDate: nullableDueDate,
  assigneeId: nullablePositiveInt,
  position: z.coerce.number().int().min(0).optional(),
});

export const updateTaskSchema = z.object({
  projectId: optionalPositiveInt,
  title: z.string().trim().min(1, 'Task title cannot be empty').max(255).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  tags: z.array(z.string().trim().min(1).max(64)).max(12).optional(),
  dueDate: nullableDueDate,
  assigneeId: nullablePositiveInt,
  position: z.coerce.number().int().min(0).optional(),
});

export default {
  TASK_STATUSES,
  TASK_PRIORITIES,
  WORKSPACE_ROLES,
  signupSchema,
  loginSchema,
  createWorkspaceSchema,
  addMemberSchema,
  createProjectSchema,
  createTaskSchema,
  updateTaskSchema,
};

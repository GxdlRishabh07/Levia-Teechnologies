import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import * as activityRepo from '../repositories/activityRepo.js';
import * as projectRepo from '../repositories/projectRepo.js';
import * as taskRepo from '../repositories/taskRepo.js';
import * as workspaceRepo from '../repositories/workspaceRepo.js';
import {
  TASK_PRIORITY_VALUES,
  TASK_STATUS_VALUES,
  aiPreviewContractSchema,
  aiStandupOutputSchema,
} from '../validators/aiSchemas.js';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_AUDIO_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

const PRIMARY_MODEL = 'llama-3.1-8b-instant';
const FALLBACK_MODEL = 'llama-3.3-70b-versatile';
const SAFETY_FALLBACK_MODEL = 'openai/gpt-oss-120b';
const WHISPER_MODEL = 'whisper-large-v3';

const CHAT_TIMEOUT_MS = 8000;
const AUDIO_TIMEOUT_MS = 12000;
const BACKOFF_DELAYS_MS = [400, 900];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Strips optional markdown code fences around JSON output.
 */
function extractJsonString(rawText) {
  const trimmed = String(rawText || '').trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    return fenced[1].trim();
  }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

/**
 * Resilient Groq Chat Completion caller:
 * - 8-second AbortController timeout per attempt
 * - Up to 2 retries with exponential backoff (400ms, 900ms) on HTTP 429, 5xx, or timeout
 * - Primary model `llama-3.3-70b-versatile`, switching to `llama-3.1-8b-instant` on final attempt
 * - Enforces JSON object mode and `temperature: 0` by default
 */
export async function callGroqChat({
  messages,
  temperature = 0,
  jsonMode = true,
}) {
  if (!env.hasGroq) {
    throw new AppError(
      503,
      'AI_KEY_MISSING',
      'GROQ_API_KEY is not configured.'
    );
  }

  const startedAt = Date.now();
  let lastError = null;
  const candidateModels = [PRIMARY_MODEL, FALLBACK_MODEL, SAFETY_FALLBACK_MODEL];

  for (let attempt = 0; attempt <= BACKOFF_DELAYS_MS.length; attempt += 1) {
    const isFinalAttempt = attempt === BACKOFF_DELAYS_MS.length;
    const model = candidateModels[attempt] || candidateModels[candidateModels.length - 1];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

    try {
      const response = await fetch(GROQ_CHAT_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        const isRetryable =
          response.status === 429 ||
          response.status >= 500 ||
          response.status === 404 ||
          (response.status === 400 && !isFinalAttempt);

        lastError = new AppError(
          response.status === 429 ? 429 : 502,
          'AI_UPSTREAM_ERROR',
          `Groq API responded with HTTP ${response.status}`,
          errBody ? errBody.slice(0, 300) : null
        );

        if (isRetryable && !isFinalAttempt) {
          if (response.status !== 404) {
            await sleep(BACKOFF_DELAYS_MS[attempt]);
          }
          continue;
        }
        throw lastError;
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content || '';
      const parsed = jsonMode ? JSON.parse(extractJsonString(content)) : null;

      return {
        data,
        content,
        parsed,
        model: data?.model || model,
        latencyMs: Date.now() - startedAt,
      };
    } catch (err) {
      clearTimeout(timer);
      const isAbort = err?.name === 'AbortError';
      lastError = isAbort
        ? new AppError(
            504,
            'AI_TIMEOUT',
            'AI request timed out after 8 seconds. Please try again.'
          )
        : err;

      if (!isFinalAttempt) {
        await sleep(BACKOFF_DELAYS_MS[attempt]);
        continue;
      }
    }
  }

  throw (
    lastError ||
    new AppError(502, 'AI_SERVICE_UNAVAILABLE', 'AI service is temporarily unavailable.')
  );
}

const KNOWN_TAGS = [
  'backend',
  'frontend',
  'api',
  'auth',
  'database',
  'sql',
  'payments',
  'stripe',
  'realtime',
  'pusher',
  'ai',
  'voice',
  'ui',
  'ux',
  'kanban',
  'bug',
  'security',
  'devops',
  'vercel',
  'testing',
  'performance',
  'docs',
];

const HINGLISH_REPLACEMENTS = [
  [/\bkal tak\b/gi, 'by tomorrow'],
  [/\baaj tak\b/gi, 'by today'],
  [/\bparso tak\b/gi, 'in 2 days'],
  [/\bke liye\b/gi, 'for'],
  [/\bko assign karo\b/gi, 'assign to'],
  [/\bassign karo\b/gi, 'assign'],
  [/\bbanao\b/gi, 'create'],
  [/\bbana do\b/gi, 'create'],
  [/\bbanana hai\b/gi, 'build'],
  [/\bkarna hai\b/gi, 'implement'],
  [/\bek kaam karna(?: ki)?\b/gi, ''],
  [/\bek kaam karo(?: ki)?\b/gi, ''],
  [/\bbaad mein\b/gi, ''],
  [/\bko bolna(?: ki)?\b/gi, ''],
  [/\bkar dena\b/gi, ''],
  [/\bkaro\b/gi, ''],
  [/\bkar do\b/gi, ''],
  [/\bkardo\b/gi, ''],
  [/\bkrdo\b/gi, ''],
  [/\bme daal do\b/gi, 'move to'],
  [/\bmein daal do\b/gi, 'move to'],
  [/\bdikhao\b/gi, 'show'],
  [/\bsirf\b/gi, 'only'],
  [/\bsabhi\b/gi, 'all'],
  [/\bsारे\b/gi, 'all'],
  [/\bjaldi\b/gi, 'urgent'],
  [/\bzaroori\b/gi, 'high priority'],
  [/\btheek\b/gi, 'fix'],
  [/\bfix karne ka\b/gi, 'fix'],
  [/\bintegrate karne ka\b/gi, 'integrate'],
  [/\bkaam\b/gi, 'task'],
];

/**
 * Computes an ISO `YYYY-MM-DD` date string relative to `baseDateStr`.
 */
function addDaysIso(baseDateStr, daysToAdd) {
  const d = new Date(`${baseDateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + daysToAdd);
  return d.toISOString().slice(0, 10);
}

/**
 * Extracts a relative or explicit due date (`YYYY-MM-DD`) from natural language text.
 */
function extractDueDateFromText(text, today) {
  const lower = String(text || '').toLowerCase();

  const isoMatch = lower.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  if (/\b(day after tomorrow|parso)\b/.test(lower)) {
    return addDaysIso(today, 2);
  }
  if (/\b(tomorrow|tmrw|kal)\b/.test(lower)) {
    return addDaysIso(today, 1);
  }
  if (/\b(today|tonight|eod|aaj)\b/.test(lower)) {
    return today;
  }
  if (/\bnext week\b/.test(lower)) {
    return addDaysIso(today, 7);
  }

  const inDaysMatch = lower.match(/\bin\s+(\d{1,2})\s+days?\b/);
  if (inDaysMatch) {
    return addDaysIso(today, Number(inDaysMatch[1]));
  }

  const weekdays = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  for (let i = 0; i < weekdays.length; i += 1) {
    const dayName = weekdays[i];
    if (new RegExp(`\\b(?:by|on|next|this)?\\s*${dayName}\\b`, 'i').test(lower)) {
      const currentDay = new Date(`${today}T00:00:00.000Z`).getUTCDay();
      let diff = (i - currentDay + 7) % 7;
      if (diff === 0) diff = 7;
      return addDaysIso(today, diff);
    }
  }

  return null;
}

/**
 * Extracts priority enum (`URGENT | HIGH | MEDIUM | LOW`) from text.
 */
function extractPriorityFromText(text, defaultPriority = 'MEDIUM') {
  const lower = String(text || '').toLowerCase();
  if (/\b(urgent|critical|blocker|asap|p0|jaldi)\b/.test(lower)) return 'URGENT';
  if (/\b(high|important|p1|zaroori)\b/.test(lower)) return 'HIGH';
  if (/\b(low|minor|trivial|p3)\b/.test(lower)) return 'LOW';
  if (/\b(medium|normal|p2)\b/.test(lower)) return 'MEDIUM';
  return defaultPriority;
}

/**
 * Extracts status enum (`BACKLOG | IN_PROGRESS | IN_REVIEW | DONE`) from text.
 */
function extractStatusFromText(text, defaultStatus = null) {
  const lower = String(text || '').toLowerCase();
  if (/\b(in[_\s-]?review|review|qa|pr open)\b/.test(lower)) return 'IN_REVIEW';
  if (/\b(in[_\s-]?progress|doing|active|working|started|wip)\b/.test(lower)) {
    return 'IN_PROGRESS';
  }
  if (/\b(done|complete|completed|shipped|finish|finished|closed|resolved)\b/.test(lower)) {
    return 'DONE';
  }
  if (/\b(backlog|todo|to-do|open|queued)\b/.test(lower)) return 'BACKLOG';
  return defaultStatus;
}

/**
 * Extracts relevant tags from `#hashtags` and known engineering domain terms.
 */
function extractTagsFromText(text) {
  const raw = String(text || '');
  const lower = raw.toLowerCase();
  const tagSet = new Set();

  const hashMatches = raw.match(/#([a-zA-Z0-9_-]{2,32})/g) || [];
  for (const h of hashMatches) {
    tagSet.add(h.slice(1).toLowerCase());
  }

  for (const tag of KNOWN_TAGS) {
    if (new RegExp(`\\b${tag}\\b`, 'i').test(lower)) {
      tagSet.add(tag);
    }
  }

  return [...tagSet].slice(0, 6);
}

/**
 * Matches a workspace member mentioned in text or by name string.
 */
function findMemberInText(text, members = []) {
  if (!text || !Array.isArray(members) || members.length === 0) return null;
  const lower = String(text).toLowerCase();

  for (const member of members) {
    const fullName = String(member.name || '').trim();
    if (!fullName) continue;
    const firstName = fullName.split(/\s+/)[0].toLowerCase();
    if (
      lower.includes(fullName.toLowerCase()) ||
      (firstName.length >= 2 && new RegExp(`\\b${firstName}\\b`, 'i').test(lower))
    ) {
      return member;
    }
  }
  return null;
}

/**
 * Cleans and translates a raw English/Hinglish task clause into a crisp engineering title.
 */
function cleanTaskTitle(rawClause, members = []) {
  let title = String(rawClause || '').trim();

  for (const [pattern, replacement] of HINGLISH_REPLACEMENTS) {
    title = title.replace(pattern, replacement);
  }

  // Strip hashtags, command prefixes, and trailing Hinglish/English task suffixes
  title = title
    .replace(/#[a-zA-Z0-9_-]+/g, '')
    .trim()
    .replace(
      /^(?:please\s+)?(?:create|add|make|build|schedule|new)\s+(?:a\s+|an\s+)?(?:(?:urgent|high|medium|low)\s+(?:priority\s+)?)?(?:[a-z0-9_-]+\s+)?tasks?\s*(?:to|for|about|on|:|-)?\s*/i,
      ''
    )
    .replace(
      /\b(?:ka|ki|ke)?\s*(?:(?:urgent|high|medium|low)\s+(?:priority\s+)?)?tasks?\s*(?:create|add|make|build)?\s*$/i,
      ''
    )
    .replace(/\b(?:create|add|make)\s+tasks?\s*$/i, '')
    .replace(/\b(?:with|in|at)\s+(?:urgent|high|medium|low)\s+priority\b/gi, '')
    .replace(/\b(?:urgent|high|medium|low)\s+priority\b/gi, '')
    .replace(/\b(?:due|by)\s+(?:today|tomorrow|kal|aaj|parso|next week|20\d{2}-\d{2}-\d{2})\b/gi, '')
    .replace(/\b(?:by|on|due)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, '');

  // Strip "assigned to <member>" or "for <member>"
  for (const m of members) {
    const firstName = String(m.name || '').split(/\s+/)[0];
    if (firstName) {
      title = title
        .replace(
          new RegExp(
            `\\b(?:assigned\\s+to|assign\\s+to|for)\\s+${firstName}(?:\\s+${m.name.split(/\s+/)[1] || ''})?\\b`,
            'gi'
          ),
          ''
        )
        .replace(new RegExp(`^${firstName}\\s+for\\s+`, 'i'), '');
    }
  }

  title = title
    .replace(/\s+/g, ' ')
    .replace(/^[,.:;\-\s]+|[,.:;\-\s]+$/g, '')
    .trim();

  // Convert Hinglish SOV order ("Login API fix") into English SVO ("Fix Login API")
  const trailingVerbMatch = title.match(
    /^(.+?)\s+(fix|integrate|build|implement|update|refactor|deploy|configure|optimize)$/i
  );
  if (trailingVerbMatch) {
    const verb = trailingVerbMatch[2];
    const obj = trailingVerbMatch[1].trim();
    title = `${verb.charAt(0).toUpperCase() + verb.slice(1).toLowerCase()} ${obj}`;
  }

  if (!title) {
    title = 'Implement engineering task';
  }

  return title.charAt(0).toUpperCase() + title.slice(1, 255);
}

/**
 * Deterministic rule-based compiler used when `env.hasGroq` is false
 * or if the upstream LLM is unreachable. Produces schema-valid intents for
 * `CREATE_TASKS`, `UPDATE_STATUS`, and `FILTER_TASKS`.
 */
export function compileFallbackIntent({
  text,
  projects = [],
  members = [],
  candidates = [],
  today,
}) {
  const raw = String(text || '').trim();
  const lower = raw.toLowerCase();

  // 1. Detect FILTER_TASKS intent
  const isFilterIntent =
    /^(?:show|filter|find|list|search|view|display|get|only)\b/i.test(raw) ||
    /\b(?:dikhao|filter karo|search karo)\b/i.test(lower) ||
    (/^(?:all|my|urgent|high|medium|low|overdue|backlog|in progress|in review|done)\b/i.test(
      raw
    ) &&
      /\btasks?\b/i.test(raw) &&
      !/\b(?:create|add|make|move|mark|set|update|banao)\b/i.test(raw));

  if (isFilterIntent) {
    const status = extractStatusFromText(raw, null);
    const priority = /\b(urgent|high|medium|low|critical|p0|p1|p2|p3)\b/i.test(raw)
      ? extractPriorityFromText(raw, null)
      : null;
    const matchedMember = findMemberInText(raw, members);
    const tags = extractTagsFromText(raw);

    let q = null;
    const quotedMatch = raw.match(/["']([^"']{2,80})["']/);
    if (quotedMatch) {
      q = quotedMatch[1].trim();
    }

    return {
      intent: 'FILTER_TASKS',
      summary: 'Filter workspace tasks',
      filters: {
        status,
        priority,
        assigneeName: matchedMember ? matchedMember.name : null,
        assigneeId: matchedMember ? matchedMember.id : null,
        tag: tags[0] || null,
        q,
      },
    };
  }

  // 2. Detect UPDATE_STATUS intent
  const targetStatus = extractStatusFromText(raw, null);
  const isUpdateIntent =
    Boolean(targetStatus) &&
    (/\b(?:move|mark|set|change|update|shift|transition|put)\b/i.test(raw) ||
      /\b(?:ko|me|mein)\s+(?:backlog|in[_\s-]?progress|in[_\s-]?review|review|done|complete)/i.test(
        lower
      ) ||
      /\b[A-Za-z]{2,10}-\d+\b/.test(raw));

  if (isUpdateIntent && !/^(?:create|add|make|new)\b/i.test(raw)) {
    const explicitCodeMatch = raw.match(/\b([A-Za-z]{2,10}-\d+)\b/);
    const taskCode = explicitCodeMatch ? explicitCodeMatch[1].toUpperCase() : null;

    // Extract search query by stripping command verbs and status names
    const searchQuery = raw
      .replace(
        /\b(?:please|move|mark|set|change|update|shift|put|the|task|tasks|status|to|as|into|in|backlog|in_progress|progress|in_review|review|done|complete|completed|karo|kar|do|kardo|ko|me|mein|daal)\b/gi,
        ' '
      )
      .replace(/\s+/g, ' ')
      .trim();

    return {
      intent: 'UPDATE_STATUS',
      summary: `Update task status to ${targetStatus}`,
      taskCode,
      status: targetStatus,
      searchQuery: searchQuery || null,
      needsClarification: !taskCode,
      options: [],
    };
  }

  // 3. Default to CREATE_TASKS intent
  const defaultProject = projects[0] || null;
  const globalDueDate = extractDueDateFromText(raw, today);
  const globalPriority = extractPriorityFromText(raw, 'MEDIUM');
  const globalMember = findMemberInText(raw, members);
  const globalTags = extractTagsFromText(raw);

  // Check if user requested "Create N [tag] tasks for <topic>"
  const countRequestMatch = raw.match(
    /(?:create|add|make|build|banao)\s+(\d)\s+([a-z0-9_-]+\s+)?tasks?\s*(?:for|to|on|about|around|ke liye|:|-)?\s*(.*)/i
  );

  // Split explicit multi-task clauses separated by ';', newlines, ' and also ', or numbered lists
  const explicitClauses = raw
    .split(/(?:;\s*|\n+|\s+and also\s+|\s+plus\s+|(?:\b\d+\.\s+))/i)
    .map((s) => s.trim())
    .filter(Boolean);

  let taskDrafts = [];

  if (
    countRequestMatch &&
    explicitClauses.length === 1 &&
    Number(countRequestMatch[1]) > 1
  ) {
    const count = Math.min(10, Math.max(2, Number(countRequestMatch[1])));
    const domainHint = (countRequestMatch[2] || '').trim();
    const rawTopic = cleanTaskTitle(
      countRequestMatch[3] || domainHint || 'Core feature',
      members
    );

    const templates = [
      `Design schema and architecture for ${rawTopic}`,
      `Implement core API and business logic for ${rawTopic}`,
      `Add validation, error handling, and integration tests for ${rawTopic}`,
      `Configure realtime events and monitoring for ${rawTopic}`,
      `Document endpoints and deployment checklist for ${rawTopic}`,
    ];

    for (let i = 0; i < count; i += 1) {
      const title =
        templates[i] || `Implement ${rawTopic} module (Part ${i + 1})`;
      taskDrafts.push({
        title: title.slice(0, 255),
        description: `Auto-generated task from command: "${raw}"`,
        priority: globalPriority,
        status: 'BACKLOG',
        tags: globalTags.length > 0 ? globalTags : domainHint ? [domainHint.toLowerCase()] : [],
        dueDate: globalDueDate,
        assigneeName: globalMember ? globalMember.name : null,
        assigneeId: globalMember ? globalMember.id : null,
        projectKey: defaultProject ? defaultProject.key : null,
        projectId: defaultProject ? defaultProject.id : null,
      });
    }
  } else {
    for (const clause of explicitClauses.slice(0, 15)) {
      const clauseMember = findMemberInText(clause, members) || globalMember;
      const clausePriority = extractPriorityFromText(clause, globalPriority);
      const clauseDueDate = extractDueDateFromText(clause, today) || globalDueDate;
      const clauseTags = extractTagsFromText(clause);
      const mergedTags =
        clauseTags.length > 0 ? clauseTags : globalTags;

      const extractedClauseStatus = extractStatusFromText(clause, 'BACKLOG') || 'BACKLOG';
      const createTaskStatus =
        extractedClauseStatus === 'DONE' &&
        !/\b(?:already done|completed|marked done|ho gaya|complete ho)\b/i.test(clause)
          ? 'BACKLOG'
          : extractedClauseStatus;

      taskDrafts.push({
        title: cleanTaskTitle(clause, members),
        description: null,
        priority: clausePriority,
        status: createTaskStatus,
        tags: mergedTags,
        dueDate: clauseDueDate,
        assigneeName: clauseMember ? clauseMember.name : null,
        assigneeId: clauseMember ? clauseMember.id : null,
        projectKey: defaultProject ? defaultProject.key : null,
        projectId: defaultProject ? defaultProject.id : null,
      });
    }
  }

  return {
    intent: 'CREATE_TASKS',
    summary: `Create ${taskDrafts.length} task${taskDrafts.length === 1 ? '' : 's'}`,
    tasks: taskDrafts,
  };
}

/**
 * Normalizes priority values returned by the LLM.
 */
function normalizePriority(val, fallback = 'MEDIUM') {
  if (!val) return fallback;
  const upper = String(val).trim().toUpperCase();
  if (TASK_PRIORITY_VALUES.includes(upper)) return upper;
  if (['CRITICAL', 'BLOCKER', 'P0', 'ASAP'].includes(upper)) return 'URGENT';
  if (['P1', 'IMPORTANT'].includes(upper)) return 'HIGH';
  if (['P2', 'NORMAL'].includes(upper)) return 'MEDIUM';
  if (['P3', 'MINOR', 'TRIVIAL'].includes(upper)) return 'LOW';
  return fallback;
}

/**
 * Normalizes status values returned by the LLM.
 */
function normalizeStatus(val, fallback = 'BACKLOG') {
  if (!val) return fallback;
  const upper = String(val)
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  if (TASK_STATUS_VALUES.includes(upper)) return upper;
  if (['TODO', 'TO_DO', 'OPEN', 'QUEUED'].includes(upper)) return 'BACKLOG';
  if (['DOING', 'ACTIVE', 'WIP', 'PROGRESS'].includes(upper)) return 'IN_PROGRESS';
  if (['REVIEW', 'QA', 'PR_REVIEW'].includes(upper)) return 'IN_REVIEW';
  if (['COMPLETED', 'COMPLETE', 'CLOSED', 'FINISHED', 'SHIPPED'].includes(upper)) {
    return 'DONE';
  }
  return fallback;
}

/**
 * Resolves a member name or ID against the workspace `members` array.
 */
function resolveWorkspaceMember(assigneeName, assigneeId, members = []) {
  if (assigneeId) {
    const byId = members.find((m) => Number(m.id) === Number(assigneeId));
    if (byId) return { id: byId.id, name: byId.name };
  }
  if (!assigneeName) return { id: null, name: null };

  const target = String(assigneeName).trim().toLowerCase();
  if (!target) return { id: null, name: null };

  const exact = members.find(
    (m) =>
      String(m.name || '').toLowerCase() === target ||
      String(m.email || '').toLowerCase() === target
  );
  if (exact) return { id: exact.id, name: exact.name };

  const byFirstOrPartial = members.find((m) => {
    const full = String(m.name || '').toLowerCase();
    const first = full.split(/\s+/)[0];
    return first === target || full.includes(target) || target.includes(first);
  });
  if (byFirstOrPartial) {
    return { id: byFirstOrPartial.id, name: byFirstOrPartial.name };
  }

  return { id: null, name: String(assigneeName).trim() };
}

/**
 * Resolves a project key or ID against the workspace `projects` array, defaulting to the first project.
 */
function resolveWorkspaceProject(projectKey, projectId, projects = []) {
  const defaultProject = projects[0] || null;
  if (projectId) {
    const byId = projects.find((p) => Number(p.id) === Number(projectId));
    if (byId) return { id: byId.id, key: byId.key };
  }
  if (projectKey) {
    const target = String(projectKey).trim().toUpperCase();
    const byKey = projects.find(
      (p) =>
        String(p.key || '').toUpperCase() === target ||
        String(p.name || '').toUpperCase() === target
    );
    if (byKey) return { id: byKey.id, key: byKey.key };
  }
  if (defaultProject) {
    return { id: defaultProject.id, key: defaultProject.key };
  }
  return { id: null, key: null };
}

const DISAMBIGUATION_STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'that',
  'this',
  'into',
  'move',
  'task',
  'tasks',
  'status',
  'mark',
  'set',
  'update',
  'change',
  'put',
  'shift',
  'backlog',
  'progress',
  'in_progress',
  'review',
  'in_review',
  'done',
  'complete',
  'completed',
  'karo',
  'kar',
  'do',
  'krdo',
  'kardo',
  'ko',
  'me',
  'mein',
  'daal',
  'please',
  'to',
  'as',
  'in',
]);

/**
 * Post-processes raw LLM or fallback JSON output:
 * - Resolves member names -> `assigneeId`
 * - Resolves project keys -> `projectId`
 * - Disambiguates `UPDATE_STATUS` candidates and populates `needsClarification` + `options`
 * - Strictly validates against `aiPreviewContractSchema`
 */
function normalizeAndValidatePreview(
  rawOutput,
  { text, projects = [], members = [], candidates = [] }
) {
  const rawIntent = String(rawOutput?.intent || 'CREATE_TASKS')
    .trim()
    .toUpperCase();

  if (rawIntent === 'UPDATE_STATUS') {
    const status = normalizeStatus(rawOutput.status, 'IN_PROGRESS');
    const explicitCodeMatch = String(text || '').match(/\b([A-Za-z]{2,10}-\d+)\b/);
    const explicitCodeInText = explicitCodeMatch
      ? explicitCodeMatch[1].toUpperCase()
      : null;

    // 1. If user typed an explicit task code like FLOW-12 in their prompt
    if (explicitCodeInText) {
      const matchedCandidate = candidates.find(
        (c) => String(c.code).toUpperCase() === explicitCodeInText
      );
      return aiPreviewContractSchema.parse({
        intent: 'UPDATE_STATUS',
        summary:
          rawOutput.summary ||
          `Move ${explicitCodeInText} to ${status.replace('_', ' ')}`,
        taskCode: explicitCodeInText,
        taskTitle: matchedCandidate?.title || rawOutput.taskTitle || null,
        status,
        searchQuery: rawOutput.searchQuery || explicitCodeInText,
        needsClarification: false,
        options: [],
      });
    }

    // 2. User referred to a task by keywords (e.g. "Move the Stripe task to In Review")
    const querySource = `${rawOutput.searchQuery || ''} ${text || ''}`;
    const keywords = [
      ...new Set(
        querySource
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length >= 3 && !DISAMBIGUATION_STOP_WORDS.has(w))
      ),
    ];

    const matchingCandidates =
      keywords.length > 0
        ? candidates.filter((c) => {
            const hay = `${c.title || ''} ${c.description || ''} ${(c.tags || []).join(' ')}`.toLowerCase();
            return keywords.some((kw) => hay.includes(kw));
          })
        : [];

    if (matchingCandidates.length === 1 && !rawOutput.needsClarification) {
      const single = matchingCandidates[0];
      return aiPreviewContractSchema.parse({
        intent: 'UPDATE_STATUS',
        summary:
          rawOutput.summary ||
          `Move ${single.code} (${single.title}) to ${status.replace('_', ' ')}`,
        taskCode: single.code,
        taskTitle: single.title,
        status,
        searchQuery: rawOutput.searchQuery || keywords.join(' ') || null,
        needsClarification: false,
        options: [],
      });
    }

    if (matchingCandidates.length > 1) {
      return aiPreviewContractSchema.parse({
        intent: 'UPDATE_STATUS',
        summary:
          rawOutput.summary ||
          `Multiple tasks match "${rawOutput.searchQuery || keywords.join(' ')}". Please select which task to move to ${status.replace('_', ' ')}:`,
        taskCode: null,
        taskTitle: null,
        status,
        searchQuery: rawOutput.searchQuery || keywords.join(' ') || null,
        needsClarification: true,
        options: matchingCandidates.slice(0, 8).map((c) => ({
          id: c.id,
          code: c.code,
          title: c.title,
          status: c.status,
          priority: c.priority,
        })),
      });
    }

    // Check if the LLM picked a valid single candidate code when no ambiguity exists
    if (rawOutput.taskCode && !rawOutput.needsClarification) {
      const codeUpper = String(rawOutput.taskCode).trim().toUpperCase();
      const matched = candidates.find(
        (c) => String(c.code).toUpperCase() === codeUpper
      );
      if (matched) {
        return aiPreviewContractSchema.parse({
          intent: 'UPDATE_STATUS',
          summary:
            rawOutput.summary ||
            `Move ${matched.code} (${matched.title}) to ${status.replace('_', ' ')}`,
          taskCode: matched.code,
          taskTitle: matched.title,
          status,
          searchQuery: rawOutput.searchQuery || null,
          needsClarification: false,
          options: [],
        });
      }
    }

    // Fallback: ambiguous or unknown task reference -> ask user to choose from candidate tasks
    const fallbackOptions = candidates.slice(0, 8).map((c) => ({
      id: c.id,
      code: c.code,
      title: c.title,
      status: c.status,
      priority: c.priority,
    }));

    return aiPreviewContractSchema.parse({
      intent: 'UPDATE_STATUS',
      summary:
        rawOutput.summary ||
        `Please select which task to move to ${status.replace('_', ' ')}:`,
      taskCode: null,
      taskTitle: null,
      status,
      searchQuery: rawOutput.searchQuery || keywords.join(' ') || null,
      needsClarification: true,
      options: fallbackOptions,
    });
  }

  if (rawIntent === 'FILTER_TASKS') {
    const rawFilters = rawOutput.filters || {};
    const status = rawFilters.status
      ? normalizeStatus(rawFilters.status, null)
      : null;
    const priority = rawFilters.priority
      ? normalizePriority(rawFilters.priority, null)
      : null;
    const resolvedMember = resolveWorkspaceMember(
      rawFilters.assigneeName,
      rawFilters.assigneeId,
      members
    );

    const rawTag =
      rawFilters.tag ||
      (Array.isArray(rawFilters.tags) && rawFilters.tags.length > 0
        ? rawFilters.tags[0]
        : null);
    const cleanTag = rawTag
      ? String(rawTag).trim().toLowerCase().replace(/^#/, '')
      : null;

    return aiPreviewContractSchema.parse({
      intent: 'FILTER_TASKS',
      summary: rawOutput.summary || 'Filter workspace tasks',
      filters: {
        status,
        priority,
        assigneeName: resolvedMember.name,
        assigneeId: resolvedMember.id,
        tag: cleanTag,
        q: rawFilters.q ? String(rawFilters.q).trim() : null,
      },
    });
  }

  // Default: CREATE_TASKS
  const rawTasks = Array.isArray(rawOutput?.tasks) ? rawOutput.tasks : [];
  const normalizedTasks = rawTasks.slice(0, 15).map((item) => {
    const resolvedMember = resolveWorkspaceMember(
      item.assigneeName,
      item.assigneeId,
      members
    );
    const resolvedProject = resolveWorkspaceProject(
      item.projectKey,
      item.projectId,
      projects
    );

    const rawTags = Array.isArray(item.tags) ? item.tags : [];
    const cleanTags = [
      ...new Set(
        rawTags
          .map((t) =>
            String(t || '')
              .trim()
              .toLowerCase()
              .replace(/^#/, '')
              .slice(0, 64)
          )
          .filter(Boolean)
      ),
    ].slice(0, 10);

    const dueDateStr =
      item.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(String(item.dueDate).trim())
        ? String(item.dueDate).trim()
        : null;

    return {
      title: String(item.title || 'Untitled Task')
        .trim()
        .slice(0, 255),
      description: item.description
        ? String(item.description).trim().slice(0, 2000)
        : null,
      priority: normalizePriority(item.priority, 'MEDIUM'),
      status: normalizeStatus(item.status, 'BACKLOG'),
      tags: cleanTags,
      dueDate: dueDateStr,
      assigneeName: resolvedMember.name,
      assigneeId: resolvedMember.id,
      projectKey: resolvedProject.key,
      projectId: resolvedProject.id,
    };
  });

  return aiPreviewContractSchema.parse({
    intent: 'CREATE_TASKS',
    summary:
      rawOutput?.summary ||
      `Create ${normalizedTasks.length} task${normalizedTasks.length === 1 ? '' : 's'}`,
    tasks: normalizedTasks,
  });
}

/**
 * Builds the Groq system prompt for compiling natural language (English / Hindi / Hinglish)
 * commands into a strict JSON preview object.
 */
function buildIntentSystemPrompt({ today, projects, members, candidates }) {
  const projectList = projects.map((p) => `${p.key} (${p.name})`).join(', ') || 'FLOW';
  const memberList =
    members.map((m) => `${m.name} (${m.email})`).join(', ') || 'Unassigned';
  const candidateList = candidates
    .slice(0, 15)
    .map((c) => `${c.code}: "${c.title}" [status=${c.status}, priority=${c.priority}]`)
    .join('\n');

  return `You are FlowSpace's AI Workflow Compiler for an engineering task management workspace.
Today's date (UTC): ${today}
Workspace Projects: ${projectList}
Workspace Members: ${memberList}
Existing Candidate Tasks:
${candidateList || '(no existing tasks)'}

Your job is to parse the user's command (which may be in English, Hindi, or Hinglish) into ONE strict JSON object matching one of these 3 intents:

1. CREATE_TASKS:
{
  "intent": "CREATE_TASKS",
  "summary": "Short human summary of tasks being created",
  "tasks": [
    {
      "title": "Clean, professional English engineering task title (translate any Hindi/Hinglish into crisp English)",
      "description": "Optional brief technical description or null",
      "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
      "status": "BACKLOG" | "IN_PROGRESS" | "IN_REVIEW" | "DONE",
      "tags": ["lowercase-tag"],
      "dueDate": "YYYY-MM-DD" or null,
      "assigneeName": "Exact member name from Workspace Members or null",
      "projectKey": "Project key from Workspace Projects (e.g. FLOW)"
    }
  ]
}

2. UPDATE_STATUS:
{
  "intent": "UPDATE_STATUS",
  "summary": "Short description of the status update",
  "taskCode": "Exact code like FLOW-12 if unambiguous, otherwise null",
  "status": "BACKLOG" | "IN_PROGRESS" | "IN_REVIEW" | "DONE",
  "searchQuery": "The key search phrase identifying the task (e.g. 'Stripe')",
  "needsClarification": true if multiple Existing Candidate Tasks match the phrase or if the task is ambiguous, false if an exact single task matches
}

3. FILTER_TASKS:
{
  "intent": "FILTER_TASKS",
  "summary": "Short description of the filter",
  "filters": {
    "status": "BACKLOG" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" or null,
    "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT" or null,
    "assigneeName": "Matched member name or null",
    "tag": "single lowercase tag or null",
    "q": "free-text search query or null"
  }
}

Rules:
- Output ONLY valid JSON. Never include markdown code fences or prose outside JSON.
- Always translate Hindi or Hinglish (e.g. "Rahul ke liye kal tak payment webhook fix karne ka urgent task banao") into clean, professional English task titles ("Fix payment webhook integration").
- Ignore conversational voice filler words (like "um", "uh", "matlab", "ek kaam karna ki", "baad mein ... ko bolna ki") and extract the actionable intent cleanly.
- For Hinglish delegation/reminders (e.g. "Baad mein Rishabh ko bolna ki task complete kar dena"), compile to CREATE_TASKS (status "BACKLOG") with a crisp English title (e.g. "Follow up with Rishabh on task completion") and assigneeName matched to the member — unless an explicit existing task (e.g. FLOW-5) is being marked done via UPDATE_STATUS.
- Resolve relative dates ("today", "tomorrow", "kal", "parso", "Friday", "next week") relative to ${today} into YYYY-MM-DD.
- If the user asks to create N tasks (e.g. "Create 3 backend tasks for payment integration"), generate N distinct, concrete engineering tasks in the "tasks" array.`;
}

/**
 * Parses a natural language command into a Zod-validated preview without writing to the database.
 *
 * @param {{ workspaceId: number, text: string, source?: 'AI_TEXT' | 'AI_VOICE' }} params
 */
export async function parseCommand({
  workspaceId,
  text,
  source = 'AI_TEXT',
}) {
  const startedAt = Date.now();
  const today = new Date().toISOString().slice(0, 10);

  // If input contains non-Latin script (Devanagari Hindi or Urdu/Arabic), normalize to Romanized Hinglish
  let inputText = String(text || '').trim();
  if (containsNonLatinScript(inputText)) {
    inputText = await transliterateToHinglish(inputText);
  }

  const [projects, members, candidates] = await Promise.all([
    projectRepo.listByWorkspace(workspaceId),
    workspaceRepo.listMembers(workspaceId),
    taskRepo.searchCandidates(workspaceId, inputText),
  ]);

  let rawOutput = null;
  let modelUsed = 'deterministic-fallback';

  if (env.hasGroq) {
    try {
      const systemPrompt = buildIntentSystemPrompt({
        today,
        projects,
        members,
        candidates,
      });

      const groqRes = await callGroqChat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: inputText },
        ],
        temperature: 0,
        jsonMode: true,
      });

      rawOutput = groqRes.parsed;
      modelUsed = groqRes.model;
    } catch (err) {
      if (!env.isTest) {
        console.warn(
          '[aiService.parseCommand] Groq call failed, using deterministic fallback compiler:',
          err?.message
        );
      }
      rawOutput = compileFallbackIntent({
        text: inputText,
        projects,
        members,
        candidates,
        today,
      });
    }
  } else {
    rawOutput = compileFallbackIntent({
      text: inputText,
      projects,
      members,
      candidates,
      today,
    });
  }

  let preview;
  try {
    preview = normalizeAndValidatePreview(rawOutput, {
      text: inputText,
      projects,
      members,
      candidates,
    });
  } catch (_validationErr) {
    const fallbackRaw = compileFallbackIntent({
      text: inputText,
      projects,
      members,
      candidates,
      today,
    });
    preview = normalizeAndValidatePreview(fallbackRaw, {
      text: inputText,
      projects,
      members,
      candidates,
    });
    modelUsed = 'deterministic-fallback';
  }

  return {
    preview,
    source,
    latencyMs: Date.now() - startedAt,
    model: modelUsed,
  };
}

/**
 * Detects if a string contains any non-Latin script characters (Devanagari Hindi, Arabic, or Urdu).
 * Unicode ranges:
 * - Devanagari: \u0900-\u097F
 * - Arabic / Urdu: \u0600-\u06FF, \u0750-\u077F, \u08A0-\u08FF, \uFB50-\uFDFF, \uFE70-\uFEFF
 */
export function containsNonLatinScript(text) {
  return /[\u0900-\u097F\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text || '');
}

export const containsDevanagari = containsNonLatinScript;

const DEVANAGARI_PHONETIC_MAP = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh',
  'ष': 'sh', 'स': 's', 'ह': 'h',
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
  'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
  'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
  'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
  'ं': 'n', 'ँ': 'n', 'ः': 'h', '्': '', '़': '',
};

const URDU_PHONETIC_MAP = {
  'ا': 'a', 'آ': 'aa', 'أ': 'a', 'إ': 'i', 'ب': 'b', 'پ': 'p', 'ت': 't', 'ٹ': 't',
  'ث': 's', 'ج': 'j', 'چ': 'ch', 'ح': 'h', 'خ': 'kh', 'د': 'd',
  'ڈ': 'd', 'ذ': 'z', 'ر': 'r', 'ڑ': 'r', 'ز': 'z', 'ژ': 'zh',
  'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'z', 'ط': 't', 'ظ': 'z',
  'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ک': 'k', 'ك': 'k', 'گ': 'g',
  'ل': 'l', 'م': 'm', 'ن': 'n', 'ں': 'n', 'و': 'o', 'ؤ': 'o', 'ہ': 'h', 'ة': 'h',
  'ھ': 'h', 'ء': '', 'ی': 'i', 'ي': 'i', 'ئ': 'i', 'ى': 'a', 'ے': 'e',
};

export function fallbackNonLatinToLatin(text) {
  let result = '';
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (DEVANAGARI_PHONETIC_MAP[ch] !== undefined) {
      result += DEVANAGARI_PHONETIC_MAP[ch];
    } else if (URDU_PHONETIC_MAP[ch] !== undefined) {
      result += URDU_PHONETIC_MAP[ch];
    } else {
      result += ch;
    }
  }
  return result.replace(/\s+/g, ' ').trim();
}

export const fallbackDevanagariToLatin = fallbackNonLatinToLatin;

const VOICE_FILLER_STOPWORDS = new Set([
  'task', 'tasks', 'complete', 'completed', 'karna', 'karo', 'kardo', 'dena', 'bolna',
  'baad', 'mein', 'liye', 'assign', 'board', 'move', 'show', 'only', 'high', 'urgent',
  'medium', 'low', 'that', 'this', 'with', 'from', 'have', 'your', 'time', 'some',
  'them', 'then', 'what', 'when', 'here', 'there', 'make', 'create', 'work', 'kaam',
  'bhai', 'yaar', 'parso', 'today', 'tomorrow', 'review', 'progress', 'backlog', 'done',
  'login', 'update', 'filter', 'check', 'status', 'priority', 'project', 'please',
]);

function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

/**
 * Corrects phonetically misheard workspace member names (e.g. "rishat" -> "Rishabh").
 */
export function fuzzyFixMemberNames(text, members = []) {
  const raw = String(text || '');
  if (!raw || !Array.isArray(members) || members.length === 0) return raw;

  const memberFirstNames = [];
  for (const m of members) {
    const first = String(m?.name || '').trim().split(/\s+/)[0];
    if (first && first.length >= 4) {
      memberFirstNames.push(first);
    }
  }
  if (memberFirstNames.length === 0) return raw;

  return raw.replace(/\b([A-Za-z]{4,})\b/g, (word) => {
    const lower = word.toLowerCase();
    if (VOICE_FILLER_STOPWORDS.has(lower)) return word;

    let bestMatch = null;
    let bestDist = Infinity;
    for (const target of memberFirstNames) {
      const targetLower = target.toLowerCase();
      if (lower === targetLower) return target;
      const dist = levenshteinDistance(lower, targetLower);
      const maxAllowed = Math.min(2, Math.floor(targetLower.length / 3) + 1);
      const sharesInitial = lower[0] === targetLower[0];
      if (dist <= maxAllowed && (sharesInitial || dist <= 1) && dist < bestDist) {
        bestDist = dist;
        bestMatch = target;
      }
    }
    return bestMatch || word;
  });
}

/**
 * Deterministic cleanup for spoken voice transcripts:
 * - Converts any non-Latin chars via phonetic fallback
 * - Strips hesitation fillers and common Hinglish conversational padding
 * - Fixes common phonetic speech-to-text typos and fuzzy-matches member names
 */
export function deterministicCleanVoiceText(text, members = []) {
  let cleaned = String(text || '').trim();
  if (!cleaned) return '';

  if (containsNonLatinScript(cleaned)) {
    cleaned = fallbackNonLatinToLatin(cleaned);
  }

  cleaned = cleaned
    .replace(/\b(?:um+|uh+|ah+|hmm+|err+)\b,?\s*/gi, '')
    .replace(
      /\b(?:so\s+basically|you know|basically|actually|i mean|i am saying|matlab(?:\s+yeh\s+ki)?|arre(?:\s+yaar)?|sun(?:\s+na)?|ek\s+kaam\s+kar(?:na|o)(?:\s+ki)?)\b[,:\s]*/gi,
      ''
    )
    .replace(/\bbonna\b/gi, 'bolna')
    .replace(/\basaim\b/gi, 'assign')
    .replace(/\bnavikeshan\b/gi, 'navigation');

  cleaned = fuzzyFixMemberNames(cleaned, members)
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .replace(/^[,.\s]+/, '')
    .trim();

  if (!cleaned) return '';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Transliterates Hindi/Devanagari or Urdu/Arabic script text into natural Roman/Latin script Hinglish.
 * E.g., "رومن اور برائن کو یہ کام اسام کرو" -> "Roman aur Brian ko yeh kaam assign karo"
 * "बोर पे नाविकेशन कर सकते होगे" -> "board pe navigation kar sakte hoge"
 * "टास्क को ऐड करो" -> "task ko add karo"
 */
export async function transliterateToHinglish(text) {
  return refineVoiceTranscript({ text });
}

/**
 * Cleans and refines raw voice transcripts (English, Hinglish, Hindi, or Urdu/Arabic) into
 * crisp Romanized Hinglish by stripping speech fillers, fixing phonetic typos, and correcting
 * workspace member/project names.
 */
export async function refineVoiceTranscript({
  text,
  members = [],
  projects = [],
}) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return '';

  if (env.hasGroq) {
    const memberNames = members.map((m) => m.name).filter(Boolean).join(', ');
    const projectNames = projects.map((p) => `${p.key} (${p.name})`).filter(Boolean).join(', ');
    const contextBlock =
      (memberNames ? `Known Workspace Members: ${memberNames}\n` : '') +
      (projectNames ? `Known Projects: ${projectNames}\n` : '');

    const candidateModels = [PRIMARY_MODEL, FALLBACK_MODEL, SAFETY_FALLBACK_MODEL];
    for (const model of candidateModels) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(GROQ_CHAT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content:
                  'You are an expert Hinglish voice-transcript cleaner for a software workspace.\n' +
                  contextBlock +
                  '\nClean the raw speech-to-text output into crisp, accurate Romanized Hinglish or English (Latin alphabet A-Z only).\n' +
                  'CRITICAL RULES:\n' +
                  '1. REMOVE conversational filler words, stutters, hesitation noises, and meta-phrases (e.g. "um", "uh", "ah", "hmm", "you know", "basically", "actually", "matlab", "ek kaam karna ki", "ek kaam karo ki", "I am saying", "arre yaar", "sun na").\n' +
                  '2. CORRECT phonetic speech-to-text typos in Hinglish/English words (e.g. "bonna" -> "bolna", "asaim" -> "assign", "navikeshan" -> "navigation").\n' +
                  '3. CORRECT misheard member names to match Known Workspace Members (e.g. "rishat" or "rishab" -> "Rishabh", "bryan" -> "Brian").\n' +
                  '4. TRANSLITERATE any Arabic, Urdu, or Devanagari characters strictly into Roman/Latin script Hinglish (zero non-Latin characters).\n' +
                  '5. DO NOT translate the whole sentence into stiff formal English — keep the speaker\'s natural Hinglish phrasing (e.g. "Baad mein Rishabh ko bolna ki task complete kar dena", "Roman aur Brian ko yeh kaam assign karo").\n' +
                  '6. Output ONLY the cleaned transcript text. No quotes, no markdown fences, no explanations.',
              },
              {
                role: 'user',
                content: trimmed,
              },
            ],
            temperature: 0,
          }),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (response.ok) {
          const data = await response.json();
          const refined = data?.choices?.[0]?.message?.content?.trim();
          if (
            refined &&
            !containsNonLatinScript(refined) &&
            refined.length <= Math.max(trimmed.length * 2.5, 60)
          ) {
            return fuzzyFixMemberNames(refined, members);
          }
        }
      } catch {
        // Continue to fallback candidate model
      }
    }
  }

  return deterministicCleanVoiceText(trimmed, members);
}

/**
 * Transcribes an audio buffer via Groq's `whisper-large-v3` endpoint at `temperature: 0`.
 * Supports English, Hindi, and Hinglish voice commands with workspace-aware member biasing
 * and post-transcription cleanup for fillers and phonetic typos.
 *
 * @param {{ buffer: Buffer, filename?: string, mimeType?: string, workspaceId?: number | null }} params
 */
export async function transcribeAudio({
  buffer,
  filename = 'voice.webm',
  mimeType = 'audio/webm',
  workspaceId = null,
}) {
  if (!buffer || buffer.length === 0) {
    throw new AppError(400, 'EMPTY_AUDIO', 'Audio file is required and cannot be empty.');
  }

  if (!env.hasGroq) {
    throw new AppError(
      503,
      'AI_KEY_MISSING',
      'GROQ_API_KEY is required in .env for live Whisper voice transcription.'
    );
  }

  const startedAt = Date.now();
  let members = [];
  let projects = [];

  if (workspaceId) {
    try {
      [members, projects] = await Promise.all([
        workspaceRepo.listMembers(workspaceId),
        projectRepo.listByWorkspace(workspaceId),
      ]);
    } catch {
      // Non-fatal: continue transcription without workspace hints
    }
  }

  const memberHint = members.length
    ? ` Workspace team members: ${members.map((m) => m.name).filter(Boolean).join(', ')}.`
    : '';
  const projectHint = projects.length
    ? ` Projects: ${projects.map((p) => `${p.key} ${p.name}`).join(', ')}.`
    : '';
  const whisperPrompt =
    `Transcribe in clean Romanized Hinglish or English (Latin alphabet A-Z only).${memberHint}${projectHint} ` +
    'Examples: task ko add karo, baad mein Rishabh ko bolna ki task complete kar dena, Roman aur Brian ko yeh kaam assign karo, Rahul ke liye task banao, priority high rakho, bug fix karo. Never output Arabic, Urdu, or Devanagari script.';

  let lastError = null;

  for (let attempt = 0; attempt <= BACKOFF_DELAYS_MS.length; attempt += 1) {
    const isFinalAttempt = attempt === BACKOFF_DELAYS_MS.length;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AUDIO_TIMEOUT_MS);

    try {
      const formData = new FormData();
      const cleanMime = mimeType ? mimeType.split(';')[0].trim() : 'audio/webm';
      const blob = new Blob([buffer], { type: cleanMime });

      formData.append('file', blob, filename || 'voice.webm');
      formData.append('model', WHISPER_MODEL);
      formData.append('temperature', '0');
      formData.append('response_format', 'json');
      formData.append('prompt', whisperPrompt);

      const response = await fetch(GROQ_AUDIO_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        const isRetryable = response.status === 429 || response.status >= 500;

        lastError = new AppError(
          response.status === 429 ? 429 : 502,
          'TRANSCRIPTION_FAILED',
          `Voice transcription failed (HTTP ${response.status}).`,
          errText ? errText.slice(0, 300) : null
        );

        if (isRetryable && !isFinalAttempt) {
          if (response.status !== 404) {
            await sleep(BACKOFF_DELAYS_MS[attempt]);
          }
          continue;
        }
        throw lastError;
      }

      const data = await response.json();
      let transcribedText = String(data?.text || '').trim();

      // Refine transcript: strip spoken fillers, fix phonetic Hinglish/name typos, and enforce Latin script
      if (transcribedText) {
        transcribedText = await refineVoiceTranscript({
          text: transcribedText,
          members,
          projects,
        });
      }

      return {
        text: transcribedText,
        latencyMs: Date.now() - startedAt,
      };
    } catch (err) {
      clearTimeout(timer);
      const isAbort = err?.name === 'AbortError';
      lastError = isAbort
        ? new AppError(
            504,
            'TRANSCRIPTION_TIMEOUT',
            'Voice transcription timed out. Please try a shorter recording.'
          )
        : err;

      if (!isFinalAttempt && (isAbort || err?.statusCode === 429 || err?.statusCode >= 500)) {
        await sleep(BACKOFF_DELAYS_MS[attempt]);
        continue;
      }
      throw lastError;
    }
  }

  throw (
    lastError ||
    new AppError(502, 'TRANSCRIPTION_FAILED', 'Unable to transcribe audio at this time.')
  );
}

/**
 * Generates a structured Daily Standup report (`{ summary, done, inProgress, blockers, overdue, generatedAt }`)
 * grounded in the workspace's last 24h activity log and current task board state.
 *
 * @param {{ workspaceId: number }} params
 */
export async function generateStandup({ workspaceId }) {
  const today = new Date().toISOString().slice(0, 10);

  const [recentActivities, stats, taskListResult] = await Promise.all([
    activityRepo.listRecentActivities(workspaceId, 24),
    taskRepo.getWorkspaceStats(workspaceId),
    taskRepo.listTasks(workspaceId, { limit: 100 }),
  ]);

  const tasks = taskListResult?.tasks || [];

  const formatTaskLine = (t, extra = '') => {
    const owner = t.assigneeName ? ` (@${t.assigneeName})` : ' (Unassigned)';
    return `${t.code}: ${t.title}${extra}${owner}`;
  };

  const doneTasks = tasks.filter((t) => t.status === 'DONE');
  const inProgressTasks = tasks.filter(
    (t) => t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW'
  );
  const overdueTasks = tasks.filter(
    (t) => t.status !== 'DONE' && t.dueDate && t.dueDate < today
  );
  const blockerTasks = tasks.filter(
    (t) =>
      t.status !== 'DONE' &&
      (t.priority === 'URGENT' ||
        (t.priority === 'HIGH' && ((t.dueDate && t.dueDate < today) || !t.assigneeId)))
  );

  const deterministicStandup = {
    summary: `Workspace is at ${stats.completionPercentage}% completion (${stats.completed}/${stats.total} tasks done) with ${inProgressTasks.length} active in progress/review, ${ recentActivities.length } activity event(s) in the last 24h, and ${overdueTasks.length} overdue item(s).`,
    done: doneTasks.slice(0, 10).map((t) => formatTaskLine(t)),
    inProgress: inProgressTasks
      .slice(0, 10)
      .map((t) => formatTaskLine(t, ` [${t.status.replace('_', ' ')}]`)),
    blockers: blockerTasks
      .slice(0, 8)
      .map((t) =>
        formatTaskLine(
          t,
          ` [${t.priority}${t.dueDate && t.dueDate < today ? `, Due ${t.dueDate}` : ''}]`
        )
      ),
    overdue: overdueTasks
      .slice(0, 8)
      .map((t) => formatTaskLine(t, ` (Due ${t.dueDate})`)),
    generatedAt: new Date().toISOString(),
  };

  if (!env.hasGroq) {
    return aiStandupOutputSchema.parse(deterministicStandup);
  }

  try {
    const activityLines = recentActivities
      .slice(0, 30)
      .map(
        (a) =>
          `- [${a.type}] by ${a.actorName || 'Member'}${a.taskCode ? ` on ${a.taskCode} (${a.taskTitle || ''})` : ''}`
      )
      .join('\n');

    const promptContext = JSON.stringify(
      {
        today,
        stats,
        deterministicLists: {
          done: deterministicStandup.done,
          inProgress: deterministicStandup.inProgress,
          blockers: deterministicStandup.blockers,
          overdue: deterministicStandup.overdue,
        },
        recentActivities24h: activityLines || 'No new activity logged in the last 24h.',
      },
      null,
      2
    );

    const groqRes = await callGroqChat({
      messages: [
        {
          role: 'system',
          content: `You are FlowSpace's Engineering Standup Synthesizer.
Given the workspace's real tasks and last 24h activity log, produce a concise, factual JSON standup summary with this exact schema:
{
  "summary": "2-3 sentence executive summary of sprint momentum, key accomplishments in the last 24h, and critical risks/overdue items.",
  "done": ["FLOW-1: Task title (@Assignee)"],
  "inProgress": ["FLOW-2: Task title [IN PROGRESS] (@Assignee)"],
  "blockers": ["FLOW-3: Task title [URGENT] (@Assignee)"],
  "overdue": ["FLOW-4: Task title (Due YYYY-MM-DD) (@Assignee)"]
}
Strict rules:
- Use ONLY real task codes, titles, and assignees from the provided context. Never invent tasks.
- Output ONLY valid JSON.`,
        },
        {
          role: 'user',
          content: promptContext,
        },
      ],
      temperature: 0.1,
      jsonMode: true,
    });

    const parsed = groqRes.parsed || {};
    return aiStandupOutputSchema.parse({
      summary: parsed.summary || deterministicStandup.summary,
      done: Array.isArray(parsed.done) ? parsed.done : deterministicStandup.done,
      inProgress: Array.isArray(parsed.inProgress)
        ? parsed.inProgress
        : deterministicStandup.inProgress,
      blockers: Array.isArray(parsed.blockers)
        ? parsed.blockers
        : deterministicStandup.blockers,
      overdue: Array.isArray(parsed.overdue)
        ? parsed.overdue
        : deterministicStandup.overdue,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (!env.isTest) {
      console.warn(
        '[aiService.generateStandup] Groq synthesis failed, returning deterministic standup:',
        err?.message
      );
    }
    return aiStandupOutputSchema.parse(deterministicStandup);
  }
}

export default {
  callGroqChat,
  compileFallbackIntent,
  parseCommand,
  transcribeAudio,
  generateStandup,
  containsDevanagari,
  containsNonLatinScript,
  transliterateToHinglish,
  refineVoiceTranscript,
  deterministicCleanVoiceText,
  fuzzyFixMemberNames,
  fallbackNonLatinToLatin,
};

import React from 'react';
import {
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Mic,
  Calendar,
} from 'lucide-react';
import { formatShortDate, isTaskOverdue } from './TaskCard';
import {
  StatusIcon,
  PriorityIcon,
  STATUS_LABELS,
  PRIORITY_LABELS,
} from './LinearIcons';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'BACKLOG', label: STATUS_LABELS.BACKLOG },
  { value: 'IN_PROGRESS', label: STATUS_LABELS.IN_PROGRESS },
  { value: 'IN_REVIEW', label: STATUS_LABELS.IN_REVIEW },
  { value: 'DONE', label: STATUS_LABELS.DONE },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'URGENT', label: PRIORITY_LABELS.URGENT },
  { value: 'HIGH', label: PRIORITY_LABELS.HIGH },
  { value: 'MEDIUM', label: PRIORITY_LABELS.MEDIUM },
  { value: 'LOW', label: PRIORITY_LABELS.LOW },
];

export default function TaskList({
  tasks = [],
  total = 0,
  page = 1,
  totalPages = 1,
  filters,
  onUpdateFilter,
  onResetFilters,
  onPageChange,
  members = [],
  onTaskClick,
  onStatusChange,
  isLoading = false,
}) {
  const hasActiveFilters = Boolean(
    filters.status ||
      filters.priority ||
      filters.assignee ||
      filters.tag ||
      filters.q ||
      filters.projectId
  );

  return (
    <div className="space-y-4">
      {/* Frosted Glass Filter Bar */}
      <div className="linear-panel !rounded-[16px] p-3.5 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-center">
          {/* Search query */}
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#111216]/40 dark:text-[#F5F6FA]/40" />
            <input
              type="text"
              value={filters.q || ''}
              onChange={(e) => onUpdateFilter('q', e.target.value)}
              placeholder="Filter issues by title, code, or description..."
              className="linear-input !py-2 !pl-9 !text-[14px]"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filters.status || ''}
            onChange={(e) => onUpdateFilter('status', e.target.value)}
            aria-label="Filter by status"
            className="linear-input !py-2 !text-[13.5px] text-[#111216] dark:text-[#F5F6FA] cursor-pointer"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={filters.priority || ''}
            onChange={(e) => onUpdateFilter('priority', e.target.value)}
            aria-label="Filter by priority"
            className="linear-input !py-2 !text-[13.5px] text-[#111216] dark:text-[#F5F6FA] cursor-pointer"
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Assignee Filter */}
          <select
            value={filters.assignee || ''}
            onChange={(e) => onUpdateFilter('assignee', e.target.value)}
            aria-label="Filter by assignee"
            className="linear-input !py-2 !text-[13.5px] text-[#111216] dark:text-[#F5F6FA] cursor-pointer"
          >
            <option value="">All Assignees</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Tag Filter + Clear */}
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={filters.tag || ''}
              onChange={(e) => onUpdateFilter('tag', e.target.value)}
              placeholder="Tag (e.g. backend)"
              className="linear-input !py-2 !text-[13.5px]"
            />
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                title="Clear all filters"
                aria-label="Clear all filters"
                className="btn-secondary !px-3 !py-2 shrink-0"
              >
                <RotateCcw className="h-4 w-4 text-[#111216]/60 dark:text-[#F5F6FA]/65" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Frosted Glass Issue Table (Desktop/Tablet) + Mobile Card List */}
      <div className="linear-panel !rounded-[18px] sm:!rounded-[20px] overflow-hidden">
        {/* Mobile Card View (< md) — Zero Horizontal Scroll */}
        <div className="md:hidden divide-y divide-[#111216]/8 dark:divide-white/[0.08]">
          {isLoading ? (
            [1, 2, 3, 4].map((row) => (
              <div key={row} className="p-3.5 space-y-2.5">
                <div className="h-3.5 w-24 rounded-[6px] bg-white/75 dark:bg-white/10 animate-pulse" />
                <div className="h-4 w-full rounded-[6px] bg-white/75 dark:bg-white/10 animate-pulse" />
                <div className="h-3 w-1/2 rounded-[6px] bg-white/60 dark:bg-white/8 animate-pulse" />
              </div>
            ))
          ) : tasks.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <p className="text-[15px] font-semibold text-[#111216] dark:text-[#F5F6FA] m-0 mb-1">
                No matching issues
              </p>
              <p className="text-[13.5px] text-[#111216]/50 dark:text-[#F5F6FA]/50 m-0">
                Adjust your active filters or create an issue via the Command Bar.
              </p>
            </div>
          ) : (
            tasks.map((task) => {
              const overdue = isTaskOverdue(task);
              const priorityLabel = PRIORITY_LABELS[task.priority] || task.priority;
              return (
                <div
                  key={task.id}
                  onClick={() => onTaskClick?.(task)}
                  className="p-3.5 space-y-2.5 hover:bg-white/60 dark:hover:bg-white/[0.05] cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span title={`Priority: ${priorityLabel}`} className="inline-flex shrink-0">
                        <PriorityIcon priority={task.priority} size={15} />
                      </span>
                      <span className="type-mono text-[12px] font-medium text-[#111216]/55 dark:text-[#F5F6FA]/55">
                        {task.code}
                      </span>
                      {task.source === 'AI_TEXT' && (
                        <Sparkles className="h-3.5 w-3.5 text-[#6531F7] dark:text-[#A78BFA] shrink-0" />
                      )}
                      {task.source === 'AI_VOICE' && (
                        <Mic className="h-3.5 w-3.5 text-[#6531F7] dark:text-[#A78BFA] shrink-0" />
                      )}
                    </div>

                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 rounded-[8px] bg-white/75 dark:bg-white/[0.08] border border-white dark:border-white/12 px-2 py-1"
                    >
                      <StatusIcon status={task.status} size={13} className="shrink-0" />
                      <select
                        value={task.status}
                        onChange={(e) => onStatusChange?.(task, e.target.value)}
                        aria-label={`Change status for ${task.code}`}
                        className="bg-transparent text-[12px] font-medium text-[#111216]/85 dark:text-[#F5F6FA]/90 cursor-pointer focus:outline-none"
                      >
                        <option value="BACKLOG">{STATUS_LABELS.BACKLOG}</option>
                        <option value="IN_PROGRESS">{STATUS_LABELS.IN_PROGRESS}</option>
                        <option value="IN_REVIEW">{STATUS_LABELS.IN_REVIEW}</option>
                        <option value="DONE">{STATUS_LABELS.DONE}</option>
                      </select>
                    </div>
                  </div>

                  <div className="text-[14.5px] font-semibold text-[#111216] dark:text-[#F5F6FA] leading-[1.38] tracking-[-0.015em]">
                    {task.title}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      {(task.tags || []).slice(0, 2).map((tag) => (
                        <span key={tag} className="linear-tag !text-[11.5px]">
                          #{tag}
                        </span>
                      ))}
                      {task.assigneeName && (
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#111216]/70 dark:text-[#F5F6FA]/75 ml-0.5">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#262626] dark:bg-[#7242FF] text-[10px] font-semibold text-white">
                            {task.assigneeName.charAt(0).toUpperCase()}
                          </span>
                          <span className="truncate max-w-[100px]">{task.assigneeName}</span>
                        </span>
                      )}
                    </div>

                    {task.dueDate && (
                      <span
                        className={`type-mono text-[11.5px] inline-flex items-center gap-1 shrink-0 ${
                          overdue
                            ? 'text-[#E11D48] dark:text-[#FB7185] font-semibold'
                            : 'text-[#111216]/50 dark:text-[#F5F6FA]/50'
                        }`}
                      >
                        <Calendar className="h-3 w-3 shrink-0" />
                        <span>{formatShortDate(task.dueDate)}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop & Tablet Table View (md+) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#111216]/8 dark:border-white/10 bg-white/40 dark:bg-white/[0.04]">
                <th className="py-3 pl-4 pr-2 type-eyebrow w-9">Pri</th>
                <th className="py-3 px-2 type-eyebrow whitespace-nowrap">ID</th>
                <th className="py-3 px-2 type-eyebrow whitespace-nowrap">Status</th>
                <th className="py-3 px-2.5 type-eyebrow">Title</th>
                <th className="py-3 px-2.5 type-eyebrow whitespace-nowrap">Labels</th>
                <th className="py-3 px-2.5 type-eyebrow whitespace-nowrap">Assignee</th>
                <th className="py-3 pl-2.5 pr-4 type-eyebrow whitespace-nowrap text-right">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#111216]/6 dark:divide-white/[0.06]">
              {isLoading ? (
                [1, 2, 3, 4, 5].map((row) => (
                  <tr key={row} className="h-[48px]">
                    <td colSpan={7} className="px-5 py-2.5">
                      <div className="h-4 w-full rounded-[6px] bg-white/75 dark:bg-white/10 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 px-4 text-center">
                    <p className="text-[15px] font-semibold text-[#111216] dark:text-[#F5F6FA] m-0 mb-1">
                      No matching issues
                    </p>
                    <p className="text-[13.5px] text-[#111216]/50 dark:text-[#F5F6FA]/50 m-0">
                      Adjust your active filters or create an issue via the Command Bar.
                    </p>
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const overdue = isTaskOverdue(task);
                  const priorityLabel = PRIORITY_LABELS[task.priority] || task.priority;

                  return (
                    <tr
                      key={task.id}
                      onClick={() => onTaskClick?.(task)}
                      className="h-[50px] hover:bg-white/65 dark:hover:bg-white/[0.06] cursor-pointer transition-colors duration-100"
                    >
                      {/* Priority Icon */}
                      <td className="pl-4 pr-2 whitespace-nowrap">
                        <span
                          title={`Priority: ${priorityLabel}`}
                          className="inline-flex items-center justify-center"
                        >
                          <PriorityIcon priority={task.priority} size={15} />
                        </span>
                      </td>

                      {/* Monospace Task Code + AI/Voice micro-glyph */}
                      <td className="px-2 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="type-mono text-[12.5px] font-medium text-[#111216]/55 dark:text-[#F5F6FA]/55">
                            {task.code}
                          </span>
                          {task.source === 'AI_TEXT' && (
                            <span
                              title="Created via AI Command Bar"
                              className="inline-flex text-[#6531F7] dark:text-[#A78BFA]"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                            </span>
                          )}
                          {task.source === 'AI_VOICE' && (
                            <span
                              title="Created via AI Voice Command"
                              className="inline-flex text-[#6531F7] dark:text-[#A78BFA]"
                            >
                              <Mic className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Icon + Compact Status Selector */}
                      <td
                        className="px-2 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5 rounded-[8px] border border-transparent hover:border-white dark:hover:border-white/15 hover:bg-white/80 dark:hover:bg-white/10 px-2 py-1 transition-all">
                          <StatusIcon status={task.status} size={14} className="shrink-0" />
                          <select
                            value={task.status}
                            onChange={(e) => onStatusChange?.(task, e.target.value)}
                            aria-label={`Change status for ${task.code}`}
                            className="bg-transparent text-[13px] font-medium text-[#111216]/80 dark:text-[#F5F6FA]/85 cursor-pointer focus:outline-none pr-1"
                          >
                            <option value="BACKLOG">{STATUS_LABELS.BACKLOG}</option>
                            <option value="IN_PROGRESS">{STATUS_LABELS.IN_PROGRESS}</option>
                            <option value="IN_REVIEW">{STATUS_LABELS.IN_REVIEW}</option>
                            <option value="DONE">{STATUS_LABELS.DONE}</option>
                          </select>
                        </div>
                      </td>

                      {/* Crisp Issue Title */}
                      <td className="px-2.5 max-w-[300px] 2xl:max-w-[420px]">
                        <div className="flex items-baseline gap-2 min-w-0">
                          <span className="text-[14px] font-semibold text-[#111216] dark:text-[#F5F6FA] tracking-[-0.01em] truncate">
                            {task.title}
                          </span>
                          {task.description && (
                            <span className="hidden 2xl:inline text-[12.5px] text-[#111216]/45 dark:text-[#F5F6FA]/45 truncate">
                              {task.description}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Tags */}
                      <td className="px-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {(task.tags || []).slice(0, 2).map((tag) => (
                            <span key={tag} className="linear-tag">
                              #{tag}
                            </span>
                          ))}
                          {(task.tags || []).length > 2 && (
                            <span className="type-mono text-[11.5px] text-[#111216]/45 dark:text-[#F5F6FA]/45">
                              +{task.tags.length - 2}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Assignee */}
                      <td className="px-2.5 whitespace-nowrap">
                        {task.assigneeName ? (
                          <div className="inline-flex items-center gap-2">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#262626] dark:bg-[#7242FF] text-[11px] font-semibold text-white shrink-0">
                              {task.assigneeName.charAt(0).toUpperCase()}
                            </span>
                            <span className="text-[13px] font-medium text-[#111216]/75 dark:text-[#F5F6FA]/75 max-w-[110px] truncate">
                              {task.assigneeName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[13px] text-[#111216]/40 dark:text-[#F5F6FA]/40">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Due Date */}
                      <td className="pl-2.5 pr-4 whitespace-nowrap text-right">
                        {task.dueDate ? (
                          <span
                            className={`type-mono text-[12.5px] inline-flex items-center justify-end gap-1.5 ${
                              overdue
                                ? 'text-[#E11D48] dark:text-[#FB7185] font-semibold'
                                : 'text-[#111216]/50 dark:text-[#F5F6FA]/50'
                            }`}
                            title={overdue ? 'Overdue' : `Due ${formatShortDate(task.dueDate)}`}
                          >
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span>{formatShortDate(task.dueDate)}</span>
                          </span>
                        ) : (
                          <span className="type-mono text-[12.5px] text-[#111216]/35 dark:text-[#F5F6FA]/35">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Clean Glass Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 border-t border-[#111216]/8 dark:border-white/10 bg-white/35 dark:bg-white/[0.03] px-4 sm:px-5 py-3">
          <span className="type-mono text-[12px] sm:text-[12.5px] text-[#111216]/50 dark:text-[#F5F6FA]/50">
            Showing {tasks.length} of {total} issue{total === 1 ? '' : 's'} · Page {page} /{' '}
            {Math.max(1, totalPages)}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="btn-secondary !py-1.5 !px-3.5 !text-[13px]"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Prev</span>
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="btn-secondary !py-1.5 !px-3.5 !text-[13px]"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

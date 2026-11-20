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
      <div className="linear-panel !rounded-[16px] p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 items-center">
          {/* Search query */}
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#111216]/40" />
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
            className="linear-input !py-2 !text-[13.5px] text-[#111216] cursor-pointer"
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
            className="linear-input !py-2 !text-[13.5px] text-[#111216] cursor-pointer"
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
            className="linear-input !py-2 !text-[13.5px] text-[#111216] cursor-pointer"
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
                <RotateCcw className="h-4 w-4 text-[#111216]/60" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Frosted Glass Issue Table */}
      <div className="linear-panel !rounded-[20px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#111216]/8 bg-white/40">
                <th className="py-3 pl-4 pr-2 type-eyebrow w-9">Pri</th>
                <th className="py-3 px-2 type-eyebrow whitespace-nowrap">ID</th>
                <th className="py-3 px-2 type-eyebrow whitespace-nowrap">Status</th>
                <th className="py-3 px-2.5 type-eyebrow">Title</th>
                <th className="py-3 px-2.5 type-eyebrow whitespace-nowrap">Labels</th>
                <th className="py-3 px-2.5 type-eyebrow whitespace-nowrap">Assignee</th>
                <th className="py-3 pl-2.5 pr-4 type-eyebrow whitespace-nowrap text-right">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#111216]/6">
              {isLoading ? (
                [1, 2, 3, 4, 5].map((row) => (
                  <tr key={row} className="h-[48px]">
                    <td colSpan={7} className="px-5 py-2.5">
                      <div className="h-4 w-full rounded-[6px] bg-white/75 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 px-4 text-center">
                    <p className="text-[15px] font-semibold text-[#111216] m-0 mb-1">
                      No matching issues
                    </p>
                    <p className="text-[13.5px] text-[#111216]/50 m-0">
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
                      className="h-[50px] hover:bg-white/65 cursor-pointer transition-colors duration-100"
                    >
                      {/* Priority Icon */}
                      <td className="pl-5 pr-2 whitespace-nowrap">
                        <span
                          title={`Priority: ${priorityLabel}`}
                          className="inline-flex items-center justify-center"
                        >
                          <PriorityIcon priority={task.priority} size={15} />
                        </span>
                      </td>

                      {/* Monospace Task Code + AI/Voice micro-glyph */}
                      <td className="px-2.5 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="type-mono text-[12.5px] font-medium text-[#111216]/55">
                            {task.code}
                          </span>
                          {task.source === 'AI_TEXT' && (
                            <span title="Created via AI Command Bar" className="inline-flex text-[#6531F7]">
                              <Sparkles className="h-3.5 w-3.5" />
                            </span>
                          )}
                          {task.source === 'AI_VOICE' && (
                            <span title="Created via AI Voice Command" className="inline-flex text-[#6531F7]">
                              <Mic className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Icon + Compact Status Selector */}
                      <td
                        className="px-2.5 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5 rounded-[8px] border border-transparent hover:border-white hover:bg-white/80 px-2 py-1 transition-all">
                          <StatusIcon status={task.status} size={14} className="shrink-0" />
                          <select
                            value={task.status}
                            onChange={(e) => onStatusChange?.(task, e.target.value)}
                            aria-label={`Change status for ${task.code}`}
                            className="bg-transparent text-[13px] font-medium text-[#111216]/80 cursor-pointer focus:outline-none pr-1"
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
                          <span className="text-[14px] font-semibold text-[#111216] tracking-[-0.01em] truncate">
                            {task.title}
                          </span>
                          {task.description && (
                            <span className="hidden 2xl:inline text-[12.5px] text-[#111216]/45 truncate">
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
                            <span className="type-mono text-[11.5px] text-[#111216]/45">
                              +{task.tags.length - 2}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Assignee */}
                      <td className="px-2.5 whitespace-nowrap">
                        {task.assigneeName ? (
                          <div className="inline-flex items-center gap-2">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#262626] text-[11px] font-semibold text-white shrink-0">
                              {task.assigneeName.charAt(0).toUpperCase()}
                            </span>
                            <span className="text-[13px] font-medium text-[#111216]/75 max-w-[110px] truncate">
                              {task.assigneeName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[13px] text-[#111216]/40">Unassigned</span>
                        )}
                      </td>

                      {/* Due Date */}
                      <td className="pl-2.5 pr-4 whitespace-nowrap text-right">
                        {task.dueDate ? (
                          <span
                            className={`type-mono text-[12.5px] inline-flex items-center justify-end gap-1.5 ${
                              overdue ? 'text-[#E11D48] font-semibold' : 'text-[#111216]/50'
                            }`}
                            title={overdue ? 'Overdue' : `Due ${formatShortDate(task.dueDate)}`}
                          >
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span>{formatShortDate(task.dueDate)}</span>
                          </span>
                        ) : (
                          <span className="type-mono text-[12.5px] text-[#111216]/35">—</span>
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
        <div className="flex items-center justify-between border-t border-[#111216]/8 bg-white/35 px-5 py-3">
          <span className="type-mono text-[12.5px] text-[#111216]/50">
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

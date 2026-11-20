import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, Sparkles, Mic } from 'lucide-react';
import { PriorityIcon, PRIORITY_LABELS } from './LinearIcons';

export function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr).slice(0, 10);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function isTaskOverdue(task) {
  if (!task?.dueDate || task.status === 'DONE') return false;
  const due = new Date(task.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export default function TaskCard({ task, onClick, isOverlay = false }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(task.id),
    data: { task },
    disabled: isOverlay,
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  const overdue = isTaskOverdue(task);
  const hasTags = Array.isArray(task.tags) && task.tags.length > 0;
  const hasAiSource = task.source && task.source !== 'MANUAL';
  const showFooter = hasTags || Boolean(task.dueDate) || hasAiSource;
  const priorityLabel = PRIORITY_LABELS[task.priority] || task.priority;

  const surfaceClasses = isOverlay
    ? 'bg-white/95 dark:bg-[#1A1D2F]/95 border-[#6531F7] dark:border-[#855BFF] shadow-[0_18px_40px_rgba(101,49,247,0.18)] dark:shadow-[0_18px_42px_rgba(0,0,0,0.55)] backdrop-blur-xl'
    : isDragging
      ? 'bg-white/40 dark:bg-white/[0.04] opacity-40 border-dashed border-[#6531F7] dark:border-[#855BFF]'
      : 'bg-white/72 dark:bg-white/[0.06] hover:bg-white/95 dark:hover:bg-white/[0.11] border-white/90 dark:border-white/[0.11] hover:border-white dark:hover:border-white/20 shadow-[inset_1.5px_1.5px_2px_rgba(255,255,255,0.9),0_4px_14px_rgba(31,28,70,0.04)] dark:shadow-[inset_1px_1px_1.5px_rgba(255,255,255,0.12),0_6px_20px_rgba(0,0,0,0.28)] hover:shadow-[inset_1.5px_1.5px_2px_rgba(255,255,255,1),0_8px_22px_rgba(101,49,247,0.08)] dark:hover:shadow-[inset_1px_1px_2px_rgba(255,255,255,0.16),0_10px_26px_rgba(114,66,255,0.2)]';

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      {...(isOverlay ? {} : listeners)}
      {...(isOverlay ? {} : attributes)}
      onClick={() => onClick?.(task)}
      className={`rounded-[14px] border p-3.5 select-none cursor-grab active:cursor-grabbing transition-all duration-150 ${surfaceClasses}`}
    >
      {/* Top Row: Monospace Code left, Priority Icon + Assignee Avatar right */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="type-mono text-[12.5px] font-medium text-[#111216]/50 dark:text-[#F5F6FA]/50 leading-none">
          {task.code}
        </span>

        <div className="flex items-center gap-2">
          <span title={`Priority: ${priorityLabel}`} className="inline-flex items-center">
            <PriorityIcon priority={task.priority} size={15} />
          </span>

          {task.assigneeName && (
            <span
              title={`Assigned to ${task.assigneeName}`}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#262626] dark:bg-[#7242FF] text-[11px] font-semibold text-white shrink-0 shadow-2xs"
            >
              {task.assigneeName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Middle: Crisp Issue Title */}
      <h4 className="text-[14.5px] font-semibold text-[#111216] dark:text-[#F5F6FA] leading-[1.4] tracking-[-0.015em] m-0 line-clamp-2">
        {task.title}
      </h4>

      {/* Optional compact description preview */}
      {task.description && (
        <p className="text-[13px] text-[#111216]/55 dark:text-[#F5F6FA]/55 leading-[1.45] m-0 mt-1 line-clamp-1">
          {task.description}
        </p>
      )}

      {/* Bottom Row: Tags, AI/Voice micro-tag, Due Date */}
      {showFooter && (
        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-[#111216]/8 dark:border-white/10">
          <div className="flex items-center flex-wrap gap-1.5 min-w-0">
            {hasAiSource && (
              <span
                title={
                  task.source === 'AI_VOICE'
                    ? 'Created via AI Voice Command'
                    : 'Created via AI Command Bar'
                }
                className="inline-flex items-center gap-1 rounded-[6px] border border-[#6531F7]/20 dark:border-[#855BFF]/35 bg-[#6531F7]/8 dark:bg-[#7242FF]/20 px-2 py-0.5 text-[11.5px] font-semibold leading-[1.2] text-[#6531F7] dark:text-[#C4B5FD]"
              >
                {task.source === 'AI_VOICE' ? (
                  <>
                    <Mic className="h-3 w-3" />
                    <span>Voice</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" />
                    <span>AI</span>
                  </>
                )}
              </span>
            )}

            {hasTags &&
              task.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="linear-tag !bg-white/80 dark:!bg-white/[0.06] !border-[#111216]/8 dark:!border-white/10 !text-[#111216]/65 dark:!text-[#F5F6FA]/65"
                >
                  #{tag}
                </span>
              ))}

            {hasTags && task.tags.length > 3 && (
              <span className="type-mono text-[11.5px] text-[#111216]/45 dark:text-[#F5F6FA]/45 px-0.5">
                +{task.tags.length - 3}
              </span>
            )}
          </div>

          {task.dueDate && (
            <span
              className={`type-mono text-[12px] inline-flex items-center gap-1.5 shrink-0 ${
                overdue
                  ? 'text-[#E11D48] dark:text-[#FB7185] font-semibold'
                  : 'text-[#111216]/50 dark:text-[#F5F6FA]/50'
              }`}
              title={overdue ? 'Overdue' : `Due ${formatShortDate(task.dueDate)}`}
            >
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>{formatShortDate(task.dueDate)}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

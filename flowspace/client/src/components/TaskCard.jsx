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
    ? 'bg-[#18191a] border-[#5e6ad2] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
    : isDragging
      ? 'bg-[#0f1011] opacity-35 border-dashed border-[#5e6ad2]'
      : 'bg-[#0f1011] hover:bg-[#141516] border-[#23252a] hover:border-[#34343a] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]';

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      {...(isOverlay ? {} : listeners)}
      {...(isOverlay ? {} : attributes)}
      onClick={() => onClick?.(task)}
      className={`rounded-[10px] border p-3.5 select-none cursor-grab active:cursor-grabbing transition-colors duration-150 ${surfaceClasses}`}
    >
      {/* Top Row: Monospace Code left, Priority Icon + Assignee Avatar right */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="type-mono text-[13px] font-medium text-[#8a8f98] leading-none">
          {task.code}
        </span>

        <div className="flex items-center gap-2">
          <span title={`Priority: ${priorityLabel}`} className="inline-flex items-center">
            <PriorityIcon priority={task.priority} size={15} />
          </span>

          {task.assigneeName && (
            <span
              title={`Assigned to ${task.assigneeName}`}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#18191a] border border-[#34343a] text-[12px] font-semibold text-[#d0d6e0] shrink-0"
            >
              {task.assigneeName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Middle: Crisp Issue Title */}
      <h4 className="text-[15.5px] font-semibold text-[#f7f8f8] leading-[1.4] tracking-[-0.1px] m-0 line-clamp-2">
        {task.title}
      </h4>

      {/* Optional compact description preview */}
      {task.description && (
        <p className="text-[13.5px] text-[#62666d] leading-[1.45] m-0 mt-1 line-clamp-1">
          {task.description}
        </p>
      )}

      {/* Bottom Row: Tags, AI/Voice micro-tag, Due Date */}
      {showFooter && (
        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-[#23252a]/70">
          <div className="flex items-center flex-wrap gap-1.5 min-w-0">
            {hasAiSource && (
              <span
                title={
                  task.source === 'AI_VOICE'
                    ? 'Created via AI Voice Command'
                    : 'Created via AI Command Bar'
                }
                className="inline-flex items-center gap-1 rounded-[6px] border border-[#7a7fad]/25 bg-[#7a7fad]/10 px-2 py-0.5 text-[12px] font-medium leading-[1.2] text-[#7a7fad]"
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
                <span key={tag} className="linear-tag">
                  #{tag}
                </span>
              ))}

            {hasTags && task.tags.length > 3 && (
              <span className="type-mono text-[12px] text-[#62666d] px-0.5">
                +{task.tags.length - 3}
              </span>
            )}
          </div>

          {task.dueDate && (
            <span
              className={`type-mono text-[12.5px] inline-flex items-center gap-1.5 shrink-0 ${
                overdue ? 'text-[#e5484d]' : 'text-[#62666d]'
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

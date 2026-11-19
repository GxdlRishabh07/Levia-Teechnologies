import React, { useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragOverlay,
  closestCorners,
} from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import TaskCard from './TaskCard';
import { StatusIcon } from './LinearIcons';

export const KANBAN_COLUMNS = [
  { id: 'BACKLOG', title: 'Backlog' },
  { id: 'IN_PROGRESS', title: 'In Progress' },
  { id: 'IN_REVIEW', title: 'In Review' },
  { id: 'DONE', title: 'Done' },
];

function KanbanColumn({ column, tasks, onTaskClick, onQuickAdd }) {
  const { isOver, setNodeRef } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-[12px] border p-3 min-h-[540px] transition-colors duration-150 ${
        isOver
          ? 'bg-[#141516]/60 border-[#5e6ad2]'
          : 'bg-[#0a0b0c] border-[#23252a]'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-1 pb-3 mb-3 border-b border-[#23252a]/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <StatusIcon status={column.id} size={16} className="shrink-0" />
          <h3 className="text-[15px] font-semibold leading-[1.3] tracking-[-0.1px] text-[#f7f8f8] m-0 truncate">
            {column.title}
          </h3>
          <span className="type-mono text-[13px] text-[#62666d] pl-0.5">
            {tasks.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onQuickAdd(column.id)}
          title={`Add task to ${column.title}`}
          aria-label={`Add task to ${column.title}`}
          className="inline-flex h-6 w-6 items-center justify-center rounded-[6px] text-[#62666d] hover:text-[#f7f8f8] hover:bg-[#18191a] transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Column Cards Stack */}
      <div className="flex-1 space-y-2.5">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-36 rounded-[10px] border border-dashed border-[#23252a] bg-[#0f1011]/35 p-4 text-center">
            <p className="text-[13.5px] text-[#62666d] m-0">
              No issues in {column.title}
            </p>
            <button
              type="button"
              onClick={() => onQuickAdd(column.id)}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-[13px] font-medium text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#18191a] transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-[#5e6ad2]" />
              <span>Create issue</span>
            </button>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={onTaskClick} />
          ))
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({
  tasks = [],
  isLoading = false,
  onTaskClick,
  onStatusChange,
  onOpenNewTaskWithStatus,
}) {
  const [activeTask, setActiveTask] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  );

  const handleDragStart = (event) => {
    const draggedTask = event.active?.data?.current?.task;
    if (draggedTask) {
      setActiveTask(draggedTask);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || !active) return;

    const draggedTask = active.data?.current?.task;
    const targetStatus = String(over.id);

    if (
      draggedTask &&
      KANBAN_COLUMNS.some((col) => col.id === targetStatus) &&
      draggedTask.status !== targetStatus
    ) {
      onStatusChange?.(draggedTask, targetStatus);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {KANBAN_COLUMNS.map((col) => (
          <div
            key={col.id}
            className="rounded-[12px] border border-[#23252a] bg-[#0a0b0c] p-3 h-[540px] space-y-2.5"
          >
            <div className="flex items-center gap-2 pb-3 mb-2 border-b border-[#23252a]/80">
              <div className="h-3.5 w-3.5 rounded-full bg-[#18191a] animate-pulse" />
              <div className="h-3.5 w-24 rounded-[4px] bg-[#18191a] animate-pulse" />
            </div>
            <div className="h-24 rounded-[10px] bg-[#0f1011] border border-[#23252a] animate-pulse" />
            <div className="h-24 rounded-[10px] bg-[#0f1011] border border-[#23252a] animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {KANBAN_COLUMNS.map((column) => {
          const columnTasks = tasks.filter((t) => t.status === column.id);
          return (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={columnTasks}
              onTaskClick={onTaskClick}
              onQuickAdd={(status) => onOpenNewTaskWithStatus?.(status)}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

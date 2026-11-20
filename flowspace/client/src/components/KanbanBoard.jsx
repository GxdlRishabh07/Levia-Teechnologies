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
      className={`flex flex-col rounded-[20px] border p-3.5 min-h-[540px] transition-all duration-150 backdrop-blur-xl ${
        isOver
          ? 'bg-white/75 border-[#6531F7] shadow-[0_8px_28px_rgba(101,49,247,0.12)]'
          : 'linear-panel'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-1 pb-3 mb-3 border-b border-[#111216]/8">
        <div className="flex items-center gap-2.5 min-w-0">
          <StatusIcon status={column.id} size={16} className="shrink-0" />
          <h3 className="text-[14.5px] font-semibold leading-[1.3] tracking-[-0.015em] text-[#111216] m-0 truncate">
            {column.title}
          </h3>
          <span className="type-mono text-[12px] text-[#111216]/45 bg-white/75 border border-white rounded-full px-2 py-0.5">
            {tasks.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onQuickAdd(column.id)}
          title={`Add task to ${column.title}`}
          aria-label={`Add task to ${column.title}`}
          className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] text-[#111216]/45 hover:text-[#111216] hover:bg-white/80 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Column Cards Stack */}
      <div className="flex-1 space-y-2.5">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-36 rounded-[14px] border border-dashed border-[#111216]/12 bg-white/35 p-4 text-center">
            <p className="text-[13.5px] font-medium text-[#111216]/45 m-0">
              No issues in {column.title}
            </p>
            <button
              type="button"
              onClick={() => onQuickAdd(column.id)}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-[8px] bg-white/75 hover:bg-white border border-white px-3 py-1.5 text-[12.5px] font-semibold text-[#111216]/75 hover:text-[#111216] shadow-2xs transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-[#6531F7]" />
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {KANBAN_COLUMNS.map((col) => (
          <div
            key={col.id}
            className="linear-panel p-3.5 h-[540px] space-y-2.5"
          >
            <div className="flex items-center gap-2 pb-3 mb-2 border-b border-[#111216]/8">
              <div className="h-4 w-4 rounded-full bg-white/80 animate-pulse" />
              <div className="h-4 w-24 rounded-[6px] bg-white/80 animate-pulse" />
            </div>
            <div className="h-24 rounded-[14px] bg-white/65 border border-white/80 animate-pulse" />
            <div className="h-24 rounded-[14px] bg-white/65 border border-white/80 animate-pulse" />
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
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

import React, { useState, useEffect } from 'react';
import { X, Trash2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  StatusIcon,
  PriorityIcon,
  STATUS_LABELS,
  PRIORITY_LABELS,
} from './LinearIcons';

const STATUS_OPTIONS = ['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function TaskModal({
  isOpen,
  onClose,
  initialTask = null,
  defaultStatus = 'BACKLOG',
  projects = [],
  members = [],
  selectedProjectId,
  onSave,
  onDelete,
}) {
  const isEditing = Boolean(initialTask?.id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState('BACKLOG');
  const [priority, setPriority] = useState('MEDIUM');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (initialTask) {
      setTitle(initialTask.title || '');
      setDescription(initialTask.description || '');
      setProjectId(initialTask.projectId || projects[0]?.id || '');
      setStatus(initialTask.status || 'BACKLOG');
      setPriority(initialTask.priority || 'MEDIUM');
      setAssigneeId(initialTask.assigneeId ? String(initialTask.assigneeId) : '');
      setDueDate(initialTask.dueDate ? String(initialTask.dueDate).slice(0, 10) : '');
      setTagsInput(Array.isArray(initialTask.tags) ? initialTask.tags.join(', ') : '');
    } else {
      setTitle('');
      setDescription('');
      setProjectId(selectedProjectId || projects[0]?.id || '');
      setStatus(defaultStatus || 'BACKLOG');
      setPriority('MEDIUM');
      setAssigneeId('');
      setDueDate('');
      setTagsInput('');
    }
  }, [isOpen, initialTask, defaultStatus, projects, selectedProjectId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;

    const resolvedProjectId = Number(projectId || projects[0]?.id);
    if (!resolvedProjectId) {
      toast.error('Please create or select a project first');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    setSubmitting(true);
    try {
      await onSave({
        id: initialTask?.id,
        projectId: resolvedProjectId,
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        assigneeId: assigneeId ? Number(assigneeId) : null,
        dueDate: dueDate || null,
        tags,
      });
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialTask?.id || submitting) return;
    setSubmitting(true);
    try {
      await onDelete(initialTask.id);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to delete task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#11121c]/20 dark:bg-[#020308]/65 backdrop-blur-[8px] p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg max-h-[90dvh] flex flex-col linear-modal overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-[#111216]/8 dark:border-white/10 px-4 sm:px-5 py-3.5 sm:py-4 bg-white/55 dark:bg-white/[0.04]">
          <div className="flex items-center gap-2.5 min-w-0">
            <StatusIcon status={status} size={16} className="shrink-0" />
            {isEditing && initialTask?.code ? (
              <span className="type-mono !text-[12.5px] rounded-[6px] bg-white dark:bg-white/10 border border-[#111216]/10 dark:border-white/15 px-2 py-0.5 text-[#111216] dark:text-[#F5F6FA]">
                {initialTask.code}
              </span>
            ) : null}
            <h3 className="text-[16px] sm:text-[16.5px] font-semibold tracking-[-0.02em] text-[#111216] dark:text-[#F5F6FA] m-0 truncate">
              {isEditing ? 'Edit Issue' : 'New Issue'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close issue modal"
            className="btn-tertiary !p-1.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
          <div>
            <label className="text-[13.5px] font-semibold text-[#111216]/85 dark:text-[#F5F6FA]/85 block mb-1.5">
              Issue Title <span className="text-[#E11D48] dark:text-[#FB7185]">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Implement webhook signature verification"
              className="linear-input !bg-white/90 dark:!bg-[#0B0C14]/70"
              autoFocus
            />
          </div>

          <div>
            <label className="text-[13.5px] font-semibold text-[#111216]/85 dark:text-[#F5F6FA]/85 block mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add acceptance criteria, technical notes, or context..."
              className="linear-input !bg-white/90 dark:!bg-[#0B0C14]/70 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[13.5px] font-semibold text-[#111216]/85 dark:text-[#F5F6FA]/85 block mb-1.5">
                Project
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={isEditing}
                className="linear-input !bg-white/90 dark:!bg-[#0B0C14]/70 disabled:opacity-55"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.key})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[13.5px] font-semibold text-[#111216]/85 dark:text-[#F5F6FA]/85 flex items-center gap-1.5 mb-1.5">
                <StatusIcon status={status} size={15} />
                <span>Status</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="linear-input !bg-white/90 dark:!bg-[#0B0C14]/70"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s] || s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[13.5px] font-semibold text-[#111216]/85 dark:text-[#F5F6FA]/85 flex items-center gap-1.5 mb-1.5">
                <PriorityIcon priority={priority} size={15} />
                <span>Priority</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="linear-input !bg-white/90 dark:!bg-[#0B0C14]/70"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p] || p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[13.5px] font-semibold text-[#111216]/85 dark:text-[#F5F6FA]/85 block mb-1.5">
                Assignee
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="linear-input !bg-white/90 dark:!bg-[#0B0C14]/70"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[13.5px] font-semibold text-[#111216]/85 dark:text-[#F5F6FA]/85 block mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="linear-input !bg-white/90 dark:!bg-[#0B0C14]/70"
              />
            </div>

            <div>
              <label className="text-[13.5px] font-semibold text-[#111216]/85 dark:text-[#F5F6FA]/85 block mb-1.5">
                Tags
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="backend, security, api"
                className="linear-input !bg-white/90 dark:!bg-[#0B0C14]/70"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-[#111216]/8 dark:border-white/10">
            {isEditing ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13.5px] font-medium text-[#E11D48] dark:text-[#FB7185] hover:bg-[#E11D48]/10 rounded-[8px] transition-colors cursor-pointer disabled:opacity-45"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !title.trim()}
                className="btn-primary"
              >
                <Check className="h-4 w-4" />
                <span>
                  {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Issue'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

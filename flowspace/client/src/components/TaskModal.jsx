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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-[4px] p-4">
      <div className="w-full max-w-lg linear-modal overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#23252a] px-5 py-3.5 bg-[#0f1011]">
          <div className="flex items-center gap-2.5 min-w-0">
            <StatusIcon status={status} size={16} className="shrink-0" />
            {isEditing && initialTask?.code ? (
              <span className="type-mono !text-[13px] rounded-[6px] bg-[#141516] border border-[#23252a] px-2 py-0.5 text-[#d0d6e0]">
                {initialTask.code}
              </span>
            ) : null}
            <h3 className="text-[17px] font-semibold tracking-[-0.2px] text-[#f7f8f8] m-0 truncate">
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-[14px] font-semibold text-[#d0d6e0] block mb-1.5">
              Issue Title <span className="text-[#62666d]">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Implement webhook signature verification"
              className="linear-input"
              autoFocus
            />
          </div>

          <div>
            <label className="text-[14px] font-semibold text-[#d0d6e0] block mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add acceptance criteria, technical notes, or context..."
              className="linear-input resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[14px] font-semibold text-[#d0d6e0] block mb-1.5">
                Project
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={isEditing}
                className="linear-input disabled:opacity-55"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.key})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[14px] font-semibold text-[#d0d6e0] flex items-center gap-1.5 mb-1.5">
                <StatusIcon status={status} size={15} />
                <span>Status</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="linear-input"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s] || s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[14px] font-semibold text-[#d0d6e0] flex items-center gap-1.5 mb-1.5">
                <PriorityIcon priority={priority} size={15} />
                <span>Priority</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="linear-input"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p] || p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[14px] font-semibold text-[#d0d6e0] block mb-1.5">
                Assignee
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="linear-input"
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
              <label className="text-[14px] font-semibold text-[#d0d6e0] block mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="linear-input"
              />
            </div>

            <div>
              <label className="text-[14px] font-semibold text-[#d0d6e0] block mb-1.5">
                Tags
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="backend, security, api"
                className="linear-input"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-[#23252a]">
            {isEditing ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-medium text-[#e5484d] hover:bg-[#e5484d]/10 rounded-[8px] transition-colors cursor-pointer disabled:opacity-45"
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

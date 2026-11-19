import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Check,
  X,
  AlertCircle,
  ArrowRight,
  Filter,
  ListPlus,
  RefreshCw,
  Tag,
  Mic,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import {
  StatusIcon,
  PriorityIcon,
  STATUS_LABELS,
  PRIORITY_LABELS,
} from './LinearIcons';

const STATUS_OPTIONS = ['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function AIPreview({
  workspaceId,
  previewData,
  members = [],
  projects = [],
  onClose,
  onExecuted,
  onApplyFilters,
}) {
  const [draftPreview, setDraftPreview] = useState(null);
  const [selectedOptionCode, setSelectedOptionCode] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    if (previewData?.preview) {
      setDraftPreview(JSON.parse(JSON.stringify(previewData.preview)));
      if (
        previewData.preview.intent === 'UPDATE_STATUS' &&
        Array.isArray(previewData.preview.options) &&
        previewData.preview.options.length > 0
      ) {
        setSelectedOptionCode(
          previewData.preview.taskCode || previewData.preview.options[0].code
        );
      } else {
        setSelectedOptionCode(previewData.preview.taskCode || '');
      }
    }
  }, [previewData]);

  if (!previewData || !draftPreview) return null;

  const { source, latencyMs, model, rawText } = previewData;

  const handleTaskFieldChange = (index, field, value) => {
    setDraftPreview((prev) => {
      const nextTasks = [...(prev.tasks || [])];
      nextTasks[index] = {
        ...nextTasks[index],
        [field]: value,
      };
      return {
        ...prev,
        tasks: nextTasks,
      };
    });
  };

  const handleRemoveDraftTask = (index) => {
    setDraftPreview((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index),
    }));
  };

  const handleConfirm = async () => {
    if (isExecuting) return;

    // If FILTER_TASKS, apply directly to workspace state AND log execution
    if (draftPreview.intent === 'FILTER_TASKS') {
      onApplyFilters?.(draftPreview.filters || {});
      toast.success('AI filters applied to workspace');
      onClose();
      return;
    }

    const payloadPreview = { ...draftPreview };
    if (payloadPreview.intent === 'UPDATE_STATUS') {
      const resolvedCode = selectedOptionCode || payloadPreview.taskCode;
      if (!resolvedCode) {
        toast.error('Please select which task to update');
        return;
      }
      payloadPreview.taskCode = resolvedCode;
      payloadPreview.needsClarification = false;
    }

    if (
      payloadPreview.intent === 'CREATE_TASKS' &&
      (!payloadPreview.tasks || payloadPreview.tasks.length === 0)
    ) {
      toast.error('No tasks to create');
      return;
    }

    setIsExecuting(true);
    try {
      const res = await api.post(`/workspaces/${workspaceId}/ai/execute`, {
        preview: payloadPreview,
        source: source || 'AI_TEXT',
      });

      if (payloadPreview.intent === 'CREATE_TASKS') {
        const count = res?.tasks?.length || payloadPreview.tasks.length;
        toast.success(`Created ${count} task${count === 1 ? '' : 's'} via AI`);
      } else if (payloadPreview.intent === 'UPDATE_STATUS') {
        toast.success(
          `Updated ${payloadPreview.taskCode} to ${STATUS_LABELS[payloadPreview.status] || payloadPreview.status}`
        );
      }

      onExecuted?.(res);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to execute AI action');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-[4px] p-4">
      <div className="w-full max-w-2xl linear-modal overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#23252a] bg-[#0f1011] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {source === 'AI_VOICE' ? (
              <Mic className="h-4 w-4 text-[#5e6ad2] shrink-0" />
            ) : (
              <Sparkles className="h-4 w-4 text-[#5e6ad2] shrink-0" />
            )}
            <h3 className="text-[17px] font-semibold tracking-[-0.2px] text-[#f7f8f8] m-0 truncate">
              AI Execution Plan
            </h3>
            <span className="linear-badge shrink-0">{draftPreview.intent}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {latencyMs ? (
              <span className="type-mono !text-[13px] text-[#62666d]">
                {model || 'Llama 3.3'} · {latencyMs}ms
              </span>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close AI preview"
              className="btn-tertiary !p-1.5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[74vh] overflow-y-auto space-y-4">
          {/* Original Natural Language Input */}
          <div className="rounded-[12px] bg-[#141516] border border-[#23252a] p-3.5">
            <div className="type-eyebrow mb-1">
              {source === 'AI_VOICE' ? 'Voice Transcript' : 'Command Input'}
            </div>
            <div className="text-[15px] text-[#f7f8f8] leading-relaxed">
              &ldquo;{rawText}&rdquo;
            </div>
            {draftPreview.summary && (
              <div className="text-[13.5px] text-[#8a8f98] mt-1.5">
                {draftPreview.summary}
              </div>
            )}
          </div>

          {/* INTENT 1: CREATE_TASKS */}
          {draftPreview.intent === 'CREATE_TASKS' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[14.5px] font-semibold text-[#f7f8f8] flex items-center gap-2">
                  <ListPlus className="h-4 w-4 text-[#8a8f98]" />
                  <span>
                    Issues to Create{' '}
                    <span className="type-mono text-[#62666d]">
                      ({draftPreview.tasks?.length || 0})
                    </span>
                  </span>
                </span>
                <span className="text-[13px] text-[#62666d]">
                  Edit any field before executing
                </span>
              </div>

              {(draftPreview.tasks || []).map((task, idx) => (
                <div
                  key={idx}
                  className="rounded-[12px] bg-[#141516] border border-[#23252a] p-4 space-y-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StatusIcon status={task.status || 'BACKLOG'} size={15} />
                      <PriorityIcon priority={task.priority || 'MEDIUM'} size={14} />
                    </div>
                    <input
                      type="text"
                      value={task.title || ''}
                      onChange={(e) => handleTaskFieldChange(idx, 'title', e.target.value)}
                      className="linear-input !bg-[#0f1011] !py-2 !text-[15px] !font-medium"
                      placeholder="Issue title"
                    />
                    {draftPreview.tasks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDraftTask(idx)}
                        className="btn-tertiary !p-1.5 shrink-0"
                        title="Remove task"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="type-eyebrow !text-[12px] block mb-1">
                        Priority
                      </label>
                      <select
                        value={task.priority || 'MEDIUM'}
                        onChange={(e) => handleTaskFieldChange(idx, 'priority', e.target.value)}
                        className="linear-input !bg-[#0f1011] !py-2 !px-2.5 !text-[13.5px]"
                      >
                        {PRIORITY_OPTIONS.map((p) => (
                          <option key={p} value={p}>
                            {PRIORITY_LABELS[p] || p}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="type-eyebrow !text-[12px] block mb-1">
                        Status
                      </label>
                      <select
                        value={task.status || 'BACKLOG'}
                        onChange={(e) => handleTaskFieldChange(idx, 'status', e.target.value)}
                        className="linear-input !bg-[#0f1011] !py-2 !px-2.5 !text-[13.5px]"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s] || s.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="type-eyebrow !text-[12px] block mb-1">
                        Assignee
                      </label>
                      <select
                        value={task.assigneeId || ''}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          const matched = members.find((m) => Number(m.id) === val);
                          handleTaskFieldChange(idx, 'assigneeId', val);
                          handleTaskFieldChange(idx, 'assigneeName', matched?.name || null);
                        }}
                        className="linear-input !bg-[#0f1011] !py-2 !px-2.5 !text-[13.5px]"
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
                      <label className="type-eyebrow !text-[12px] block mb-1">
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={task.dueDate ? task.dueDate.slice(0, 10) : ''}
                        onChange={(e) =>
                          handleTaskFieldChange(idx, 'dueDate', e.target.value || null)
                        }
                        className="linear-input !bg-[#0f1011] !py-2 !px-2.5 !text-[13.5px]"
                      />
                    </div>
                  </div>

                  {/* Tags & Project */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[#23252a]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Tag className="h-4 w-4 text-[#62666d]" />
                      {(task.tags || []).length > 0 ? (
                        (task.tags || []).map((tag, tIdx) => (
                          <span key={tIdx} className="linear-tag !bg-[#0f1011]">
                            #{tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-[13px] text-[#62666d]">No tags</span>
                      )}
                    </div>

                    {projects.length > 0 && (
                      <select
                        value={task.projectId || projects[0]?.id || ''}
                        onChange={(e) =>
                          handleTaskFieldChange(idx, 'projectId', Number(e.target.value))
                        }
                        className="linear-input !w-auto !bg-[#0f1011] !py-1.5 !px-3 !text-[13px]"
                      >
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.key} · {p.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* INTENT 2: UPDATE_STATUS */}
          {draftPreview.intent === 'UPDATE_STATUS' && (
            <div className="rounded-[12px] bg-[#141516] border border-[#23252a] p-4 space-y-3.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[14.5px] font-semibold text-[#f7f8f8] flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-[#8a8f98]" />
                  <span>Target Status Transition</span>
                </span>
                <div className="flex items-center gap-2">
                  <StatusIcon status={draftPreview.status || 'IN_PROGRESS'} size={15} />
                  <select
                    value={draftPreview.status || 'IN_PROGRESS'}
                    onChange={(e) =>
                      setDraftPreview((prev) => ({ ...prev, status: e.target.value }))
                    }
                    className="linear-input !w-auto !bg-[#0f1011] !py-1.5 !px-3 !text-[13.5px] !font-medium"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s] || s.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {draftPreview.needsClarification ||
              (draftPreview.options && draftPreview.options.length > 1) ? (
                <div className="space-y-2.5 pt-3 border-t border-[#23252a]">
                  <div className="flex items-center gap-2 text-[13.5px] font-medium text-[#d0d6e0]">
                    <AlertCircle className="h-4 w-4 text-[#5e6ad2] shrink-0" />
                    <span>Multiple matching issues found — select the target to update:</span>
                  </div>

                  <div className="space-y-2">
                    {draftPreview.options.map((opt) => {
                      const isPicked = selectedOptionCode === opt.code;
                      return (
                        <button
                          key={opt.code}
                          type="button"
                          onClick={() => setSelectedOptionCode(opt.code)}
                          className={`w-full flex items-center justify-between gap-3 rounded-[10px] px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                            isPicked
                              ? 'border border-[#5e6ad2] bg-[#18191a]'
                              : 'border border-[#23252a] bg-[#141516] hover:border-[#34343a] hover:bg-[#18191a]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <StatusIcon status={opt.status} size={15} className="shrink-0" />
                            <span className="type-mono !text-[13px] text-[#8a8f98] shrink-0">
                              {opt.code}
                            </span>
                            <span className="text-[14.5px] font-medium text-[#f7f8f8] truncate">
                              {opt.title}
                            </span>
                          </div>
                          <span className="text-[13px] text-[#8a8f98] shrink-0">
                            {STATUS_LABELS[opt.status] || opt.status}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#23252a]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="type-mono !text-[13px] rounded-[6px] bg-[#0f1011] border border-[#23252a] px-2 py-0.5 text-[#d0d6e0]">
                      {selectedOptionCode || draftPreview.taskCode || 'Unspecified'}
                    </span>
                    <span className="text-[14.5px] text-[#f7f8f8] truncate">
                      {draftPreview.taskTitle || 'Selected issue'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[14px] font-medium text-[#f7f8f8] shrink-0">
                    <ArrowRight className="h-4 w-4 text-[#62666d]" />
                    <StatusIcon status={draftPreview.status} size={15} />
                    <span>{STATUS_LABELS[draftPreview.status] || draftPreview.status}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* INTENT 3: FILTER_TASKS */}
          {draftPreview.intent === 'FILTER_TASKS' && (
            <div className="rounded-[12px] bg-[#141516] border border-[#23252a] p-4 space-y-3">
              <div className="text-[14.5px] font-semibold text-[#f7f8f8] flex items-center gap-2">
                <Filter className="h-4 w-4 text-[#8a8f98]" />
                <span>Workspace Filters to Apply</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(draftPreview.filters || {})
                  .filter(([, val]) => val !== null && val !== undefined && val !== '')
                  .map(([key, val]) => (
                    <span key={key} className="linear-badge !bg-[#0f1011] !py-1 !px-2.5">
                      <span className="type-eyebrow !text-[12px] text-[#8a8f98]">{key}</span>
                      <span className="text-[13px] text-[#f7f8f8]">
                        {Array.isArray(val) ? val.join(', ') : String(val)}
                      </span>
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-[#23252a] bg-[#0f1011] px-5 py-3.5 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isExecuting}
            className="btn-primary"
          >
            <Check className="h-4 w-4" />
            <span>
              {isExecuting
                ? 'Executing...'
                : draftPreview.intent === 'FILTER_TASKS'
                  ? 'Apply Filters'
                  : 'Confirm & Execute'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

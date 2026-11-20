import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProjectModal({ isOpen, onClose, onCreateProject }) {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleNameChange = (val) => {
    setName(val);
    if (!key || key === name.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '')) {
      const autoKey = val
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 5);
      setKey(autoKey);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !key.trim() || submitting) return;

    setSubmitting(true);
    try {
      await onCreateProject({
        name: name.trim(),
        key: key.trim().toUpperCase(),
        description: description.trim(),
      });
      toast.success(`Project ${key.trim().toUpperCase()} created`);
      setName('');
      setKey('');
      setDescription('');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Could not create project');
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
      <div className="w-full max-w-md max-h-[90dvh] flex flex-col linear-modal overflow-hidden">
        <div className="shrink-0 flex items-center justify-between border-b border-[#111216]/8 dark:border-white/10 bg-white/55 dark:bg-white/[0.04] px-4 sm:px-5 py-3.5 sm:py-4">
          <div>
            <div className="type-eyebrow !text-[11.5px] !text-[#6531F7] dark:!text-[#A78BFA] mb-0.5">
              New Project
            </div>
            <h3 className="text-[16.5px] font-semibold tracking-[-0.02em] text-[#111216] dark:text-[#F5F6FA] m-0">
              Create Project
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close project modal"
            className="btn-tertiary !p-1.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-[13.5px] font-semibold text-[#111216]/85 dark:text-[#F5F6FA]/85 block mb-1.5">
              Project Name <span className="text-[#E11D48] dark:text-[#FB7185]">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Core Platform"
              className="linear-input !bg-white/90 dark:!bg-[#0B0C14]/70"
              autoFocus
            />
          </div>

          <div>
            <label className="text-[13.5px] font-semibold text-[#111216]/85 dark:text-[#F5F6FA]/85 block mb-1.5">
              Project Key{' '}
              <span className="text-[#111216]/45 dark:text-[#F5F6FA]/45">
                (2–6 uppercase letters) *
              </span>
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="FLOW"
              className="linear-input !bg-white/90 dark:!bg-[#0B0C14]/70 type-mono uppercase tracking-wider"
            />
          </div>

          <div>
            <label className="text-[13.5px] font-semibold text-[#111216]/85 dark:text-[#F5F6FA]/85 block mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional project scope or sprint goal..."
              className="linear-input !bg-white/90 dark:!bg-[#0B0C14]/70 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#111216]/8 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim() || key.trim().length < 2}
              className="btn-primary"
            >
              <FolderPlus className="h-4 w-4" />
              <span>{submitting ? 'Creating...' : 'Create Project'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

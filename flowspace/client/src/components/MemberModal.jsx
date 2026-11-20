import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MemberModal({ isOpen, onClose, onAddMember }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onAddMember({ email: email.trim(), role });
      toast.success(`Added ${email.trim()} to workspace`);
      setEmail('');
      setRole('MEMBER');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Could not add member');
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
              Workspace Access
            </div>
            <h3 className="text-[16.5px] font-semibold tracking-[-0.02em] text-[#111216] dark:text-[#F5F6FA] m-0">
              Add Workspace Member
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close member modal"
            className="btn-tertiary !p-1.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-[13.5px] font-semibold text-[#111216]/85 dark:text-[#F5F6FA]/85 block mb-1.5">
              Registered User Email <span className="text-[#E11D48] dark:text-[#FB7185]">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@flowspace.dev"
              className="linear-input !bg-white/90 dark:!bg-[#0B0C14]/70"
              autoFocus
            />
            <p className="text-[13px] text-[#111216]/55 dark:text-[#F5F6FA]/55 mt-2 mb-0 leading-relaxed">
              Demo accounts:{' '}
              <code className="type-mono !text-[12px] rounded-[6px] bg-white dark:bg-white/10 border border-[#111216]/10 dark:border-white/15 px-1.5 py-0.5 text-[#111216] dark:text-[#F5F6FA]">
                priya@flowspace.dev
              </code>{' '}
              <code className="type-mono !text-[12px] rounded-[6px] bg-white dark:bg-white/10 border border-[#111216]/10 dark:border-white/15 px-1.5 py-0.5 text-[#111216] dark:text-[#F5F6FA]">
                rahul@flowspace.dev
              </code>
            </p>
          </div>

          <div>
            <label className="text-[13.5px] font-semibold text-[#111216]/85 dark:text-[#F5F6FA]/85 block mb-1.5">
              Workspace Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="linear-input !bg-white/90 dark:!bg-[#0B0C14]/70"
            >
              <option value="MEMBER">MEMBER — Create, edit &amp; move issues</option>
              <option value="OWNER">OWNER — Full workspace &amp; member management</option>
            </select>
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
              disabled={submitting || !email.trim()}
              className="btn-primary"
            >
              <UserPlus className="h-4 w-4" />
              <span>{submitting ? 'Adding...' : 'Add Member'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

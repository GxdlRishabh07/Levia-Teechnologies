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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-[4px] p-4">
      <div className="w-full max-w-md linear-modal overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#23252a] bg-[#0f1011] px-5 py-3.5">
          <div>
            <div className="type-eyebrow !text-[12px] mb-0.5">Workspace Access</div>
            <h3 className="text-[17px] font-semibold tracking-[-0.2px] text-[#f7f8f8] m-0">
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
            <label className="text-[14px] font-semibold text-[#d0d6e0] block mb-1.5">
              Registered User Email <span className="text-[#62666d]">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@flowspace.dev"
              className="linear-input"
              autoFocus
            />
            <p className="text-[13.5px] text-[#8a8f98] mt-2 mb-0 leading-relaxed">
              Demo accounts:{' '}
              <code className="type-mono !text-[12.5px] rounded-[4px] bg-[#141516] border border-[#23252a] px-1.5 py-0.5 text-[#d0d6e0]">
                priya@flowspace.dev
              </code>{' '}
              <code className="type-mono !text-[12.5px] rounded-[4px] bg-[#141516] border border-[#23252a] px-1.5 py-0.5 text-[#d0d6e0]">
                rahul@flowspace.dev
              </code>
            </p>
          </div>

          <div>
            <label className="text-[14px] font-semibold text-[#d0d6e0] block mb-1.5">
              Workspace Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="linear-input"
            >
              <option value="MEMBER">MEMBER — Create, edit &amp; move issues</option>
              <option value="OWNER">OWNER — Full workspace &amp; member management</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#23252a]">
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

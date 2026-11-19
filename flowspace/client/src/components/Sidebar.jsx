import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Check,
  ChevronsUpDown,
  Layers,
  Mic,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Sidebar({
  workspaces = [],
  activeWorkspace,
  onSelectWorkspace,
  onCreateWorkspace,
  projects = [],
  selectedProjectId,
  onSelectProject,
  onOpenProjectModal,
  members = [],
  onlineMembers = [],
  onOpenMemberModal,
}) {
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [isCreatingWs, setIsCreatingWs] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [submittingWs, setSubmittingWs] = useState(false);

  const dropdownRef = useRef(null);

  const isOwner = activeWorkspace?.role === 'OWNER';
  const onlineIds = new Set(onlineMembers.map((m) => String(m.id)));

  useEffect(() => {
    if (!wsDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setWsDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setWsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [wsDropdownOpen]);

  const handleCreateWs = async (e) => {
    e.preventDefault();
    if (!newWsName.trim() || submittingWs) return;
    setSubmittingWs(true);
    try {
      await onCreateWorkspace(newWsName.trim());
      toast.success(`Workspace "${newWsName.trim()}" created`);
      setNewWsName('');
      setIsCreatingWs(false);
      setWsDropdownOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to create workspace');
    } finally {
      setSubmittingWs(false);
    }
  };

  return (
    <aside className="w-[260px] shrink-0 border-r border-[#23252a] bg-[#0f1011] flex flex-col justify-between min-h-[calc(100vh-56px)] px-3.5 py-4">
      <div className="space-y-6">
        {/* Workspace Dropdown Switcher */}
        <div className="relative" ref={dropdownRef}>
          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="type-eyebrow">Workspace</span>
            <button
              type="button"
              onClick={() => {
                setWsDropdownOpen(false);
                setIsCreatingWs((v) => !v);
              }}
              title={isCreatingWs ? 'Cancel' : 'Create workspace'}
              aria-label={isCreatingWs ? 'Cancel' : 'Create workspace'}
              className="h-5 w-5 inline-flex items-center justify-center rounded-[5px] text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#18191a] transition-colors cursor-pointer"
            >
              {isCreatingWs ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setWsDropdownOpen((open) => !open)}
            aria-expanded={wsDropdownOpen}
            className="w-full flex items-center justify-between gap-2 rounded-[8px] bg-[#141516] border border-[#23252a] hover:border-[#34343a] px-3 py-2 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="h-7 w-7 rounded-[6px] bg-[#18191a] border border-[#34343a] inline-flex items-center justify-center text-[12.5px] font-semibold text-[#f7f8f8] shrink-0">
                {(activeWorkspace?.name || 'W').charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="text-[14.5px] font-semibold text-[#f7f8f8] truncate leading-tight">
                  {activeWorkspace?.name || 'Select workspace'}
                </div>
                <div className="text-[12px] text-[#62666d] truncate leading-tight mt-0.5 uppercase tracking-[0.25px]">
                  {activeWorkspace?.role || 'MEMBER'}
                </div>
              </div>
            </div>
            <ChevronsUpDown className="h-3.5 w-3.5 text-[#8a8f98] shrink-0" />
          </button>

          {/* Dropdown Menu (Surface-3 lift) */}
          {wsDropdownOpen && (
            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 rounded-[10px] bg-[#18191a] border border-[#34343a] p-1.5 space-y-0.5">
              {workspaces.map((ws) => {
                const isSelected = Number(ws.id) === Number(activeWorkspace?.id);
                return (
                  <button
                    key={ws.id}
                    type="button"
                    onClick={() => {
                      onSelectWorkspace(ws.id);
                      setWsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between rounded-[6px] px-2.5 py-1.5 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#141516] text-[#f7f8f8]'
                        : 'text-[#d0d6e0] hover:bg-[#191a1b] hover:text-[#f7f8f8]'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-[14px] font-medium truncate">{ws.name}</div>
                      <div className="text-[12px] text-[#62666d] uppercase tracking-[0.25px]">
                        {ws.role}
                      </div>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-[#5e6ad2] shrink-0" />}
                  </button>
                );
              })}

              <div className="h-px bg-[#23252a] my-1" />

              <button
                type="button"
                onClick={() => {
                  setWsDropdownOpen(false);
                  setIsCreatingWs(true);
                }}
                className="w-full flex items-center gap-2 rounded-[6px] px-2.5 py-2 text-[13.5px] font-medium text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#191a1b] transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create workspace</span>
              </button>
            </div>
          )}

          {/* Inline Create Workspace Form */}
          {isCreatingWs && (
            <form
              onSubmit={handleCreateWs}
              className="mt-2 rounded-[8px] bg-[#141516] border border-[#23252a] p-2.5 space-y-2"
            >
              <input
                type="text"
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
                placeholder="New workspace name..."
                className="linear-input !py-2 !px-2.5 !text-[14px]"
                autoFocus
              />
              <div className="flex items-center gap-1.5">
                <button
                  type="submit"
                  disabled={submittingWs || !newWsName.trim()}
                  className="btn-primary flex-1 !py-1.5 !px-2.5 !text-[13px]"
                >
                  {submittingWs ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingWs(false);
                    setNewWsName('');
                  }}
                  className="btn-secondary !py-1.5 !px-2.5 !text-[13px]"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Projects Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="type-eyebrow">Projects</span>
            <button
              type="button"
              onClick={onOpenProjectModal}
              title="New project"
              aria-label="New project"
              className="h-5 w-5 inline-flex items-center justify-center rounded-[5px] text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#18191a] transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => onSelectProject('')}
              className={`w-full flex items-center justify-between rounded-[8px] px-2.5 py-2 text-left transition-colors cursor-pointer border ${
                !selectedProjectId
                  ? 'bg-[#141516] border-[#23252a] text-[#f7f8f8] font-medium'
                  : 'border-transparent text-[#8a8f98] hover:text-[#d0d6e0] hover:bg-[#141516]/60'
              }`}
            >
              <span className="flex items-center gap-2 text-[14px] truncate font-medium">
                <Layers
                  className={`h-4 w-4 shrink-0 ${
                    !selectedProjectId ? 'text-[#5e6ad2]' : 'text-[#62666d]'
                  }`}
                />
                <span>All Projects</span>
              </span>
              <span className="type-mono text-[12.5px] text-[#62666d]">{projects.length}</span>
            </button>

            {projects.map((proj) => {
              const isSelected = Number(selectedProjectId) === Number(proj.id);
              return (
                <button
                  key={proj.id}
                  type="button"
                  onClick={() => onSelectProject(isSelected ? '' : proj.id)}
                  className={`w-full flex items-center justify-between rounded-[8px] px-2.5 py-2 text-left transition-colors cursor-pointer border ${
                    isSelected
                      ? 'bg-[#141516] border-[#23252a] text-[#f7f8f8] font-medium'
                      : 'border-transparent text-[#8a8f98] hover:text-[#d0d6e0] hover:bg-[#141516]/60'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0 pr-2">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        isSelected ? 'bg-[#5e6ad2]' : 'bg-[#3e3e44]'
                      }`}
                    />
                    <span className="text-[14px] truncate">{proj.name}</span>
                  </span>
                  <span
                    className={`type-mono !text-[12px] rounded-[4px] px-1.5 py-0.5 shrink-0 border ${
                      isSelected
                        ? 'bg-[#18191a] border-[#34343a] text-[#d0d6e0]'
                        : 'bg-[#141516] border-[#23252a] text-[#8a8f98]'
                    }`}
                  >
                    {proj.key}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Team Members & Presence Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="type-eyebrow">Team · {members.length}</span>
            {isOwner && (
              <button
                type="button"
                onClick={onOpenMemberModal}
                title="Invite member"
                aria-label="Invite member"
                className="h-5 w-5 inline-flex items-center justify-center rounded-[5px] text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#18191a] transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-0.5">
            {members.map((member) => {
              const isOnline = onlineIds.has(String(member.id));
              return (
                <div
                  key={member.id}
                  title={`${member.name} · ${member.email}`}
                  className="flex items-center justify-between gap-2 rounded-[8px] px-2 py-1.5 hover:bg-[#141516] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#18191a] border border-[#34343a] text-[12px] font-semibold text-[#d0d6e0]">
                        {(member.name || 'U').charAt(0).toUpperCase()}
                      </span>
                      <span
                        title={isOnline ? 'Online right now' : 'Offline'}
                        className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-[#0f1011] ${
                          isOnline ? 'bg-[#27a644]' : 'bg-[#3e3e44]'
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-medium text-[#d0d6e0] truncate leading-tight">
                        {member.name}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[12px] font-medium tracking-[0.3px] uppercase shrink-0 ${
                      member.role === 'OWNER' ? 'text-[#8a8f98]' : 'text-[#62666d]'
                    }`}
                  >
                    {member.role}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Voice & AI Shortcut Hint */}
      <div className="mt-6 rounded-[10px] bg-[#141516] border border-[#23252a] p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <Mic className="h-3.5 w-3.5 text-[#5e6ad2]" />
          <span className="type-eyebrow !text-[12px]">AI &amp; Voice</span>
        </div>
        <div className="space-y-1.5 text-[13px] text-[#8a8f98]">
          <div className="flex items-center justify-between gap-2">
            <span>Command bar</span>
            <kbd className="linear-kbd">⌘K</kbd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>Hold to speak</span>
            <kbd className="linear-kbd">Right ⌥</kbd>
          </div>
        </div>
      </div>
    </aside>
  );
}

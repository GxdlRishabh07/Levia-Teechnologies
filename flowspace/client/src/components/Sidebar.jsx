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
    <aside className="w-full lg:w-[244px] shrink-0 glass-sidebar flex flex-col justify-between lg:min-h-[calc(100vh-24px)] lg:sticky lg:top-3 py-5">
      <div className="space-y-6">
        {/* Workspace Header Switcher (Figma project block) */}
        <div className="relative px-4" ref={dropdownRef}>
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="type-eyebrow">Workspace</span>
            <button
              type="button"
              onClick={() => {
                setWsDropdownOpen(false);
                setIsCreatingWs((v) => !v);
              }}
              title={isCreatingWs ? 'Cancel' : 'Create workspace'}
              aria-label={isCreatingWs ? 'Cancel' : 'Create workspace'}
              className="h-6 w-6 inline-flex items-center justify-center rounded-[8px] text-[#111216]/50 hover:text-[#111216] hover:bg-white/75 transition-colors cursor-pointer"
            >
              {isCreatingWs ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setWsDropdownOpen((open) => !open)}
            aria-expanded={wsDropdownOpen}
            className="w-full flex items-center justify-between gap-2.5 rounded-[12px] bg-white/55 hover:bg-white/85 border border-white/80 px-2.5 py-2 text-left shadow-[inset_1px_1px_2px_rgba(255,255,255,0.85),0_2px_8px_rgba(31,28,70,0.03)] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="h-[34px] w-[34px] rounded-[8px] bg-[#262626] inline-flex items-center justify-center text-[13px] font-bold text-[#FFFFFF] shrink-0 shadow-sm">
                {(activeWorkspace?.name || 'W').charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-[#111216] truncate leading-tight">
                  {activeWorkspace?.name || 'Select workspace'}
                </div>
                <div className="text-[11.5px] font-medium text-[#111216]/45 truncate leading-tight mt-0.5 uppercase tracking-[0.04em]">
                  {activeWorkspace?.role || 'MEMBER'}
                </div>
              </div>
            </div>
            <span className="h-6 w-6 rounded-[8px] bg-[#FFFFFF] inline-flex items-center justify-center shadow-[0_1px_3px_rgba(17,18,22,0.08)] shrink-0">
              <ChevronsUpDown className="h-3.5 w-3.5 text-[#111216]/70" />
            </span>
          </button>

          {/* Dropdown Menu */}
          {wsDropdownOpen && (
            <div className="absolute left-4 right-4 top-[calc(100%+6px)] z-30 rounded-[14px] bg-white/95 backdrop-blur-2xl border border-white shadow-[0_14px_34px_rgba(24,22,58,0.12)] p-1.5 space-y-0.5">
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
                    className={`w-full flex items-center justify-between rounded-[9px] px-2.5 py-2 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#6531F7]/10 text-[#111216]'
                        : 'text-[#111216]/75 hover:bg-[#111216]/5 hover:text-[#111216]'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-[13.5px] font-semibold truncate">{ws.name}</div>
                      <div className="text-[11px] font-medium text-[#111216]/45 uppercase tracking-[0.04em]">
                        {ws.role}
                      </div>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-[#6531F7] shrink-0" />}
                  </button>
                );
              })}

              <div className="h-px bg-[#111216]/8 my-1" />

              <button
                type="button"
                onClick={() => {
                  setWsDropdownOpen(false);
                  setIsCreatingWs(true);
                }}
                className="w-full flex items-center gap-2 rounded-[9px] px-2.5 py-2 text-[13px] font-medium text-[#6531F7] hover:bg-[#6531F7]/8 transition-colors cursor-pointer"
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
              className="mt-2.5 rounded-[12px] bg-white/75 border border-white p-2.5 space-y-2 shadow-sm"
            >
              <input
                type="text"
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
                placeholder="New workspace name..."
                className="linear-input !py-2 !px-2.5 !text-[13.5px]"
                autoFocus
              />
              <div className="flex items-center gap-1.5">
                <button
                  type="submit"
                  disabled={submittingWs || !newWsName.trim()}
                  className="btn-primary flex-1 !py-1.5 !px-2.5 !text-[12.5px]"
                >
                  {submittingWs ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingWs(false);
                    setNewWsName('');
                  }}
                  className="btn-secondary !py-1.5 !px-2.5 !text-[12.5px]"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Hairline Glass Divider (Figma Vector 1) */}
        <div className="h-px bg-white/60 mx-4" />

        {/* Projects Section */}
        <div>
          <div className="flex items-center justify-between px-5 mb-2">
            <span className="type-eyebrow">Projects</span>
            <button
              type="button"
              onClick={onOpenProjectModal}
              title="New project"
              aria-label="New project"
              className="h-6 w-6 inline-flex items-center justify-center rounded-[8px] text-[#111216]/50 hover:text-[#111216] hover:bg-white/75 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => onSelectProject('')}
              className={`relative w-full flex items-center justify-between px-5 py-2 text-left transition-all cursor-pointer ${
                !selectedProjectId
                  ? 'text-[#111216] font-semibold bg-white/55'
                  : 'text-[#111216]/60 hover:text-[#111216] hover:bg-white/35'
              }`}
            >
              {!selectedProjectId && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1 bottom-1 w-[4px] rounded-r-[12px] bg-[#6531F7] shadow-[0_0_8px_rgba(101,49,247,0.45),0_0_4px_rgba(101,49,247,0.35)]"
                />
              )}
              <span className="flex items-center gap-2.5 text-[14px] truncate">
                <Layers
                  className={`h-4 w-4 shrink-0 ${
                    !selectedProjectId ? 'text-[#111216]' : 'text-[#111216]/45'
                  }`}
                />
                <span>All Projects</span>
              </span>
              <span className="type-mono text-[12px] text-[#111216]/45">{projects.length}</span>
            </button>

            {projects.map((proj) => {
              const isSelected = Number(selectedProjectId) === Number(proj.id);
              return (
                <button
                  key={proj.id}
                  type="button"
                  onClick={() => onSelectProject(isSelected ? '' : proj.id)}
                  className={`relative w-full flex items-center justify-between px-5 py-2 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'text-[#111216] font-semibold bg-white/55'
                      : 'text-[#111216]/60 hover:text-[#111216] hover:bg-white/35'
                  }`}
                >
                  {isSelected && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1 bottom-1 w-[4px] rounded-r-[12px] bg-[#6531F7] shadow-[0_0_8px_rgba(101,49,247,0.45),0_0_4px_rgba(101,49,247,0.35)]"
                    />
                  )}
                  <span className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        isSelected ? 'bg-[#6531F7]' : 'bg-[#111216]/25'
                      }`}
                    />
                    <span className="text-[14px] truncate">{proj.name}</span>
                  </span>
                  <span
                    className={`type-mono !text-[11.5px] rounded-[6px] px-1.5 py-0.5 shrink-0 border ${
                      isSelected
                        ? 'bg-white border-[#6531F7]/25 text-[#6531F7]'
                        : 'bg-white/60 border-white/80 text-[#111216]/55'
                    }`}
                  >
                    {proj.key}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Hairline Glass Divider */}
        <div className="h-px bg-white/60 mx-4" />

        {/* Team Members & Presence Section */}
        <div className="px-4">
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="type-eyebrow">Team · {members.length}</span>
            {isOwner && (
              <button
                type="button"
                onClick={onOpenMemberModal}
                title="Invite member"
                aria-label="Invite member"
                className="h-6 w-6 inline-flex items-center justify-center rounded-[8px] text-[#111216]/50 hover:text-[#111216] hover:bg-white/75 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-1">
            {members.map((member) => {
              const isOnline = onlineIds.has(String(member.id));
              return (
                <div
                  key={member.id}
                  title={`${member.name} · ${member.email}`}
                  className="flex items-center justify-between gap-2 rounded-[10px] px-2 py-1.5 hover:bg-white/55 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/85 border border-white text-[12px] font-semibold text-[#111216] shadow-xs">
                        {(member.name || 'U').charAt(0).toUpperCase()}
                      </span>
                      <span
                        title={isOnline ? 'Online right now' : 'Offline'}
                        className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                          isOnline ? 'bg-[#059669]' : 'bg-[#111216]/25'
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-medium text-[#111216]/85 truncate leading-tight">
                        {member.name}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-semibold tracking-[0.04em] uppercase shrink-0 ${
                      member.role === 'OWNER' ? 'text-[#6531F7]' : 'text-[#111216]/40'
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
      <div className="mt-6 mx-4 rounded-[14px] bg-white/60 border border-white/85 p-3.5 space-y-2 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.9)]">
        <div className="flex items-center gap-1.5">
          <Mic className="h-3.5 w-3.5 text-[#6531F7]" />
          <span className="type-eyebrow !text-[11.5px] !text-[#111216]/60">AI &amp; Voice</span>
        </div>
        <div className="space-y-1.5 text-[12.5px] text-[#111216]/65">
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

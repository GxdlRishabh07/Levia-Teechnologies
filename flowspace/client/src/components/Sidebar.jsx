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
  isMobileOpen = false,
  onCloseMobile,
}) {
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [isCreatingWs, setIsCreatingWs] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [submittingWs, setSubmittingWs] = useState(false);

  const dropdownRef = useRef(null);

  const isOwner = activeWorkspace?.role === 'OWNER';
  const onlineIds = new Set(onlineMembers.map((m) => String(m.id)));

  // Close mobile drawer on Escape and lock background body scroll while open
  useEffect(() => {
    if (!isMobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleEsc = (e) => {
      if (e.key === 'Escape') onCloseMobile?.();
    };
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isMobileOpen, onCloseMobile]);

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
    <>
      {/* Mobile / Tablet Slide-Over Scrim Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#02040A]/55 backdrop-blur-[4px] lg:hidden transition-opacity"
          aria-hidden="true"
          onClick={() => onCloseMobile?.()}
        />
      )}

      <aside
        aria-label="Workspace navigation"
        className={`glass-sidebar flex flex-col p-3 overflow-hidden transition-transform duration-200 ease-out
          fixed inset-y-2.5 left-2.5 z-50 w-[280px] max-w-[calc(100vw-24px)]
          lg:static lg:inset-auto lg:z-auto lg:w-[248px] lg:shrink-0 lg:h-[calc(100vh-24px)] lg:max-h-[calc(100vh-24px)] lg:sticky lg:top-3 lg:translate-x-0
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-[calc(100%+24px)] pointer-events-none lg:pointer-events-auto'}
        `}
      >
        {/* Workspace Header Switcher (Pinned at top) */}
        <div className="shrink-0 relative mb-3" ref={dropdownRef}>
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="type-eyebrow">Workspace</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setWsDropdownOpen(false);
                  setIsCreatingWs((v) => !v);
                }}
                title={isCreatingWs ? 'Cancel' : 'Create workspace'}
                aria-label={isCreatingWs ? 'Cancel' : 'Create workspace'}
                className="h-6 w-6 inline-flex items-center justify-center rounded-[8px] text-[#111216]/50 dark:text-[#F5F6FA]/55 hover:text-[#111216] dark:hover:text-[#F5F6FA] hover:bg-white/75 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                {isCreatingWs ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => onCloseMobile?.()}
                aria-label="Close sidebar"
                className="lg:hidden h-6 w-6 inline-flex items-center justify-center rounded-[8px] text-[#111216]/60 dark:text-[#F5F6FA]/65 hover:text-[#111216] dark:hover:text-[#F5F6FA] hover:bg-white/75 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

        <button
          type="button"
          onClick={() => setWsDropdownOpen((open) => !open)}
          aria-expanded={wsDropdownOpen}
          className="w-full flex items-center justify-between gap-2.5 rounded-[12px] bg-white/55 dark:bg-white/[0.06] hover:bg-white/85 dark:hover:bg-white/[0.11] border border-white/80 dark:border-white/12 px-2.5 py-2 text-left shadow-[inset_1px_1px_2px_rgba(255,255,255,0.85),0_2px_8px_rgba(31,28,70,0.03)] dark:shadow-[inset_1px_1px_1px_rgba(255,255,255,0.12),0_4px_14px_rgba(0,0,0,0.22)] transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="h-[34px] w-[34px] rounded-[8px] bg-[#262626] dark:bg-[#6531F7] inline-flex items-center justify-center text-[13px] font-bold text-[#FFFFFF] shrink-0 shadow-sm">
              {(activeWorkspace?.name || 'W').charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-[#111216] dark:text-[#F5F6FA] truncate leading-tight">
                {activeWorkspace?.name || 'Select workspace'}
              </div>
              <div className="text-[11.5px] font-medium text-[#111216]/45 dark:text-[#F5F6FA]/50 truncate leading-tight mt-0.5 uppercase tracking-[0.04em]">
                {activeWorkspace?.role || 'MEMBER'}
              </div>
            </div>
          </div>
          <span className="h-6 w-6 rounded-[8px] bg-[#FFFFFF] dark:bg-white/10 inline-flex items-center justify-center shadow-[0_1px_3px_rgba(17,18,22,0.08)] shrink-0">
            <ChevronsUpDown className="h-3.5 w-3.5 text-[#111216]/70 dark:text-[#F5F6FA]/75" />
          </span>
        </button>

        {/* Dropdown Menu */}
        {wsDropdownOpen && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 rounded-[14px] bg-white/95 dark:bg-[#141624]/95 backdrop-blur-2xl border border-white dark:border-white/15 shadow-[0_14px_34px_rgba(24,22,58,0.12)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.55)] p-1.5 space-y-0.5">
            {workspaces.map((ws) => {
              const isSelected = Number(ws.id) === Number(activeWorkspace?.id);
              return (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => {
                    onSelectWorkspace(ws.id);
                    setWsDropdownOpen(false);
                    onCloseMobile?.();
                  }}
                  className={`w-full flex items-center justify-between rounded-[9px] px-2.5 py-2 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#6531F7]/10 dark:bg-[#7242FF]/20 text-[#111216] dark:text-[#F5F6FA]'
                      : 'text-[#111216]/75 dark:text-[#F5F6FA]/75 hover:bg-[#111216]/5 dark:hover:bg-white/8 hover:text-[#111216] dark:hover:text-[#F5F6FA]'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-[13.5px] font-semibold truncate">{ws.name}</div>
                    <div className="text-[11px] font-medium text-[#111216]/45 dark:text-[#F5F6FA]/45 uppercase tracking-[0.04em]">
                      {ws.role}
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-[#6531F7] dark:text-[#A78BFA] shrink-0" />
                  )}
                </button>
              );
            })}

            <div className="h-px bg-[#111216]/8 dark:bg-white/10 my-1" />

            <button
              type="button"
              onClick={() => {
                setWsDropdownOpen(false);
                setIsCreatingWs(true);
              }}
              className="w-full flex items-center gap-2 rounded-[9px] px-2.5 py-2 text-[13px] font-medium text-[#6531F7] dark:text-[#A78BFA] hover:bg-[#6531F7]/8 dark:hover:bg-[#7242FF]/15 transition-colors cursor-pointer"
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
            className="mt-2.5 rounded-[12px] bg-white/75 dark:bg-white/8 border border-white dark:border-white/12 p-2.5 space-y-2 shadow-sm"
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

        {/* Hairline Glass Divider */}
        <div className="h-px bg-white/60 dark:bg-white/10 mx-1 mt-3" />
      </div>

      {/* Middle Scrollable Section: Projects + Team Members */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-4 pr-0.5 scrollbar-thin">
        {/* Projects Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="type-eyebrow">Projects</span>
            <button
              type="button"
              onClick={() => {
                onOpenProjectModal();
                onCloseMobile?.();
              }}
              title="New project"
              aria-label="New project"
              className="h-6 w-6 inline-flex items-center justify-center rounded-[8px] text-[#111216]/50 dark:text-[#F5F6FA]/55 hover:text-[#111216] dark:hover:text-[#F5F6FA] hover:bg-white/75 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => {
                onSelectProject('');
                onCloseMobile?.();
              }}
              className={`relative w-full flex items-center justify-between px-2.5 py-1.5 rounded-[9px] text-left transition-all cursor-pointer ${
                !selectedProjectId
                  ? 'text-[#111216] dark:text-[#F5F6FA] font-semibold bg-white/60 dark:bg-white/[0.08]'
                  : 'text-[#111216]/60 dark:text-[#F5F6FA]/60 hover:text-[#111216] dark:hover:text-[#F5F6FA] hover:bg-white/40 dark:hover:bg-white/[0.04]'
              }`}
            >
              {!selectedProjectId && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-[12px] bg-[#6531F7] dark:bg-[#855BFF] shadow-[0_0_8px_rgba(101,49,247,0.45)] dark:shadow-[0_0_12px_rgba(133,91,255,0.65)]"
                />
              )}
              <span className="flex items-center gap-2 text-[13.5px] truncate pl-1">
                <Layers
                  className={`h-3.5 w-3.5 shrink-0 ${
                    !selectedProjectId
                      ? 'text-[#6531F7] dark:text-[#A78BFA]'
                      : 'text-[#111216]/45 dark:text-[#F5F6FA]/45'
                  }`}
                />
                <span>All Projects</span>
              </span>
              <span className="type-mono text-[11.5px] text-[#111216]/45 dark:text-[#F5F6FA]/45">
                {projects.length}
              </span>
            </button>

            {projects.map((proj) => {
              const isSelected = Number(selectedProjectId) === Number(proj.id);
              return (
                <button
                  key={proj.id}
                  type="button"
                  onClick={() => {
                    onSelectProject(isSelected ? '' : proj.id);
                    onCloseMobile?.();
                  }}
                  className={`relative w-full flex items-center justify-between px-2.5 py-1.5 rounded-[9px] text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'text-[#111216] dark:text-[#F5F6FA] font-semibold bg-white/60 dark:bg-white/[0.08]'
                      : 'text-[#111216]/60 dark:text-[#F5F6FA]/60 hover:text-[#111216] dark:hover:text-[#F5F6FA] hover:bg-white/40 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  {isSelected && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-[12px] bg-[#6531F7] dark:bg-[#855BFF] shadow-[0_0_8px_rgba(101,49,247,0.45)] dark:shadow-[0_0_12px_rgba(133,91,255,0.65)]"
                    />
                  )}
                  <span className="flex items-center gap-2 min-w-0 pr-2 pl-1">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        isSelected
                          ? 'bg-[#6531F7] dark:bg-[#855BFF]'
                          : 'bg-[#111216]/25 dark:bg-white/25'
                      }`}
                    />
                    <span className="text-[13.5px] truncate">{proj.name}</span>
                  </span>
                  <span
                    className={`type-mono !text-[11px] rounded-[5px] px-1.5 py-0.5 shrink-0 border ${
                      isSelected
                        ? 'bg-white dark:bg-[#7242FF]/20 border-[#6531F7]/25 dark:border-[#855BFF]/40 text-[#6531F7] dark:text-[#C4B5FD]'
                        : 'bg-white/60 dark:bg-white/[0.06] border-white/80 dark:border-white/10 text-[#111216]/55 dark:text-[#F5F6FA]/55'
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
        <div className="h-px bg-white/60 dark:bg-white/10 mx-1" />

        {/* Team Members & Presence Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="type-eyebrow">Team · {members.length}</span>
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  onOpenMemberModal();
                  onCloseMobile?.();
                }}
                title="Invite member"
                aria-label="Invite member"
                className="h-6 w-6 inline-flex items-center justify-center rounded-[8px] text-[#111216]/50 dark:text-[#F5F6FA]/55 hover:text-[#111216] dark:hover:text-[#F5F6FA] hover:bg-white/75 dark:hover:bg-white/10 transition-colors cursor-pointer"
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
                  className="flex items-center justify-between gap-2 rounded-[9px] px-2 py-1.5 hover:bg-white/55 dark:hover:bg-white/[0.06] transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative shrink-0">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/85 dark:bg-white/12 border border-white dark:border-white/15 text-[11px] font-semibold text-[#111216] dark:text-[#F5F6FA] shadow-2xs">
                        {(member.name || 'U').charAt(0).toUpperCase()}
                      </span>
                      <span
                        title={isOnline ? 'Online right now' : 'Offline'}
                        className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-white dark:ring-[#141624] ${
                          isOnline ? 'bg-[#059669]' : 'bg-[#111216]/25 dark:bg-white/25'
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-[#111216]/85 dark:text-[#F5F6FA]/85 truncate leading-tight">
                        {member.name}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[10.5px] font-semibold tracking-[0.04em] uppercase shrink-0 ${
                      member.role === 'OWNER'
                        ? 'text-[#6531F7] dark:text-[#A78BFA]'
                        : 'text-[#111216]/40 dark:text-[#F5F6FA]/40'
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

      {/* Bottom Pinned Footer: Voice & AI Shortcut Hint (Desktop keyboards) */}
      <div className="hidden lg:block shrink-0 pt-2.5 mt-auto">
        <div className="rounded-[14px] bg-white/65 dark:bg-white/[0.06] border border-white/85 dark:border-white/12 p-3 space-y-2 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.9)] dark:shadow-[inset_1px_1px_1px_rgba(255,255,255,0.1)]">
          <div className="flex items-center gap-1.5">
            <Mic className="h-3.5 w-3.5 text-[#6531F7] dark:text-[#A78BFA]" />
            <span className="type-eyebrow !text-[11px] !text-[#111216]/65 dark:!text-[#F5F6FA]/70">
              AI &amp; Voice
            </span>
          </div>
          <div className="space-y-1.5 text-[11.5px] text-[#111216]/65 dark:text-[#F5F6FA]/65">
            <div className="flex items-center justify-between gap-2">
              <span>Hold to speak (Mac)</span>
              <kbd className="linear-kbd shrink-0 whitespace-nowrap">Right ⌥</kbd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>Hold to speak (Win)</span>
              <kbd className="linear-kbd shrink-0 whitespace-nowrap">Right Alt</kbd>
            </div>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}

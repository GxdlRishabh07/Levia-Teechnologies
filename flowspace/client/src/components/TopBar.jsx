import React from 'react';
import {
  FileText,
  Plus,
  LogOut,
  Command,
  LayoutGrid,
  List,
  BarChart3,
  Activity,
} from 'lucide-react';
import { FlowSpaceLogo } from './LinearIcons';

const TABS = [
  { id: 'board', label: 'Board', icon: LayoutGrid },
  { id: 'list', label: 'List', icon: List },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'activity', label: 'Activity', icon: Activity },
];

export default function TopBar({
  user,
  activeWorkspace,
  activeTab,
  setActiveTab,
  onlineMembers = [],
  realtimeMode = 'polling',
  isConnected = false,
  onFocusCommandBar,
  onOpenNewTask,
  onOpenStandup,
  onLogout,
}) {
  const isLivePusher = realtimeMode === 'pusher' && isConnected;
  const onlineCount = Math.max(1, onlineMembers.length);

  return (
    <header className="sticky top-3 z-30 linear-panel rounded-[18px] px-3.5 py-2 flex items-center justify-between gap-2 overflow-x-auto">
      {/* Left: Brand Mark, Workspace Name & View Switcher */}
      <div className="flex items-center gap-2.5 min-w-0 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FlowSpaceLogo size={22} className="shrink-0" />
          <span className="text-[#111216]/20 text-[14px] select-none hidden sm:inline">/</span>
          <h1 className="m-0 text-[14.5px] font-semibold tracking-[-0.02em] text-[#111216] truncate max-w-[110px] xl:max-w-[145px]">
            {activeWorkspace ? activeWorkspace.name : 'Workspace'}
          </h1>
          {activeWorkspace?.role && (
            <span className="hidden 2xl:inline-flex items-center rounded-[6px] bg-white/75 border border-white px-2 py-0.5 text-[11px] font-semibold tracking-[0.05em] text-[#6531F7] uppercase shrink-0 shadow-2xs">
              {activeWorkspace.role}
            </span>
          )}
        </div>

        <div className="h-4 w-px bg-[#111216]/10 mx-0.5 hidden sm:block shrink-0" />

        {/* View Switcher Glass Capsule */}
        <nav
          className="flex items-center gap-0.5 rounded-full bg-white/45 border border-white/70 p-0.5 shrink-0"
          aria-label="Workspace views"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`linear-tab !px-3 !py-1.5 !text-[13px] shrink-0 ${isActive ? 'linear-tab-active' : ''}`}
              >
                <Icon
                  className={`h-3.5 w-3.5 ${isActive ? 'text-[#6531F7]' : 'text-[#111216]/50'}`}
                />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right: Live Presence, Command, Standup, New Issue, Sign Out */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Live Presence Indicator */}
        <div
          className="hidden xl:flex items-center gap-1.5 rounded-full bg-white/70 border border-white px-2.5 py-1 shadow-2xs"
          title={
            isLivePusher
              ? 'Connected via Pusher Channels live presence'
              : 'Live sync active (15s polling fallback)'
          }
        >
          <span
            className={`h-2 w-2 rounded-full shrink-0 ${
              isLivePusher ? 'bg-[#059669]' : 'bg-[#059669]/80'
            }`}
          />
          <span className="text-[12px] font-medium text-[#111216]/65 tabular-nums whitespace-nowrap">
            {isLivePusher ? 'Live' : 'Sync'} · {onlineCount}
          </span>
          {onlineMembers.length > 0 && (
            <div className="flex -space-x-1 pl-0.5">
              {onlineMembers.slice(0, 3).map((member) => (
                <span
                  key={member.id}
                  title={`${member.name} (${member.email || 'online'})`}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#262626] text-[10.5px] font-semibold text-white ring-2 ring-white"
                >
                  {(member.name || 'U').charAt(0).toUpperCase()}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Cmd+K Command Trigger */}
        <button
          type="button"
          onClick={onFocusCommandBar}
          className="btn-secondary !py-1.5 !px-2.5 !text-[13px] hidden md:inline-flex whitespace-nowrap"
        >
          <Command className="h-3.5 w-3.5 text-[#111216]/60" />
          <span>Command</span>
          <kbd className="linear-kbd ml-0.5">⌘K</kbd>
        </button>

        {/* AI Daily Standup Trigger */}
        <button
          type="button"
          onClick={onOpenStandup}
          className="btn-secondary !py-1.5 !px-2.5 !text-[13px] whitespace-nowrap"
          title="AI Daily Standup"
        >
          <FileText className="h-3.5 w-3.5 text-[#111216]/60" />
          <span className="hidden sm:inline">Standup</span>
        </button>

        {/* Primary CTA: New Issue */}
        <button
          type="button"
          onClick={onOpenNewTask}
          className="btn-primary !py-1.5 !px-3 !text-[13px] whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          <span>New Issue</span>
        </button>

        {/* User Avatar & Sign Out */}
        {user && (
          <div className="flex items-center gap-1 pl-1.5 ml-0.5 border-l border-[#111216]/10">
            <span
              title={`${user.name}${user.email ? ` (${user.email})` : ''}`}
              className="hidden 2xl:inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#262626] text-[11.5px] font-semibold text-white select-none shadow-xs"
            >
              {(user.name || 'U').charAt(0).toUpperCase()}
            </span>
            <button
              type="button"
              onClick={onLogout}
              title="Sign out"
              aria-label="Sign out"
              className="btn-tertiary !p-1.5"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

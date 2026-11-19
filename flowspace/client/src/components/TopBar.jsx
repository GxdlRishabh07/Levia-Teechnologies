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
    <header className="sticky top-0 z-30 h-[56px] bg-[#010102] border-b border-[#23252a] px-4 lg:px-5 flex items-center justify-between gap-3">
      {/* Left: Brand Mark, Workspace Name & View Switcher */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <FlowSpaceLogo size={22} className="shrink-0" />
          <span className="text-[#34343a] text-[15px] select-none hidden sm:inline">/</span>
          <h1 className="m-0 text-[16px] font-semibold tracking-[-0.2px] text-[#f7f8f8] truncate max-w-[150px] md:max-w-[220px]">
            {activeWorkspace ? activeWorkspace.name : 'Workspace'}
          </h1>
          {activeWorkspace?.role && (
            <span className="hidden xl:inline-flex items-center rounded-[4px] bg-[#141516] border border-[#23252a] px-2 py-0.5 text-[12px] font-medium tracking-[0.35px] text-[#8a8f98] uppercase shrink-0">
              {activeWorkspace.role}
            </span>
          )}
        </div>

        <div className="h-4 w-px bg-[#23252a] mx-1 hidden sm:block shrink-0" />

        {/* View Switcher Pills (Linear pricing-tab-default / pricing-tab-selected spec) */}
        <nav className="flex items-center gap-0.5 overflow-x-auto" aria-label="Workspace views">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`linear-tab shrink-0 ${isActive ? 'linear-tab-active' : ''}`}
              >
                <Icon
                  className={`h-3.5 w-3.5 ${isActive ? 'text-[#f7f8f8]' : 'text-[#8a8f98]'}`}
                />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right: Live Presence, Command, Standup, New Issue, Sign Out */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Live Presence Indicator */}
        <div
          className="hidden lg:flex items-center gap-2 rounded-full bg-[#0f1011] border border-[#23252a] px-2.5 py-1"
          title={
            isLivePusher
              ? 'Connected via Pusher Channels live presence'
              : 'Live sync active (15s polling fallback)'
          }
        >
          <span
            className={`h-1.5 w-1.5 rounded-full shrink-0 ${
              isLivePusher ? 'bg-[#27a644]' : 'bg-[#27a644]/75'
            }`}
          />
          <span className="text-[13px] font-medium text-[#8a8f98] tabular-nums whitespace-nowrap">
            {isLivePusher ? 'Live' : 'Sync'} · {onlineCount}
          </span>
          {onlineMembers.length > 0 && (
            <div className="flex -space-x-1 pl-0.5">
              {onlineMembers.slice(0, 4).map((member) => (
                <span
                  key={member.id}
                  title={`${member.name} (${member.email || 'online'})`}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#18191a] text-[12px] font-semibold text-[#d0d6e0] ring-1 ring-[#34343a]"
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
          className="btn-secondary !py-1.5 !px-3 !text-[13.5px] hidden md:inline-flex"
        >
          <Command className="h-4 w-4 text-[#8a8f98]" />
          <span>Command</span>
          <kbd className="linear-kbd ml-0.5">⌘K</kbd>
        </button>

        {/* AI Daily Standup Trigger */}
        <button
          type="button"
          onClick={onOpenStandup}
          className="btn-secondary !py-1.5 !px-3 !text-[13.5px]"
          title="AI Daily Standup"
        >
          <FileText className="h-4 w-4 text-[#8a8f98]" />
          <span className="hidden sm:inline">Standup</span>
        </button>

        {/* Primary CTA: New Issue */}
        <button
          type="button"
          onClick={onOpenNewTask}
          className="btn-primary !py-1.5 !px-3.5 !text-[14px]"
        >
          <Plus className="h-4 w-4" />
          <span>New Issue</span>
        </button>

        {/* User Avatar & Sign Out */}
        {user && (
          <div className="flex items-center gap-2 pl-2 ml-0.5 border-l border-[#23252a]">
            <span
              title={`${user.name}${user.email ? ` (${user.email})` : ''}`}
              className="hidden xl:inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#18191a] border border-[#34343a] text-[12px] font-semibold text-[#f7f8f8] select-none"
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

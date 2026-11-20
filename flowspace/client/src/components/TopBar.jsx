import React from 'react';
import {
  FileText,
  Plus,
  LogOut,
  LayoutGrid,
  List,
  BarChart3,
  Activity,
  Sun,
  Moon,
  Menu,
} from 'lucide-react';
import { FlowSpaceLogo } from './LinearIcons';
import { useTheme } from '../hooks/useTheme';

const TABS = [
  { id: 'board', label: 'Board', shortLabel: 'Board', icon: LayoutGrid },
  { id: 'list', label: 'List', shortLabel: 'List', icon: List },
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Stats', icon: BarChart3 },
  { id: 'activity', label: 'Activity', shortLabel: 'Feed', icon: Activity },
];

export default function TopBar({
  user,
  activeWorkspace,
  activeTab,
  setActiveTab,
  onlineMembers = [],
  realtimeMode = 'polling',
  isConnected = false,
  onToggleMobileSidebar,
  onOpenNewTask,
  onOpenStandup,
  onLogout,
}) {
  const { isDark, toggleTheme } = useTheme();
  const isLivePusher = realtimeMode === 'pusher' && isConnected;
  const onlineCount = Math.max(1, onlineMembers.length);

  return (
    <header className="sticky top-2.5 sm:top-3 z-30 linear-panel !rounded-[16px] sm:!rounded-[18px] px-2.5 sm:px-3 py-2 flex flex-col gap-2">
      {/* Primary Row */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        {/* Left: Mobile Drawer Trigger, Brand Mark, Workspace Name & Desktop View Switcher */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            aria-label="Open workspace navigation"
            title="Workspace & Projects"
            className="lg:hidden btn-tertiary !p-1.5 shrink-0"
          >
            <Menu className="h-[18px] w-[18px]" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <FlowSpaceLogo size={22} className="shrink-0" />
            <span className="text-[#111216]/20 dark:text-white/20 text-[14px] select-none hidden sm:inline">
              /
            </span>
            <h1 className="m-0 text-[14px] font-semibold tracking-[-0.02em] text-[#111216] dark:text-[#F5F6FA] truncate max-w-[115px] sm:max-w-[140px] xl:max-w-[165px]">
              {activeWorkspace ? activeWorkspace.name : 'Workspace'}
            </h1>
            {activeWorkspace?.role && (
              <span className="hidden 2xl:inline-flex items-center rounded-[6px] bg-white/75 dark:bg-white/10 border border-white dark:border-white/15 px-2 py-0.5 text-[11px] font-semibold tracking-[0.05em] text-[#6531F7] dark:text-[#C4B5FD] uppercase shrink-0 shadow-2xs">
                {activeWorkspace.role}
              </span>
            )}
          </div>

          <div className="h-4 w-px bg-[#111216]/10 dark:bg-white/10 mx-0.5 hidden md:block shrink-0" />

          {/* Desktop & Tablet View Switcher Glass Capsule */}
          <nav
            className="hidden md:flex items-center gap-0.5 rounded-full bg-white/45 dark:bg-white/[0.05] border border-white/70 dark:border-white/10 p-0.5 shrink-0"
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
                  className={`linear-tab !px-2.5 !py-1.5 !text-[13px] shrink-0 ${isActive ? 'linear-tab-active' : ''}`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 ${
                      isActive
                        ? 'text-[#6531F7] dark:text-[#A78BFA]'
                        : 'text-[#111216]/50 dark:text-[#F5F6FA]/55'
                    }`}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Live Presence, Standup, New Issue, Theme Toggle, Sign Out */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Live Presence Indicator */}
          <div
            className="hidden xl:flex items-center gap-1.5 rounded-full bg-white/70 dark:bg-white/[0.08] border border-white dark:border-white/12 px-2.5 py-1 shadow-2xs"
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
            <span className="text-[12px] font-medium text-[#111216]/65 dark:text-[#F5F6FA]/75 tabular-nums whitespace-nowrap">
              {isLivePusher ? 'Live' : 'Sync'} · {onlineCount}
            </span>
            {onlineMembers.length > 0 && (
              <div className="flex -space-x-1 pl-0.5">
                {onlineMembers.slice(0, 3).map((member) => (
                  <span
                    key={member.id}
                    title={`${member.name} (${member.email || 'online'})`}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#262626] dark:bg-[#7242FF] text-[10.5px] font-semibold text-white ring-2 ring-white dark:ring-[#181A28]"
                  >
                    {(member.name || 'U').charAt(0).toUpperCase()}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* AI Daily Standup Trigger */}
          <button
            type="button"
            onClick={onOpenStandup}
            className="btn-secondary !py-1.5 !px-2 sm:!px-2.5 !text-[13px] whitespace-nowrap"
            title="AI Daily Standup"
            aria-label="AI Daily Standup"
          >
            <FileText className="h-3.5 w-3.5 text-[#111216]/60 dark:text-[#F5F6FA]/65" />
            <span className="hidden sm:inline">Standup</span>
          </button>

          {/* Primary CTA: New Issue */}
          <button
            type="button"
            onClick={onOpenNewTask}
            className="btn-primary !py-1.5 !px-2.5 sm:!px-3 !text-[13px] whitespace-nowrap"
            aria-label="Create new issue"
          >
            <Plus className="h-4 w-4" />
            <span className="sm:hidden">New</span>
            <span className="hidden sm:inline">New Issue</span>
          </button>

          {/* Theme Switcher + User Avatar & Sign Out */}
          <div className="flex items-center gap-0.5 sm:gap-1 pl-1.5 ml-0.5 border-l border-[#111216]/10 dark:border-white/10">
            <button
              type="button"
              onClick={toggleTheme}
              title={isDark ? 'Switch to light glass mode' : 'Switch to dark glass mode'}
              aria-label={isDark ? 'Switch to light glass mode' : 'Switch to dark glass mode'}
              className="btn-tertiary !p-1.5"
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-[#FBBF24]" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            {user && (
              <>
                <span
                  title={`${user.name}${user.email ? ` (${user.email})` : ''}`}
                  className="hidden 2xl:inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#262626] dark:bg-[#7242FF] text-[11.5px] font-semibold text-white select-none shadow-xs"
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Segmented View Switcher (Full-Width, Zero Overflow) */}
      <nav
        className="grid grid-cols-4 md:hidden items-center gap-1 rounded-full bg-white/45 dark:bg-white/[0.05] border border-white/70 dark:border-white/10 p-0.5"
        aria-label="Mobile workspace views"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`linear-tab justify-center !px-2 !py-1.5 !text-[12.5px] ${isActive ? 'linear-tab-active' : ''}`}
            >
              <Icon
                className={`h-3.5 w-3.5 shrink-0 ${
                  isActive
                    ? 'text-[#6531F7] dark:text-[#A78BFA]'
                    : 'text-[#111216]/50 dark:text-[#F5F6FA]/55'
                }`}
              />
              <span className="truncate">{tab.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}

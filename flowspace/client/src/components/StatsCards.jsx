import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Sparkles,
  FileText,
} from 'lucide-react';
import {
  StatusIcon,
  PriorityIcon,
  STATUS_LABELS,
  PRIORITY_LABELS,
} from './LinearIcons';

const STATUS_BAR_COLORS = {
  BACKLOG: 'bg-[#111216]/30 dark:bg-white/30',
  IN_PROGRESS: 'bg-[#D97706]',
  IN_REVIEW: 'bg-[#6531F7] dark:bg-[#855BFF]',
  DONE: 'bg-[#059669]',
};

const PRIORITY_BAR_COLORS = {
  URGENT: 'bg-[#E11D48]',
  HIGH: 'bg-[#D97706]',
  MEDIUM: 'bg-[#6531F7] dark:bg-[#855BFF]',
  LOW: 'bg-[#111216]/30 dark:bg-white/30',
};

export default function StatsCards({ stats, isLoading = false, onOpenStandup }) {
  const safeStats = stats || {
    total: 0,
    completed: 0,
    overdue: 0,
    completionPercentage: 0,
    byStatus: { BACKLOG: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 },
    byPriority: { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 },
  };

  const statusRows = [
    { key: 'BACKLOG', label: STATUS_LABELS.BACKLOG, count: safeStats.byStatus?.BACKLOG || 0 },
    {
      key: 'IN_PROGRESS',
      label: STATUS_LABELS.IN_PROGRESS,
      count: safeStats.byStatus?.IN_PROGRESS || 0,
    },
    {
      key: 'IN_REVIEW',
      label: STATUS_LABELS.IN_REVIEW,
      count: safeStats.byStatus?.IN_REVIEW || 0,
    },
    { key: 'DONE', label: STATUS_LABELS.DONE, count: safeStats.byStatus?.DONE || 0 },
  ];

  const priorityRows = [
    { key: 'URGENT', label: PRIORITY_LABELS.URGENT, count: safeStats.byPriority?.URGENT || 0 },
    { key: 'HIGH', label: PRIORITY_LABELS.HIGH, count: safeStats.byPriority?.HIGH || 0 },
    { key: 'MEDIUM', label: PRIORITY_LABELS.MEDIUM, count: safeStats.byPriority?.MEDIUM || 0 },
    { key: 'LOW', label: PRIORITY_LABELS.LOW, count: safeStats.byPriority?.LOW || 0 },
  ];

  const inFlightCount =
    (safeStats.byStatus?.IN_PROGRESS || 0) + (safeStats.byStatus?.IN_REVIEW || 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="linear-panel p-6 h-[142px] flex flex-col justify-between">
              <div className="h-3.5 w-24 rounded-[6px] bg-white/75 dark:bg-white/10 animate-pulse" />
              <div className="space-y-2">
                <div className="h-8 w-16 rounded-[8px] bg-white/75 dark:bg-white/10 animate-pulse" />
                <div className="h-3 w-36 rounded-[6px] bg-white/60 dark:bg-white/8 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top 4 Frosted Bento Telemetry Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4.5">
        <div className="linear-panel p-4 sm:p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[13.5px] font-semibold text-[#111216]/60 dark:text-[#F5F6FA]/65">
              Total Issues
            </span>
            <span className="h-8 w-8 rounded-[10px] bg-white/80 dark:bg-white/8 border border-white dark:border-white/12 inline-flex items-center justify-center shadow-2xs">
              <Layers className="h-4 w-4 text-[#111216]/65 dark:text-[#F5F6FA]/75" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[34px] font-bold leading-[1.1] tracking-[-0.03em] text-[#111216] dark:text-[#F5F6FA] tabular-nums">
              {safeStats.total}
            </div>
            <div className="text-[13px] text-[#111216]/50 dark:text-[#F5F6FA]/50 mt-2 font-medium">
              Across active workspace projects
            </div>
          </div>
        </div>

        <div className="linear-panel p-4 sm:p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[13px] sm:text-[13.5px] font-semibold text-[#111216]/60 dark:text-[#F5F6FA]/65">
              Completion Rate
            </span>
            <span className="h-8 w-8 rounded-[10px] bg-[#059669]/10 dark:bg-[#059669]/20 border border-[#059669]/20 dark:border-[#059669]/35 inline-flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-[#059669] dark:text-[#34D399]" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[34px] font-bold leading-[1.1] tracking-[-0.03em] text-[#111216] dark:text-[#F5F6FA] tabular-nums">
              {safeStats.completionPercentage}%
            </div>
            <div className="mt-3.5 h-[5px] w-full rounded-full bg-[#111216]/8 dark:bg-white/10 overflow-hidden">
              <div
                style={{ width: `${Math.min(100, safeStats.completionPercentage || 0)}%` }}
                className="h-full rounded-full bg-[#059669] transition-all duration-300"
              />
            </div>
          </div>
        </div>

        <div className="linear-panel p-4 sm:p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[13px] sm:text-[13.5px] font-semibold text-[#111216]/60 dark:text-[#F5F6FA]/65">
              In Flight
            </span>
            <span className="h-8 w-8 rounded-[10px] bg-[#6531F7]/10 dark:bg-[#7242FF]/20 border border-[#6531F7]/20 dark:border-[#855BFF]/35 inline-flex items-center justify-center">
              <Clock className="h-4 w-4 text-[#6531F7] dark:text-[#A78BFA]" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[34px] font-bold leading-[1.1] tracking-[-0.03em] text-[#111216] dark:text-[#F5F6FA] tabular-nums">
              {inFlightCount}
            </div>
            <div className="type-mono text-[12.5px] text-[#111216]/50 dark:text-[#F5F6FA]/50 mt-2">
              {safeStats.byStatus?.IN_PROGRESS || 0} active · {safeStats.byStatus?.IN_REVIEW || 0}{' '}
              in review
            </div>
          </div>
        </div>

        <div className="linear-panel p-4 sm:p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[13px] sm:text-[13.5px] font-semibold text-[#111216]/60 dark:text-[#F5F6FA]/65">
              Overdue
            </span>
            <span
              className={`h-8 w-8 rounded-[10px] border inline-flex items-center justify-center ${
                safeStats.overdue > 0
                  ? 'bg-[#E11D48]/10 dark:bg-[#E11D48]/20 border-[#E11D48]/20 dark:border-[#E11D48]/35'
                  : 'bg-white/80 dark:bg-white/8 border-white dark:border-white/12'
              }`}
            >
              <AlertTriangle
                className={`h-4 w-4 ${
                  safeStats.overdue > 0
                    ? 'text-[#E11D48] dark:text-[#FB7185]'
                    : 'text-[#111216]/45 dark:text-[#F5F6FA]/45'
                }`}
              />
            </span>
          </div>
          <div className="mt-4">
            <div
              className={`text-[34px] font-bold leading-[1.1] tracking-[-0.03em] tabular-nums ${
                safeStats.overdue > 0
                  ? 'text-[#E11D48] dark:text-[#FB7185]'
                  : 'text-[#111216] dark:text-[#F5F6FA]'
              }`}
            >
              {safeStats.overdue}
            </div>
            <div className="text-[13px] text-[#111216]/50 dark:text-[#F5F6FA]/50 mt-2 font-medium">
              {safeStats.overdue > 0 ? 'Requires immediate triage' : 'Zero overdue items'}
            </div>
          </div>
        </div>
      </div>

      {/* Distribution Breakdown Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        <div className="linear-panel p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[15.5px] font-semibold tracking-[-0.015em] text-[#111216] dark:text-[#F5F6FA] m-0">
              Issues by Status
            </h3>
            <span className="type-mono text-[12.5px] text-[#111216]/45 dark:text-[#F5F6FA]/45">
              {safeStats.total} total
            </span>
          </div>
          <div className="space-y-4">
            {statusRows.map((row) => {
              const pct =
                safeStats.total > 0 ? Math.round((row.count / safeStats.total) * 100) : 0;
              return (
                <div key={row.key}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <StatusIcon status={row.key} size={15} />
                      <span className="text-[14px] font-medium text-[#111216]/85 dark:text-[#F5F6FA]/85">
                        {row.label}
                      </span>
                    </div>
                    <span className="type-mono text-[13px] text-[#111216]/75 dark:text-[#F5F6FA]/80">
                      {row.count}{' '}
                      <span className="text-[#111216]/40 dark:text-[#F5F6FA]/40">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-[5px] w-full rounded-full bg-[#111216]/8 dark:bg-white/10 overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full transition-all duration-300 ${
                        STATUS_BAR_COLORS[row.key] || 'bg-[#6531F7]'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="linear-panel p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[15.5px] font-semibold tracking-[-0.015em] text-[#111216] dark:text-[#F5F6FA] m-0">
              Issues by Priority
            </h3>
            <span className="type-mono text-[12.5px] text-[#111216]/45 dark:text-[#F5F6FA]/45">
              {safeStats.byPriority?.URGENT || 0} urgent
            </span>
          </div>
          <div className="space-y-4">
            {priorityRows.map((row) => {
              const pct =
                safeStats.total > 0 ? Math.round((row.count / safeStats.total) * 100) : 0;
              return (
                <div key={row.key}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <PriorityIcon priority={row.key} size={15} />
                      <span className="text-[14px] font-medium text-[#111216]/85 dark:text-[#F5F6FA]/85">
                        {row.label}
                      </span>
                    </div>
                    <span className="type-mono text-[13px] text-[#111216]/75 dark:text-[#F5F6FA]/80">
                      {row.count}{' '}
                      <span className="text-[#111216]/40 dark:text-[#F5F6FA]/40">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-[5px] w-full rounded-full bg-[#111216]/8 dark:bg-white/10 overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full transition-all duration-300 ${
                        PRIORITY_BAR_COLORS[row.key] || 'bg-[#6531F7]'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI Daily Standup CTA Glass Panel */}
      <div className="linear-panel-elevated p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#6531F7] dark:text-[#A78BFA] mb-1.5">
            <Sparkles className="h-4 w-4" />
            <span>AI Daily Standup</span>
          </div>
          <h3 className="text-[17.5px] font-semibold tracking-[-0.02em] text-[#111216] dark:text-[#F5F6FA] m-0 mb-1">
            Synthesize the last 24 hours of workspace activity in one click.
          </h3>
          <p className="text-[14px] text-[#111216]/60 dark:text-[#F5F6FA]/60 leading-[1.55] m-0 max-w-2xl">
            Groups completed work, active issues, blockers, and overdue items directly from your
            live activity stream.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenStandup}
          className="btn-primary shrink-0"
        >
          <FileText className="h-4 w-4" />
          <span>Generate Standup</span>
        </button>
      </div>
    </div>
  );
}

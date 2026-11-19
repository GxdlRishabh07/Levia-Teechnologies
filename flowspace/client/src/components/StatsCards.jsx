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
  BACKLOG: 'bg-[#62666d]',
  IN_PROGRESS: 'bg-[#5e6ad2]',
  IN_REVIEW: 'bg-[#5e6ad2]',
  DONE: 'bg-[#27a644]',
};

const PRIORITY_BAR_COLORS = {
  URGENT: 'bg-[#e5484d]',
  HIGH: 'bg-[#d9a536]',
  MEDIUM: 'bg-[#8a8f98]',
  LOW: 'bg-[#62666d]',
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
            <div key={i} className="linear-panel p-6 h-[138px] flex flex-col justify-between">
              <div className="h-3.5 w-24 rounded-[4px] bg-[#18191a] animate-pulse" />
              <div className="space-y-2">
                <div className="h-8 w-16 rounded-[6px] bg-[#18191a] animate-pulse" />
                <div className="h-3 w-36 rounded-[4px] bg-[#141516] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top 4 Engineering Telemetry Panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="linear-panel p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-[#8a8f98]">Total Issues</span>
            <Layers className="h-4 w-4 text-[#62666d]" />
          </div>
          <div className="mt-4">
            <div className="text-[36px] font-bold leading-[1.1] tracking-[-1px] text-[#f7f8f8] tabular-nums">
              {safeStats.total}
            </div>
            <div className="text-[13.5px] text-[#62666d] mt-2">
              Across active workspace projects
            </div>
          </div>
        </div>

        <div className="linear-panel p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-[#8a8f98]">Completion Rate</span>
            <CheckCircle2 className="h-4 w-4 text-[#27a644]" />
          </div>
          <div className="mt-4">
            <div className="text-[36px] font-bold leading-[1.1] tracking-[-1px] text-[#f7f8f8] tabular-nums">
              {safeStats.completionPercentage}%
            </div>
            <div className="mt-3.5 h-[4px] w-full rounded-full bg-[#23252a] overflow-hidden">
              <div
                style={{ width: `${Math.min(100, safeStats.completionPercentage || 0)}%` }}
                className="h-full rounded-full bg-[#27a644] transition-all duration-300"
              />
            </div>
          </div>
        </div>

        <div className="linear-panel p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-[#8a8f98]">In Flight</span>
            <Clock className="h-4 w-4 text-[#5e6ad2]" />
          </div>
          <div className="mt-4">
            <div className="text-[36px] font-bold leading-[1.1] tracking-[-1px] text-[#f7f8f8] tabular-nums">
              {inFlightCount}
            </div>
            <div className="type-mono text-[13px] text-[#62666d] mt-2">
              {safeStats.byStatus?.IN_PROGRESS || 0} active · {safeStats.byStatus?.IN_REVIEW || 0}{' '}
              in review
            </div>
          </div>
        </div>

        <div className="linear-panel p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-[#8a8f98]">Overdue</span>
            <AlertTriangle
              className={`h-4 w-4 ${safeStats.overdue > 0 ? 'text-[#e5484d]' : 'text-[#62666d]'}`}
            />
          </div>
          <div className="mt-4">
            <div
              className={`text-[36px] font-bold leading-[1.1] tracking-[-1px] tabular-nums ${
                safeStats.overdue > 0 ? 'text-[#e5484d]' : 'text-[#f7f8f8]'
              }`}
            >
              {safeStats.overdue}
            </div>
            <div className="text-[13.5px] text-[#62666d] mt-2">
              {safeStats.overdue > 0 ? 'Requires immediate triage' : 'Zero overdue items'}
            </div>
          </div>
        </div>
      </div>

      {/* Distribution Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="linear-panel p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[16px] font-semibold tracking-[-0.1px] text-[#f7f8f8] m-0">
              Issues by Status
            </h3>
            <span className="type-mono text-[13px] text-[#62666d]">
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
                      <span className="text-[14.5px] font-medium text-[#d0d6e0]">{row.label}</span>
                    </div>
                    <span className="type-mono text-[13.5px] text-[#8a8f98]">
                      {row.count} <span className="text-[#62666d]">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-[4px] w-full rounded-full bg-[#23252a] overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full transition-all duration-300 ${
                        STATUS_BAR_COLORS[row.key] || 'bg-[#5e6ad2]'
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
            <h3 className="text-[16px] font-semibold tracking-[-0.1px] text-[#f7f8f8] m-0">
              Issues by Priority
            </h3>
            <span className="type-mono text-[13px] text-[#62666d]">
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
                      <span className="text-[14.5px] font-medium text-[#d0d6e0]">{row.label}</span>
                    </div>
                    <span className="type-mono text-[13.5px] text-[#8a8f98]">
                      {row.count} <span className="text-[#62666d]">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-[4px] w-full rounded-full bg-[#23252a] overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full transition-all duration-300 ${
                        PRIORITY_BAR_COLORS[row.key] || 'bg-[#8a8f98]'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI Daily Standup CTA Panel */}
      <div className="linear-panel-elevated p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#7a7fad] mb-1.5">
            <Sparkles className="h-4 w-4" />
            <span>AI Daily Standup</span>
          </div>
          <h3 className="text-[18px] font-semibold tracking-[-0.2px] text-[#f7f8f8] m-0 mb-1">
            Synthesize the last 24 hours of workspace activity in one click.
          </h3>
          <p className="text-[14.5px] text-[#8a8f98] leading-[1.55] m-0 max-w-2xl">
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

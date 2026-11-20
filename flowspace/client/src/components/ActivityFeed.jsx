import React from 'react';
import { Activity, Sparkles, Mic, ArrowRight } from 'lucide-react';
import { StatusIcon } from './LinearIcons';

function formatRelativeTime(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 45) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

function StatusChip({ status, emphasized = false }) {
  if (!status) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[6px] border px-2 py-0.5 type-mono text-[11.5px] leading-[1.25] align-middle ${
        emphasized
          ? 'bg-white border-[#6531F7]/25 text-[#111216] shadow-2xs'
          : 'bg-white/65 border-[#111216]/10 text-[#111216]/60'
      }`}
    >
      <StatusIcon status={status} size={12} className="shrink-0" />
      <span>{status}</span>
    </span>
  );
}

function describeActivity(act) {
  const meta = act.meta || {};
  const code = act.taskCode || meta.code || '';
  const title = act.taskTitle || meta.title || '';

  switch (act.type) {
    case 'task.created':
      return (
        <>
          created{' '}
          {code && <span className="type-mono text-[12.5px] font-semibold text-[#111216] mx-1">{code}</span>}
          {title && <span className="text-[#111216]/85">"{title}"</span>}
        </>
      );
    case 'tasks.bulk_created':
      return (
        <>
          generated{' '}
          <span className="font-semibold text-[#111216]">
            {meta.count || (meta.codes ? meta.codes.length : 'multiple')} issues
          </span>{' '}
          via Command Bar
          {Array.isArray(meta.codes) && meta.codes.length > 0 && (
            <span className="type-mono text-[12.5px] font-medium text-[#111216]/75 ml-1">
              ({meta.codes.join(', ')})
            </span>
          )}
        </>
      );
    case 'task.status_changed': {
      const fromStatus = meta.fromStatus || meta.from;
      const toStatus = meta.toStatus || meta.to;
      return (
        <>
          moved{' '}
          {code && <span className="type-mono text-[12.5px] font-semibold text-[#111216] mx-1">{code}</span>}
          {title && <span className="text-[#111216]/85 mr-1.5">"{title}"</span>}
          <span className="inline-flex items-center gap-1.5 align-middle">
            <StatusChip status={fromStatus} />
            <ArrowRight className="h-3.5 w-3.5 text-[#111216]/40 shrink-0" />
            <StatusChip status={toStatus} emphasized />
          </span>
        </>
      );
    }
    case 'task.updated':
      return (
        <>
          updated{' '}
          {code && <span className="type-mono text-[12.5px] font-semibold text-[#111216] mx-1">{code}</span>}
          {title && <span className="text-[#111216]/85">"{title}"</span>}
        </>
      );
    case 'task.deleted':
      return (
        <>
          deleted{' '}
          {code && <span className="type-mono text-[12.5px] font-semibold text-[#111216] mx-1">{code}</span>}
          {title && <span className="text-[#111216]/55">"{title}"</span>}
        </>
      );
    case 'member.added':
      return (
        <>
          added{' '}
          <span className="font-semibold text-[#111216]">{meta.memberName || meta.email}</span> to the
          workspace as{' '}
          <span className="type-mono text-[12px] text-[#6531F7]">{meta.role || 'MEMBER'}</span>
        </>
      );
    case 'project.created':
      return (
        <>
          created project <span className="font-semibold text-[#111216]">{meta.name}</span>{' '}
          {meta.key && <span className="type-mono text-[12.5px] font-medium text-[#111216]/75">({meta.key})</span>}
        </>
      );
    case 'standup.generated':
      return <>generated an AI Daily Standup report</>;
    default:
      return (
        <>
          performed <span className="type-mono text-[12.5px] font-medium text-[#111216]">{act.type}</span>
        </>
      );
  }
}

export default function ActivityFeed({
  activities = [],
  hasMore = false,
  isLoading = false,
  isFetchingMore = false,
  onLoadMore,
  compact = false,
}) {
  return (
    <div className="linear-panel p-6">
      <div className="flex items-center justify-between pb-4 mb-1 border-b border-[#111216]/8">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#6531F7]" />
          <h3 className="text-[15.5px] font-semibold tracking-[-0.015em] text-[#111216] m-0">
            Activity
          </h3>
        </div>
        <span className="type-mono text-[12.5px] text-[#111216]/45">Live audit stream</span>
      </div>

      {isLoading ? (
        <div className="divide-y divide-[#111216]/6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="h-7 w-7 rounded-full bg-white/80 animate-pulse shrink-0" />
                <div className="h-3.5 w-2/3 rounded-[6px] bg-white/75 animate-pulse" />
              </div>
              <div className="h-3 w-12 rounded-[6px] bg-white/60 animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-[14px] text-[#111216]/50 m-0">
            No workspace activity recorded yet.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#111216]/6">
          {(compact ? activities.slice(0, 8) : activities).map((act) => {
            const source = act.meta?.source;
            return (
              <div
                key={act.id}
                className="py-3.5 flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#262626] text-[11.5px] font-semibold text-white mt-0.5 shadow-2xs">
                    {(act.actorName || 'U').charAt(0).toUpperCase()}
                  </span>
                  <div className="text-[14px] text-[#111216]/65 leading-[1.55] min-w-0">
                    <span className="font-semibold text-[#111216]">
                      {act.actorName || 'Teammate'}
                    </span>{' '}
                    {describeActivity(act)}
                    {source === 'AI_TEXT' && (
                      <span className="ml-1.5 inline-flex items-center gap-1 rounded-[6px] border border-[#6531F7]/20 bg-[#6531F7]/8 px-2 py-0.5 text-[11.5px] font-semibold leading-[1.2] text-[#6531F7] align-middle">
                        <Sparkles className="h-3 w-3" />
                        <span>AI</span>
                      </span>
                    )}
                    {source === 'AI_VOICE' && (
                      <span className="ml-1.5 inline-flex items-center gap-1 rounded-[6px] border border-[#6531F7]/20 bg-[#6531F7]/8 px-2 py-0.5 text-[11.5px] font-semibold leading-[1.2] text-[#6531F7] align-middle">
                        <Mic className="h-3 w-3" />
                        <span>Voice</span>
                      </span>
                    )}
                  </div>
                </div>

                <span className="type-mono text-[12px] text-[#111216]/45 whitespace-nowrap shrink-0 mt-0.5">
                  {formatRelativeTime(act.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {!compact && hasMore && (
        <div className="mt-2 pt-4 border-t border-[#111216]/8 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isFetchingMore}
            className="btn-secondary !py-2 !px-4 !text-[13.5px]"
          >
            {isFetchingMore ? 'Loading older events...' : 'Load older activity'}
          </button>
        </div>
      )}
    </div>
  );
}

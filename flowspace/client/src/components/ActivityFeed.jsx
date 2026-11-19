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
      className={`inline-flex items-center gap-1 rounded-[4px] border px-2 py-0.5 type-mono text-[12px] leading-[1.25] align-middle ${
        emphasized
          ? 'bg-[#18191a] border-[#34343a] text-[#d0d6e0]'
          : 'bg-[#141516] border-[#23252a] text-[#8a8f98]'
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
          {code && <span className="type-mono text-[13px] font-medium text-[#d0d6e0] mx-1">{code}</span>}
          {title && <span className="text-[#d0d6e0]">"{title}"</span>}
        </>
      );
    case 'tasks.bulk_created':
      return (
        <>
          generated{' '}
          <span className="font-semibold text-[#d0d6e0]">
            {meta.count || (meta.codes ? meta.codes.length : 'multiple')} issues
          </span>{' '}
          via Command Bar
          {Array.isArray(meta.codes) && meta.codes.length > 0 && (
            <span className="type-mono text-[13px] font-medium text-[#d0d6e0] ml-1">
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
          {code && <span className="type-mono text-[13px] font-medium text-[#d0d6e0] mx-1">{code}</span>}
          {title && <span className="text-[#d0d6e0] mr-1.5">"{title}"</span>}
          <span className="inline-flex items-center gap-1.5 align-middle">
            <StatusChip status={fromStatus} />
            <ArrowRight className="h-3.5 w-3.5 text-[#62666d] shrink-0" />
            <StatusChip status={toStatus} emphasized />
          </span>
        </>
      );
    }
    case 'task.updated':
      return (
        <>
          updated{' '}
          {code && <span className="type-mono text-[13px] font-medium text-[#d0d6e0] mx-1">{code}</span>}
          {title && <span className="text-[#d0d6e0]">"{title}"</span>}
        </>
      );
    case 'task.deleted':
      return (
        <>
          deleted{' '}
          {code && <span className="type-mono text-[13px] font-medium text-[#d0d6e0] mx-1">{code}</span>}
          {title && <span className="text-[#8a8f98]">"{title}"</span>}
        </>
      );
    case 'member.added':
      return (
        <>
          added{' '}
          <span className="font-semibold text-[#f7f8f8]">{meta.memberName || meta.email}</span> to the
          workspace as{' '}
          <span className="type-mono text-[12.5px] text-[#d0d6e0]">{meta.role || 'MEMBER'}</span>
        </>
      );
    case 'project.created':
      return (
        <>
          created project <span className="font-semibold text-[#f7f8f8]">{meta.name}</span>{' '}
          {meta.key && <span className="type-mono text-[13px] font-medium text-[#d0d6e0]">({meta.key})</span>}
        </>
      );
    case 'standup.generated':
      return <>generated an AI Daily Standup report</>;
    default:
      return (
        <>
          performed <span className="type-mono text-[13px] font-medium text-[#d0d6e0]">{act.type}</span>
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
      <div className="flex items-center justify-between pb-4 mb-1 border-b border-[#23252a]">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#8a8f98]" />
          <h3 className="text-[16px] font-semibold tracking-[-0.1px] text-[#f7f8f8] m-0">
            Activity
          </h3>
        </div>
        <span className="type-mono text-[13px] text-[#62666d]">Live audit stream</span>
      </div>

      {isLoading ? (
        <div className="divide-y divide-[#23252a]">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="h-6 w-6 rounded-full bg-[#18191a] animate-pulse shrink-0" />
                <div className="h-3.5 w-2/3 rounded-[4px] bg-[#18191a] animate-pulse" />
              </div>
              <div className="h-3 w-12 rounded-[4px] bg-[#141516] animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-[14px] text-[#62666d] m-0">
            No workspace activity recorded yet.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#23252a]">
          {(compact ? activities.slice(0, 8) : activities).map((act) => {
            const source = act.meta?.source;
            return (
              <div
                key={act.id}
                className="py-3.5 flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#18191a] border border-[#34343a] text-[12px] font-semibold text-[#d0d6e0] mt-0.5">
                    {(act.actorName || 'U').charAt(0).toUpperCase()}
                  </span>
                  <div className="text-[14.5px] text-[#8a8f98] leading-[1.6] min-w-0">
                    <span className="font-semibold text-[#f7f8f8]">
                      {act.actorName || 'Teammate'}
                    </span>{' '}
                    {describeActivity(act)}
                    {source === 'AI_TEXT' && (
                      <span className="ml-1.5 inline-flex items-center gap-1 rounded-[5px] border border-[#7a7fad]/25 bg-[#7a7fad]/10 px-2 py-0.5 text-[12px] font-medium leading-[1.2] text-[#7a7fad] align-middle">
                        <Sparkles className="h-3 w-3" />
                        <span>AI</span>
                      </span>
                    )}
                    {source === 'AI_VOICE' && (
                      <span className="ml-1.5 inline-flex items-center gap-1 rounded-[5px] border border-[#7a7fad]/25 bg-[#7a7fad]/10 px-2 py-0.5 text-[12px] font-medium leading-[1.2] text-[#7a7fad] align-middle">
                        <Mic className="h-3 w-3" />
                        <span>Voice</span>
                      </span>
                    )}
                  </div>
                </div>

                <span className="type-mono text-[13px] text-[#62666d] whitespace-nowrap shrink-0 mt-0.5">
                  {formatRelativeTime(act.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {!compact && hasMore && (
        <div className="mt-2 pt-4 border-t border-[#23252a] flex justify-center">
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

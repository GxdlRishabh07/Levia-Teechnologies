import React, { useState, useEffect, useCallback } from 'react';
import { X, Sparkles, Copy, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client';

export default function StandupModal({ isOpen, workspaceId, workspaceName, onClose }) {
  const [standup, setStandup] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateStandup = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    try {
      const res = await api.post(`/workspaces/${workspaceId}/ai/standup`, {});
      setStandup(res?.standup || null);
    } catch (err) {
      toast.error(err.message || 'Failed to generate AI standup');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (isOpen && workspaceId) {
      generateStandup();
    }
  }, [isOpen, workspaceId, generateStandup]);

  if (!isOpen) return null;

  const handleCopyMarkdown = () => {
    if (!standup) return;
    const lines = [
      `# Daily Standup — ${workspaceName || 'FlowSpace'}`,
      `Generated: ${new Date(standup.generatedAt || Date.now()).toLocaleString()}`,
      '',
      `## Executive Summary`,
      standup.summary || 'No summary available.',
      '',
      `## Completed (Last 24h)`,
      ...(standup.done?.length ? standup.done.map((i) => `- ${i}`) : ['- None']),
      '',
      `## In Progress`,
      ...(standup.inProgress?.length ? standup.inProgress.map((i) => `- ${i}`) : ['- None']),
      '',
      `## Blockers & Risks`,
      ...(standup.blockers?.length ? standup.blockers.map((i) => `- ${i}`) : ['- None reported']),
      '',
      `## Overdue`,
      ...(standup.overdue?.length ? standup.overdue.map((i) => `- ${i}`) : ['- None']),
    ];

    navigator.clipboard
      .writeText(lines.join('\n'))
      .then(() => toast.success('Standup copied as Markdown'))
      .catch(() => toast.error('Could not copy to clipboard'));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#11121c]/20 dark:bg-[#020308]/65 backdrop-blur-[8px] p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl max-h-[90dvh] flex flex-col linear-modal overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[#111216]/8 dark:border-white/10 bg-white/55 dark:bg-white/[0.04] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="h-3.5 w-3.5 text-[#6531F7] dark:text-[#A78BFA]" />
              <span className="type-eyebrow !text-[#6531F7] dark:!text-[#A78BFA]">
                AI Daily Standup · Last 24h Activity
              </span>
            </div>
            <h3 className="text-[16px] sm:text-[17.5px] font-semibold tracking-[-0.02em] text-[#111216] dark:text-[#F5F6FA] m-0 truncate">
              {workspaceName || 'Workspace'} Standup Digest
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close standup digest"
            className="btn-tertiary !p-1.5 shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 p-4 sm:p-5 overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="py-14 text-center space-y-2.5">
              <RefreshCw className="h-5 w-5 text-[#6531F7] dark:text-[#A78BFA] animate-spin mx-auto" />
              <p className="text-[15px] font-medium text-[#111216] dark:text-[#F5F6FA] m-0">
                Synthesizing team activity &amp; issue transitions...
              </p>
              <p className="text-[13.5px] text-[#111216]/55 dark:text-[#F5F6FA]/55 m-0">
                Analyzing completed items, active sprint work, and overdue issues
              </p>
            </div>
          ) : !standup ? (
            <div className="py-12 text-center">
              <p className="text-[14.5px] text-[#111216]/55 dark:text-[#F5F6FA]/55 m-0">
                No standup data available.
              </p>
            </div>
          ) : (
            <>
              {/* Top Executive Summary */}
              <div className="rounded-[14px] bg-white/75 dark:bg-white/[0.06] border border-white dark:border-white/12 p-4 shadow-2xs">
                <div className="type-eyebrow mb-1.5">Executive Summary</div>
                <p className="text-[15px] leading-[1.6] text-[#111216] dark:text-[#F5F6FA] m-0">
                  {standup.summary}
                </p>
              </div>

              {/* Crisp 2x2 Digest Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Completed · 24h */}
                <div className="rounded-[14px] bg-white/75 dark:bg-white/[0.06] border border-white dark:border-white/12 p-4 shadow-2xs">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#059669] shrink-0" />
                      <span className="text-[14px] font-semibold text-[#111216] dark:text-[#F5F6FA]">
                        Completed · 24h
                      </span>
                    </div>
                    <span className="type-mono !text-[12.5px] text-[#111216]/50 dark:text-[#F5F6FA]/50">
                      {standup.done?.length || 0}
                    </span>
                  </div>
                  {standup.done?.length ? (
                    <ul className="space-y-1.5 m-0 pl-4 text-[13.5px] leading-[1.55] text-[#111216]/80 dark:text-[#F5F6FA]/80 list-disc marker:text-[#059669]">
                      {standup.done.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13px] text-[#111216]/45 dark:text-[#F5F6FA]/45 m-0">
                      No tasks moved to Done in the last 24h.
                    </p>
                  )}
                </div>

                {/* In Progress */}
                <div className="rounded-[14px] bg-white/75 dark:bg-white/[0.06] border border-white dark:border-white/12 p-4 shadow-2xs">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#D97706] shrink-0" />
                      <span className="text-[14px] font-semibold text-[#111216] dark:text-[#F5F6FA]">
                        In Progress
                      </span>
                    </div>
                    <span className="type-mono !text-[12.5px] text-[#111216]/50 dark:text-[#F5F6FA]/50">
                      {standup.inProgress?.length || 0}
                    </span>
                  </div>
                  {standup.inProgress?.length ? (
                    <ul className="space-y-1.5 m-0 pl-4 text-[13.5px] leading-[1.55] text-[#111216]/80 dark:text-[#F5F6FA]/80 list-disc marker:text-[#D97706]">
                      {standup.inProgress.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13px] text-[#111216]/45 dark:text-[#F5F6FA]/45 m-0">
                      No tasks currently in flight.
                    </p>
                  )}
                </div>

                {/* Blockers & Risks */}
                <div className="rounded-[14px] bg-white/75 dark:bg-white/[0.06] border border-white dark:border-white/12 p-4 shadow-2xs">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#E11D48] shrink-0" />
                      <span className="text-[14px] font-semibold text-[#111216] dark:text-[#F5F6FA]">
                        Blockers &amp; Risks
                      </span>
                    </div>
                    <span className="type-mono !text-[12.5px] text-[#111216]/50 dark:text-[#F5F6FA]/50">
                      {standup.blockers?.length || 0}
                    </span>
                  </div>
                  {standup.blockers?.length ? (
                    <ul className="space-y-1.5 m-0 pl-4 text-[13.5px] leading-[1.55] text-[#111216]/80 dark:text-[#F5F6FA]/80 list-disc marker:text-[#E11D48]">
                      {standup.blockers.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13px] text-[#111216]/45 dark:text-[#F5F6FA]/45 m-0">
                      No critical blockers detected.
                    </p>
                  )}
                </div>

                {/* Overdue */}
                <div className="rounded-[14px] bg-white/75 dark:bg-white/[0.06] border border-white dark:border-white/12 p-4 shadow-2xs">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#111216]/40 dark:bg-white/40 shrink-0" />
                      <span className="text-[14px] font-semibold text-[#111216] dark:text-[#F5F6FA]">
                        Overdue
                      </span>
                    </div>
                    <span className="type-mono !text-[12.5px] text-[#111216]/50 dark:text-[#F5F6FA]/50">
                      {standup.overdue?.length || 0}
                    </span>
                  </div>
                  {standup.overdue?.length ? (
                    <ul className="space-y-1.5 m-0 pl-4 text-[13.5px] leading-[1.55] text-[#111216]/80 dark:text-[#F5F6FA]/80 list-disc marker:text-[#111216]/40 dark:marker:text-white/40">
                      {standup.overdue.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13px] text-[#111216]/45 dark:text-[#F5F6FA]/45 m-0">
                      Zero overdue tasks.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-[#111216]/8 dark:border-white/10 bg-white/55 dark:bg-white/[0.04] px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={generateStandup}
            disabled={isLoading}
            className="btn-secondary"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Regenerate</span>
          </button>

          <button
            type="button"
            onClick={handleCopyMarkdown}
            disabled={!standup || isLoading}
            className="btn-primary"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Copy Markdown</span>
          </button>
        </div>
      </div>
    </div>
  );
}

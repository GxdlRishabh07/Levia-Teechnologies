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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-[4px] p-4">
      <div className="w-full max-w-2xl linear-modal overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#23252a] bg-[#0f1011] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="h-3.5 w-3.5 text-[#5e6ad2]" />
              <span className="type-eyebrow">AI Daily Standup · Last 24h Activity</span>
            </div>
            <h3 className="text-[18px] font-semibold tracking-[-0.3px] text-[#f7f8f8] m-0 truncate">
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
        <div className="p-5 max-h-[72vh] overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="py-14 text-center space-y-2.5">
              <RefreshCw className="h-5 w-5 text-[#5e6ad2] animate-spin mx-auto" />
              <p className="text-[15px] font-medium text-[#f7f8f8] m-0">
                Synthesizing team activity &amp; issue transitions...
              </p>
              <p className="text-[13.5px] text-[#8a8f98] m-0">
                Analyzing completed items, active sprint work, and overdue issues
              </p>
            </div>
          ) : !standup ? (
            <div className="py-12 text-center">
              <p className="text-[14.5px] text-[#8a8f98] m-0">No standup data available.</p>
            </div>
          ) : (
            <>
              {/* Top Executive Summary */}
              <div className="rounded-[12px] bg-[#141516] border border-[#23252a] p-4">
                <div className="type-eyebrow mb-1.5">Executive Summary</div>
                <p className="text-[15.5px] leading-[1.6] text-[#f7f8f8] m-0">
                  {standup.summary}
                </p>
              </div>

              {/* Crisp 2x2 Digest Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Completed · 24h */}
                <div className="rounded-[12px] bg-[#141516] border border-[#23252a] p-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#27a644] shrink-0" />
                      <span className="text-[14.5px] font-semibold text-[#f7f8f8]">
                        Completed · 24h
                      </span>
                    </div>
                    <span className="type-mono !text-[13px] text-[#62666d]">
                      {standup.done?.length || 0}
                    </span>
                  </div>
                  {standup.done?.length ? (
                    <ul className="space-y-1.5 m-0 pl-4 text-[14px] leading-[1.6] text-[#d0d6e0] list-disc marker:text-[#3e3e44]">
                      {standup.done.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13.5px] text-[#62666d] m-0">
                      No tasks moved to Done in the last 24h.
                    </p>
                  )}
                </div>

                {/* In Progress */}
                <div className="rounded-[12px] bg-[#141516] border border-[#23252a] p-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#d9a536] shrink-0" />
                      <span className="text-[14.5px] font-semibold text-[#f7f8f8]">
                        In Progress
                      </span>
                    </div>
                    <span className="type-mono !text-[13px] text-[#62666d]">
                      {standup.inProgress?.length || 0}
                    </span>
                  </div>
                  {standup.inProgress?.length ? (
                    <ul className="space-y-1.5 m-0 pl-4 text-[14px] leading-[1.6] text-[#d0d6e0] list-disc marker:text-[#3e3e44]">
                      {standup.inProgress.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13.5px] text-[#62666d] m-0">
                      No tasks currently in flight.
                    </p>
                  )}
                </div>

                {/* Blockers & Risks */}
                <div className="rounded-[12px] bg-[#141516] border border-[#23252a] p-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#e5484d] shrink-0" />
                      <span className="text-[14.5px] font-semibold text-[#f7f8f8]">
                        Blockers &amp; Risks
                      </span>
                    </div>
                    <span className="type-mono !text-[13px] text-[#62666d]">
                      {standup.blockers?.length || 0}
                    </span>
                  </div>
                  {standup.blockers?.length ? (
                    <ul className="space-y-1.5 m-0 pl-4 text-[14px] leading-[1.6] text-[#d0d6e0] list-disc marker:text-[#3e3e44]">
                      {standup.blockers.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13.5px] text-[#62666d] m-0">
                      No critical blockers detected.
                    </p>
                  )}
                </div>

                {/* Overdue */}
                <div className="rounded-[12px] bg-[#141516] border border-[#23252a] p-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#8a8f98] shrink-0" />
                      <span className="text-[14.5px] font-semibold text-[#f7f8f8]">
                        Overdue
                      </span>
                    </div>
                    <span className="type-mono !text-[13px] text-[#62666d]">
                      {standup.overdue?.length || 0}
                    </span>
                  </div>
                  {standup.overdue?.length ? (
                    <ul className="space-y-1.5 m-0 pl-4 text-[14px] leading-[1.6] text-[#d0d6e0] list-disc marker:text-[#3e3e44]">
                      {standup.overdue.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13.5px] text-[#62666d] m-0">
                      Zero overdue tasks.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#23252a] bg-[#0f1011] px-5 py-3.5 flex items-center justify-between">
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

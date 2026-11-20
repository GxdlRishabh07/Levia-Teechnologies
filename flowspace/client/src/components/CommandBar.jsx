import React, { useState, useCallback } from 'react';
import { Terminal, Mic, Square, Loader2, ArrowRight, CornerDownLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import { useVoiceCapture } from '../hooks/useVoiceCapture';

const EXAMPLE_PROMPTS = [
  'Create 2 high priority backend tasks for Stripe webhook retry and Redis rate limiting assigned to Priya',
  'Move FLOW-5 to In Review',
  'Show only urgent tasks',
  'Rahul ke liye kal tak login validation bug fix task banao high priority',
];

function formatMonoTimer(totalSeconds = 0) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = String(Math.floor(safe / 60)).padStart(2, '0');
  const secs = String(safe % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

export default function CommandBar({
  workspaceId,
  onPreviewReady,
}) {
  const [commandText, setCommandText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  const runParse = useCallback(
    async (textToParse, source = 'AI_TEXT') => {
      const trimmed = (textToParse || '').trim();
      if (!trimmed || !workspaceId) return;

      setIsParsing(true);
      try {
        const result = await api.post(`/workspaces/${workspaceId}/ai/parse`, {
          text: trimmed,
          source,
        });
        if (result?.preview) {
          onPreviewReady({
            preview: result.preview,
            source: result.source || source,
            latencyMs: result.latencyMs,
            model: result.model,
            rawText: trimmed,
          });
        }
      } catch (err) {
        toast.error(err.message || 'AI could not parse command');
      } finally {
        setIsParsing(false);
      }
    },
    [workspaceId, onPreviewReady]
  );

  const handleVoiceTranscribed = useCallback(
    (transcript, transcribeLatencyMs) => {
      setCommandText(transcript);
      toast.success(`Heard: "${transcript}" (${transcribeLatencyMs || 0}ms)`);
      runParse(transcript, 'AI_VOICE');
    },
    [runParse]
  );

  const {
    isRecording,
    isTranscribing,
    levels,
    durationSec,
    toggleRecording,
    stopRecording,
  } = useVoiceCapture({
    workspaceId,
    onTranscribed: handleVoiceTranscribed,
    enableShortcut: true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!commandText.trim() || isParsing || isTranscribing) return;
    runParse(commandText, 'AI_TEXT');
  };

  return (
    <section className="mb-4.5">
      {/* Frosted Glass AI Command Capsule */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 linear-panel-elevated !rounded-[16px] px-4 py-2.5 sm:py-3 transition-all focus-within:border-[#6531F7]/50 dark:focus-within:border-[#855BFF]/60 focus-within:ring-4 focus-within:ring-[#6531F7]/12 dark:focus-within:ring-[#7242FF]/20"
      >
        {/* Left: Quiet Command Icon + Input */}
        <div className="flex flex-1 items-center gap-3 min-w-0">
          <Terminal
            className={`h-4 w-4 shrink-0 transition-colors ${
              isParsing
                ? 'text-[#6531F7] dark:text-[#A78BFA]'
                : 'text-[#111216]/45 dark:text-[#F5F6FA]/45'
            }`}
          />
          <input
            type="text"
            value={commandText}
            onChange={(e) => setCommandText(e.target.value)}
            disabled={isParsing || isTranscribing}
            placeholder='Command workspace in English or Hinglish — "Move FLOW-5 to In Review" or "Create 2 backend tasks for Priya"'
            className="w-full min-w-0 bg-transparent text-[14.5px] text-[#111216] dark:text-[#F5F6FA] placeholder-[#111216]/40 dark:placeholder-[#F5F6FA]/35 outline-none disabled:opacity-50"
          />
        </div>

        {/* Right: Mic Action, Compile CTA */}
        <div className="flex items-center justify-end gap-2 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={toggleRecording}
            disabled={isParsing || isTranscribing}
            title="Click to record voice or hold Right Alt (Windows) / Right Option (Mac)"
            className={
              isRecording
                ? 'btn-secondary flex-1 sm:flex-none !bg-white dark:!bg-[#7242FF]/20 !border-[#6531F7] dark:!border-[#855BFF] !py-2 sm:!py-1.5 !px-3 !text-[13.5px]'
                : 'btn-secondary flex-1 sm:flex-none !py-2 sm:!py-1.5 !px-3 !text-[13.5px]'
            }
          >
            {isTranscribing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#6531F7] dark:text-[#A78BFA]" />
                <span className="text-[#111216] dark:text-[#F5F6FA]">Transcribing</span>
              </>
            ) : isRecording ? (
              <>
                <Square className="h-3 w-3 fill-[#6531F7] dark:fill-[#A78BFA] text-[#6531F7] dark:text-[#A78BFA]" />
                <div className="flex items-center gap-[2px] h-3.5 px-0.5">
                  {levels.map((lvl, idx) => (
                    <span
                      key={idx}
                      style={{ height: `${Math.max(3, Math.round(lvl * 14))}px` }}
                      className="w-[2px] rounded-full bg-[#6531F7] dark:bg-[#A78BFA] transition-all duration-75"
                    />
                  ))}
                </div>
                <span className="type-mono !text-[12.5px] text-[#111216] dark:text-[#F5F6FA]">
                  {formatMonoTimer(durationSec)}
                </span>
              </>
            ) : (
              <>
                <Mic className="h-3.5 w-3.5 text-[#111216]/60 dark:text-[#F5F6FA]/65" />
                <span className="text-[#111216] dark:text-[#F5F6FA]">Voice</span>
              </>
            )}
          </button>

          <button
            type="submit"
            disabled={!commandText.trim() || isParsing || isTranscribing}
            className="btn-primary flex-1 sm:flex-none !py-2 !px-4 !text-[13.5px]"
          >
            {isParsing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Compiling</span>
              </>
            ) : (
              <>
                <span>Compile</span>
                <CornerDownLeft className="h-4 w-4 opacity-85" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Single-Line Frosted Quick Prompt Chips */}
      <div className="mt-2.5 flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
        <span className="type-eyebrow !text-[11.5px] text-[#111216]/45 dark:text-[#F5F6FA]/45 shrink-0 mr-1">
          Try
        </span>
        {EXAMPLE_PROMPTS.map((sample, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setCommandText(sample);
              runParse(sample, 'AI_TEXT');
            }}
            className="linear-tag !rounded-full !bg-white/65 dark:!bg-white/[0.06] !border-white/90 dark:!border-white/12 !text-[#111216]/70 dark:!text-[#F5F6FA]/75 hover:!bg-white dark:hover:!bg-white/12 hover:!text-[#111216] dark:hover:!text-[#F5F6FA] !py-1 !px-3 !text-[12.5px] shadow-[0_2px_6px_rgba(31,28,70,0.03)] dark:shadow-none transition-all shrink-0 max-w-[250px] sm:max-w-[320px] cursor-pointer"
          >
            <span className="truncate">{sample}</span>
            <ArrowRight className="h-3 w-3 text-[#6531F7] dark:text-[#A78BFA] shrink-0" />
          </button>
        ))}
      </div>

      {/* Floating Glass Voice HUD Capsule when Holding Right Alt / Right Option or Recording */}
      {isRecording && (
        <div className="fixed bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 sm:gap-3.5 linear-modal !rounded-full px-3.5 sm:px-5 py-2 sm:py-2.5 max-w-[calc(100vw-24px)]">
          <span className="h-2.5 w-2.5 rounded-full bg-[#6531F7] dark:bg-[#A78BFA] animate-pulse shrink-0 shadow-[0_0_8px_rgba(101,49,247,0.6)]" />
          <span className="text-[13px] sm:text-[14px] font-semibold text-[#111216] dark:text-[#F5F6FA] whitespace-nowrap">
            <span className="sm:hidden">Listening</span>
            <span className="hidden sm:inline">Listening (English / Hinglish)</span>
          </span>
          <div className="flex items-center gap-[3px] h-5 px-1">
            {levels.map((lvl, idx) => (
              <span
                key={idx}
                style={{ height: `${Math.max(4, Math.round(lvl * 20))}px` }}
                className="w-[3px] rounded-full bg-[#6531F7] dark:bg-[#A78BFA] transition-all duration-75"
              />
            ))}
          </div>
          <span className="type-mono !text-[12.5px] sm:!text-[13px] text-[#111216]/75 dark:text-[#F5F6FA]/80">
            {formatMonoTimer(durationSec)}
          </span>
          <button
            type="button"
            onClick={stopRecording}
            className="btn-primary !rounded-full !py-1.5 !px-3.5 !text-[13px] shrink-0"
          >
            Done
          </button>
        </div>
      )}
    </section>
  );
}

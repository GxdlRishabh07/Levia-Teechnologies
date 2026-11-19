import React, { useState, useEffect, useCallback } from 'react';
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
  inputRef,
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

  // Global Cmd+K / Ctrl+K shortcut to focus the Command Bar input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef?.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputRef]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!commandText.trim() || isParsing || isTranscribing) return;
    runParse(commandText, 'AI_TEXT');
  };

  return (
    <section className="mb-5">
      {/* Linear Command Palette Bar */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-[10px] bg-[#0f1011] border border-[#23252a] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors focus-within:border-[#5e69d1] focus-within:ring-2 focus-within:ring-[#5e69d1]/30"
      >
        {/* Left: Quiet Command Icon + Input */}
        <div className="flex flex-1 items-center gap-2.5 min-w-0">
          <Terminal
            className={`h-4 w-4 shrink-0 transition-colors ${
              isParsing ? 'text-[#5e6ad2]' : 'text-[#62666d]'
            }`}
          />
          <input
            ref={inputRef}
            type="text"
            value={commandText}
            onChange={(e) => setCommandText(e.target.value)}
            disabled={isParsing || isTranscribing}
            placeholder='Command workspace in English or Hinglish — "Move FLOW-5 to In Review" or "Create 2 backend tasks for Priya"'
            className="w-full min-w-0 bg-transparent text-[15.5px] text-[#f7f8f8] placeholder-[#62666d] outline-none disabled:opacity-50"
          />
        </div>

        {/* Right: Shortcut Badge, Mic Action, Compile CTA */}
        <div className="flex items-center justify-end gap-2 shrink-0">
          <kbd className="linear-kbd hidden md:inline-flex">⌘K</kbd>

          <button
            type="button"
            onClick={toggleRecording}
            disabled={isParsing || isTranscribing}
            title="Click to record voice or hold Right Option (AltRight)"
            className={
              isRecording
                ? 'btn-secondary !bg-[#141516] !border-[#5e6ad2] !py-1.5 !px-3 !text-[13.5px]'
                : 'btn-secondary !py-1.5 !px-3 !text-[13.5px]'
            }
          >
            {isTranscribing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#5e6ad2]" />
                <span className="text-[#d0d6e0]">Transcribing</span>
              </>
            ) : isRecording ? (
              <>
                <Square className="h-3 w-3 fill-[#5e6ad2] text-[#5e6ad2]" />
                <div className="flex items-center gap-[2px] h-3.5 px-0.5">
                  {levels.map((lvl, idx) => (
                    <span
                      key={idx}
                      style={{ height: `${Math.max(3, Math.round(lvl * 14))}px` }}
                      className="w-[2px] rounded-full bg-[#5e6ad2] transition-all duration-75"
                    />
                  ))}
                </div>
                <span className="type-mono !text-[13px] text-[#f7f8f8]">
                  {formatMonoTimer(durationSec)}
                </span>
              </>
            ) : (
              <>
                <Mic className="h-3.5 w-3.5 text-[#8a8f98]" />
                <span className="text-[#d0d6e0]">Voice</span>
              </>
            )}
          </button>

          <button
            type="submit"
            disabled={!commandText.trim() || isParsing || isTranscribing}
            className="btn-primary !py-2 !px-4 !text-[14px]"
          >
            {isParsing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Compiling</span>
              </>
            ) : (
              <>
                <span>Compile</span>
                <CornerDownLeft className="h-4 w-4 opacity-80" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Single-Line Quick Prompt Chips */}
      <div className="mt-2.5 flex items-center gap-2 overflow-x-auto pb-0.5">
        <span className="type-eyebrow !text-[12px] text-[#62666d] shrink-0 mr-1">
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
            className="linear-tag !bg-[#141516] !border-[#23252a] !text-[#8a8f98] hover:!border-[#34343a] hover:!bg-[#18191a] hover:!text-[#f7f8f8] !py-1 !px-2.5 !text-[12.5px] transition-colors shrink-0 max-w-[320px] cursor-pointer"
          >
            <span className="truncate">{sample}</span>
            <ArrowRight className="h-3 w-3 text-[#62666d] shrink-0" />
          </button>
        ))}
      </div>

      {/* Floating Voice HUD Capsule when Holding Right-Option or Recording */}
      {isRecording && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3.5 rounded-[12px] bg-[#141516] border border-[#34343a] px-4 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <span className="h-2 w-2 rounded-full bg-[#5e6ad2] animate-pulse shrink-0" />
          <span className="text-[14px] font-medium text-[#f7f8f8] whitespace-nowrap">
            Listening (English / Hinglish)
          </span>
          <div className="flex items-center gap-[3px] h-5 px-1">
            {levels.map((lvl, idx) => (
              <span
                key={idx}
                style={{ height: `${Math.max(4, Math.round(lvl * 20))}px` }}
                className="w-[3px] rounded-full bg-[#5e6ad2] transition-all duration-75"
              />
            ))}
          </div>
          <span className="type-mono !text-[13.5px] text-[#d0d6e0]">
            {formatMonoTimer(durationSec)}
          </span>
          <button
            type="button"
            onClick={stopRecording}
            className="btn-primary !py-1.5 !px-3 !text-[13px]"
          >
            Done
          </button>
        </div>
      )}
    </section>
  );
}

import { useState, useRef, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api/client';

const MAX_RECORDING_MS = 58000;

export function useVoiceCapture({ workspaceId, onTranscribed, enableShortcut = true }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [levels, setLevels] = useState([0.18, 0.25, 0.2, 0.25, 0.18]);
  const [durationSec, setDurationSec] = useState(0);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const rafRef = useRef(null);
  const chunksRef = useRef([]);
  const timeoutRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const isHoldingRightOptionRef = useRef(false);

  const cleanupAudio = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setLevels([0.18, 0.25, 0.2, 0.25, 0.18]);
    setDurationSec(0);
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (isRecording || isTranscribing || !workspaceId) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      mediaRecorderRef.current = recorder;

      // Web Audio API RMS analyzer for 5-bar waveform
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(dataArray);
          const bars = [2, 5, 8, 12, 16].map((idx) => {
            const val = dataArray[idx] || 0;
            return Math.min(1, Math.max(0.15, val / 210));
          });
          setLevels(bars);
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const chunks = chunksRef.current;
        cleanupAudio();

        if (!chunks.length) return;
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 600) {
          return;
        }

        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append('audio', blob, 'voice-command.webm');
          const res = await api.upload(`/workspaces/${workspaceId}/ai/transcribe`, formData);
          if (res?.text && res.text.trim()) {
            onTranscribed?.(res.text.trim(), res.latencyMs);
          } else {
            toast.error('Could not hear clear speech. Please try again.');
          }
        } catch (err) {
          toast.error(err.message || 'Voice transcription failed');
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start(150);
      setIsRecording(true);
      setDurationSec(0);

      timerIntervalRef.current = setInterval(() => {
        setDurationSec((s) => s + 1);
      }, 1000);

      timeoutRef.current = setTimeout(() => {
        stopRecording();
      }, MAX_RECORDING_MS);
    } catch (err) {
      cleanupAudio();
      toast.error(
        err.name === 'NotAllowedError'
          ? 'Microphone permission denied. Please allow microphone access.'
          : 'Could not access microphone.'
      );
    }
  }, [isRecording, isTranscribing, workspaceId, cleanupAudio, onTranscribed, stopRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Optional hold-Right-Option (AltRight) push-to-talk shortcut
  useEffect(() => {
    if (!enableShortcut || !workspaceId) return undefined;

    const handleKeyDown = (e) => {
      if (e.code === 'AltRight' && !e.repeat && !isHoldingRightOptionRef.current) {
        isHoldingRightOptionRef.current = true;
        startRecording();
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'AltRight' && isHoldingRightOptionRef.current) {
        isHoldingRightOptionRef.current = false;
        stopRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enableShortcut, workspaceId, startRecording, stopRecording]);

  useEffect(() => {
    return () => cleanupAudio();
  }, [cleanupAudio]);

  return {
    isRecording,
    isTranscribing,
    levels,
    durationSec,
    startRecording,
    stopRecording,
    toggleRecording,
  };
}

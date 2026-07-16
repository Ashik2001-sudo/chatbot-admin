"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Trash2 } from "lucide-react";

interface VoiceRecorderBarProps {
  onFinish: (file: File) => void;
  onCancel: () => void;
}

const BAR_COUNT = 32;

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Replaces the composer row while a voice note is being recorded: pulsing
 * red dot, timer, and a live microphone level waveform. Bars are animated
 * imperatively (no re-renders) via requestAnimationFrame.
 */
export function VoiceRecorderBar({ onFinish, onCancel }: VoiceRecorderBarProps) {
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState(false);
  const barsRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef(0);
  const chunksRef = useRef<Blob[]>([]);
  const actionRef = useRef<"cancel" | "finish">("cancel");
  const onFinishRef = useRef(onFinish);
  const onCancelRef = useRef(onCancel);
  onFinishRef.current = onFinish;
  onCancelRef.current = onCancel;

  useEffect(() => {
    let disposed = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (disposed) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";
        const recorder = new MediaRecorder(stream, { mimeType });
        recorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (e.data.size) chunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          if (actionRef.current === "finish" && chunksRef.current.length) {
            const blob = new Blob(chunksRef.current, { type: mimeType });
            onFinishRef.current(
              new File([blob], `voice-note-${Date.now()}.webm`, { type: mimeType })
            );
          } else {
            onCancelRef.current();
          }
        };
        recorder.start(250);

        // Live level meter driving the bar heights.
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const levels: number[] = Array(BAR_COUNT).fill(3);

        const tick = () => {
          analyser.getByteTimeDomainData(data);
          let peak = 0;
          for (const v of data) peak = Math.max(peak, Math.abs(v - 128) / 128);
          levels.push(Math.max(3, Math.round(peak * 34)));
          levels.shift();
          const bars = barsRef.current?.children;
          if (bars) {
            for (let i = 0; i < bars.length; i++) {
              (bars[i] as HTMLElement).style.height = `${levels[i]}px`;
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        if (!disposed) setError(true);
      }
    }
    void start();

    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      disposed = true;
      clearInterval(timer);
      cancelAnimationFrame(rafRef.current);
      void audioCtxRef.current?.close().catch(() => undefined);
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function stop(action: "cancel" | "finish") {
    actionRef.current = action;
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.stop();
    } else {
      onCancelRef.current();
    }
  }

  if (error) {
    return (
      <div className="anim-modal-pop flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3">
        <p className="flex-1 text-sm text-destructive">
          Microphone unavailable — check browser permissions.
        </p>
        <button
          type="button"
          onClick={() => onCancelRef.current()}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="anim-modal-pop flex items-center gap-2">
      <button
        type="button"
        title="Discard recording"
        onClick={() => stop("cancel")}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-5 w-5" />
      </button>

      <div className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-2xl border border-border bg-muted/40 px-4">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        </span>
        <span className="w-9 shrink-0 text-sm tabular-nums text-muted-foreground">
          {formatTime(seconds)}
        </span>
        <div
          ref={barsRef}
          className="flex h-9 min-w-0 flex-1 items-center justify-end gap-[3px] overflow-hidden"
        >
          {Array.from({ length: BAR_COUNT }).map((_, i) => (
            <span
              key={i}
              className="w-[3px] shrink-0 rounded-full bg-primary/80 transition-[height] duration-100"
              style={{ height: 3 }}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        title="Finish recording"
        onClick={() => stop("finish")}
        className="gradient-accent flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-lg shadow-primary/25 transition-transform hover:scale-105 active:scale-95"
      >
        <Check className="h-5 w-5" />
      </button>
    </div>
  );
}

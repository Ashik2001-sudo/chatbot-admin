"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AudioMessageProps {
  src: string;
  /** Renders on the gradient (outbound) bubble when true. */
  onGradient?: boolean;
  onLoad?: () => void;
}

const SPEEDS = [1, 1.5, 2];
const BAR_COUNT = 40;

function formatClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Deterministic pseudo-waveform used when the real audio can't be decoded (e.g. CORS). */
function pseudoPeaks(seed: string): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const peaks: number[] = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    const v = ((h >>> 0) % 1000) / 1000;
    peaks.push(0.25 + v * 0.75);
  }
  return peaks;
}

function useWaveform(src: string) {
  const [peaks, setPeaks] = useState<number[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPeaks(null);

    const decode = async () => {
      const AudioCtx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      try {
        const res = await fetch(src);
        const buf = await res.arrayBuffer();
        const audioBuf = await ctx.decodeAudioData(buf);
        if (cancelled) return;

        const data = audioBuf.getChannelData(0);
        const block = Math.max(1, Math.floor(data.length / BAR_COUNT));
        const raw: number[] = [];
        for (let i = 0; i < BAR_COUNT; i++) {
          let sum = 0;
          let count = 0;
          for (let j = i * block; j < (i + 1) * block; j += 32) {
            sum += Math.abs(data[j] ?? 0);
            count++;
          }
          raw.push(count ? sum / count : 0);
        }
        const max = Math.max(...raw, 0.001);
        setPeaks(raw.map((v) => Math.max(0.12, v / max)));
      } catch {
        if (!cancelled) setPeaks(pseudoPeaks(src));
      } finally {
        ctx.close().catch(() => {});
      }
    };

    decode();
    return () => {
      cancelled = true;
    };
  }, [src]);

  return peaks;
}

export function AudioMessage({ src, onGradient, onLoad }: AudioMessageProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(0);
  const peaks = useWaveform(src);

  const skeletonPeaks = useMemo(() => pseudoPeaks("skeleton"), []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = SPEEDS[speedIdx];
  }, [speedIdx]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  };

  const seek = (clientX: number) => {
    const audio = audioRef.current;
    const bar = barRef.current;
    if (!audio || !bar || !Number.isFinite(duration) || duration === 0) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  };

  const progress = duration > 0 ? currentTime / duration : 0;
  const bars = peaks ?? skeletonPeaks;
  const loadingWave = peaks === null;

  return (
    <div
      className={cn(
        "flex w-72 max-w-full items-center gap-3 rounded-2xl px-3 py-2.5",
        onGradient ? "bg-white/15" : "bg-black/5 dark:bg-white/10"
      )}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d)) setDuration(d);
          onLoad?.();
        }}
        onDurationChange={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d)) setDuration(d);
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(0);
        }}
      />

      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? "Pause" : "Play"}
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-sm transition-all active:scale-90",
          onGradient
            ? "bg-white text-indigo-600 hover:bg-white/90"
            : "gradient-accent text-white hover:opacity-90"
        )}
      >
        {playing ? <Pause className="h-4.5 w-4.5" /> : <Play className="ml-0.5 h-4.5 w-4.5" />}
      </button>

      <div className="min-w-0 flex-1">
        <div
          ref={barRef}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          tabIndex={0}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            seek(e.clientX);
          }}
          onPointerMove={(e) => {
            if (e.buttons === 1) seek(e.clientX);
          }}
          className={cn(
            "flex h-9 cursor-pointer items-center gap-[2px]",
            loadingWave && "animate-pulse"
          )}
        >
          {bars.map((peak, i) => {
            const played = i / BAR_COUNT <= progress && progress > 0;
            return (
              <span
                key={i}
                className={cn(
                  "min-h-[4px] flex-1 rounded-full transition-colors duration-150",
                  onGradient
                    ? played
                      ? "bg-white"
                      : "bg-white/35"
                    : played
                      ? "bg-primary"
                      : "bg-foreground/25"
                )}
                style={{ height: `${peak * 100}%` }}
              />
            );
          })}
        </div>

        <div className="mt-1 flex items-center justify-between">
          <span
            className={cn(
              "text-[11px] font-medium tabular-nums",
              onGradient ? "text-white/85" : "text-muted-foreground"
            )}
          >
            {playing || currentTime > 0
              ? `${formatClock(currentTime)} / ${formatClock(duration)}`
              : formatClock(duration)}
          </span>
          <button
            type="button"
            onClick={() => setSpeedIdx((i) => (i + 1) % SPEEDS.length)}
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums transition-colors",
              onGradient
                ? "bg-white/20 text-white hover:bg-white/30"
                : "bg-foreground/10 text-foreground/70 hover:bg-foreground/20"
            )}
          >
            {SPEEDS[speedIdx]}x
          </button>
        </div>
      </div>
    </div>
  );
}

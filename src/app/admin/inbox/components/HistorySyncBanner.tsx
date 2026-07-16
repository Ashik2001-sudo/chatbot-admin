"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, History } from "lucide-react";
import { useRealtimeSocket } from "@/contexts/RealtimeSocketContext";
import { cn } from "@/lib/utils";

interface HistoryProgress {
  channelId: string;
  progress: number | null;
  imported: number;
  done: boolean;
}

/**
 * Slim banner shown while WhatsApp chat history is being imported from the
 * phone (after linking a device). Driven by `history:progress` socket events.
 */
export function HistorySyncBanner({ onDone }: { onDone?: () => void }) {
  const { socket } = useRealtimeSocket();
  const [state, setState] = useState<HistoryProgress | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!socket) return;
    const onProgress = (payload: HistoryProgress) => {
      setState(payload);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (payload.done) {
        onDoneRef.current?.();
        hideTimer.current = setTimeout(() => setState(null), 5000);
      } else {
        // Chunks can stall; drop the banner if nothing arrives for a while.
        hideTimer.current = setTimeout(() => {
          onDoneRef.current?.();
          setState(null);
        }, 90_000);
      }
    };
    socket.on("history:progress", onProgress);
    return () => {
      socket.off("history:progress", onProgress);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [socket]);

  if (!state) return null;

  const percent = state.done ? 100 : state.progress;

  return (
    <div className="border-b border-border bg-card px-4 py-2">
      <div className="flex items-center gap-3">
        {state.done ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
        ) : (
          <History className="h-4 w-4 shrink-0 animate-pulse text-primary" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-xs font-medium">
              {state.done
                ? `History sync complete — ${state.imported} messages imported`
                : `Syncing chat history from phone… ${state.imported} messages so far`}
            </p>
            {percent !== null ? (
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {Math.min(100, Math.round(percent))}%
              </span>
            ) : null}
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-accent">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                state.done ? "bg-emerald-500" : "gradient-accent"
              )}
              style={{
                width: percent !== null ? `${Math.min(100, percent)}%` : "40%",
                ...(percent === null ? { animation: "pulse 1.5s ease-in-out infinite" } : {}),
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

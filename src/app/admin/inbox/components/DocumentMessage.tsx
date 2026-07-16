"use client";

import { Download, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface DocumentMessageProps {
  src: string;
  filename: string;
  /** Renders on the gradient (outbound) bubble when true. */
  onGradient?: boolean;
}

const EXT_STYLES: Record<string, { badge: string; tile: string }> = {
  pdf: { badge: "PDF", tile: "bg-red-500" },
  doc: { badge: "DOC", tile: "bg-blue-500" },
  docx: { badge: "DOC", tile: "bg-blue-500" },
  xls: { badge: "XLS", tile: "bg-emerald-500" },
  xlsx: { badge: "XLS", tile: "bg-emerald-500" },
  csv: { badge: "CSV", tile: "bg-emerald-600" },
  ppt: { badge: "PPT", tile: "bg-orange-500" },
  pptx: { badge: "PPT", tile: "bg-orange-500" },
  zip: { badge: "ZIP", tile: "bg-amber-500" },
  rar: { badge: "RAR", tile: "bg-amber-600" },
  txt: { badge: "TXT", tile: "bg-slate-500" },
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentMessage({ src, filename, onGradient }: DocumentMessageProps) {
  const [size, setSize] = useState<string | null>(null);

  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const style = EXT_STYLES[ext] ?? {
    badge: ext ? ext.toUpperCase().slice(0, 4) : "FILE",
    tile: "gradient-accent",
  };

  useEffect(() => {
    let cancelled = false;
    fetch(src, { method: "HEAD" })
      .then((res) => {
        const len = res.headers.get("content-length");
        if (!cancelled && len) setSize(formatBytes(parseInt(len, 10)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "group flex w-64 max-w-full items-center gap-3 rounded-2xl p-3 transition-colors",
        onGradient
          ? "bg-white/15 hover:bg-white/25"
          : "bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
      )}
    >
      <span
        className={cn(
          "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm transition-transform group-hover:scale-105",
          style.tile
        )}
      >
        <FileText className="h-5 w-5" />
        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded bg-black/70 px-1 py-px text-[8px] font-bold tracking-wide text-white">
          {style.badge}
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-sm font-medium",
            onGradient ? "text-white" : "text-foreground"
          )}
        >
          {filename}
        </span>
        <span
          className={cn(
            "block text-[11px]",
            onGradient ? "text-white/70" : "text-muted-foreground"
          )}
        >
          {[style.badge, size].filter(Boolean).join(" · ")}
        </span>
      </span>

      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all group-hover:scale-110",
          onGradient
            ? "bg-white/20 text-white group-hover:bg-white/30"
            : "bg-foreground/10 text-foreground/70 group-hover:bg-foreground/20"
        )}
      >
        <Download className="h-4 w-4" />
      </span>
    </a>
  );
}

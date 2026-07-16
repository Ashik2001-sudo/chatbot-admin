"use client";

import { Download, Loader2, X, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface LightboxMedia {
  src: string;
  type: "image" | "video";
  caption?: string;
}

interface MediaLightboxProps {
  media: LightboxMedia | null;
  onClose: () => void;
}

const EXIT_MS = 220;

export function MediaLightbox({ media, onClose }: MediaLightboxProps) {
  const [closing, setClosing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");

  const requestClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, EXIT_MS);
  }, [onClose]);

  useEffect(() => {
    if (!media) return;
    setLoaded(media.type === "video");
    setZoomed(false);
    setOrigin("50% 50%");

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [media, requestClose]);

  if (!media) return null;

  const toggleZoom = (e: React.MouseEvent<HTMLElement>) => {
    if (media.type !== "image") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
    setZoomed((z) => !z);
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md",
        closing ? "lightbox-overlay-out" : "lightbox-overlay-in"
      )}
      onClick={requestClose}
    >
      {/* Top bar */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4",
          closing ? "lightbox-bar-out" : "lightbox-bar-in"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="max-w-[50vw] truncate rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white/90 backdrop-blur-sm">
          {media.caption || decodeURIComponent(media.src.split("/").pop() ?? "Media")}
        </span>
        <div className="flex items-center gap-2">
          {media.type === "image" ? (
            <button
              type="button"
              onClick={() => {
                setOrigin("50% 50%");
                setZoomed((z) => !z);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:scale-105 hover:bg-white/20 active:scale-95"
              aria-label={zoomed ? "Zoom out" : "Zoom in"}
            >
              {zoomed ? <ZoomOut className="h-4.5 w-4.5" /> : <ZoomIn className="h-4.5 w-4.5" />}
            </button>
          ) : null}
          <a
            href={media.src}
            download
            target="_blank"
            rel="noreferrer"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:scale-105 hover:bg-white/20 active:scale-95"
            aria-label="Download"
          >
            <Download className="h-4.5 w-4.5" />
          </a>
          <button
            type="button"
            onClick={requestClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:rotate-90 hover:scale-105 hover:bg-white/20 active:scale-95"
            aria-label="Close"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* Loading spinner */}
      {!loaded ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/60" />
        </div>
      ) : null}

      {/* Media */}
      <div
        className={cn(
          "flex max-h-[92vh] max-w-[94vw] flex-col items-center gap-3",
          closing ? "lightbox-content-out" : "lightbox-content-in"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            "overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10",
            media.type === "image" && (zoomed ? "cursor-zoom-out" : "cursor-zoom-in")
          )}
        >
          {media.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.src}
              alt={media.caption || "Media"}
              onLoad={() => setLoaded(true)}
              onClick={toggleZoom}
              style={{ transformOrigin: origin }}
              className={cn(
                "max-h-[82vh] max-w-full object-contain transition-transform duration-300 ease-out",
                zoomed && "scale-[2.2]",
                !loaded && "opacity-0"
              )}
              draggable={false}
            />
          ) : (
            <video
              src={media.src}
              controls
              autoPlay
              className="max-h-[82vh] max-w-full"
            />
          )}
        </div>
      </div>
    </div>
  );
}

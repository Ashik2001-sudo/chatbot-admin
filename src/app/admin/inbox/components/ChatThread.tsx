"use client";

import { format } from "date-fns";
import {
  Send,
  CheckCheck,
  Plus,
  X,
  ExternalLink,
  FileText,
  Loader2,
  ImageIcon,
  Film,
  Music,
  Mic,
  Play,
  Lock,
  Unplug,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChannelDot } from "./ChannelBadge";
import { AudioMessage } from "./AudioMessage";
import { VoiceRecorderBar } from "./VoiceRecorderBar";
import { DocumentMessage } from "./DocumentMessage";
import { MediaLightbox, type LightboxMedia } from "./MediaLightbox";
import type { Conversation } from "../hooks/useConversations";
import type { Message } from "../hooks/useMessages";
import { cn } from "@/lib/utils";
import { config, getAuthToken } from "@/lib/config";

export interface PendingAttachment {
  url: string;
  contentType: "image" | "audio" | "video" | "document";
  filename: string;
  mimetype: string;
}

interface ChatThreadProps {
  conversation: Conversation | null;
  messages: Message[];
  onSend: (body: string, media?: PendingAttachment) => Promise<void>;
  onBack?: () => void;
  loading?: boolean;
}

function mediaSrc(url?: string) {
  if (!url) return undefined;
  return url.startsWith("http") ? url : `${config.API_URL}${url}`;
}

function contentTypeFromMime(mime: string): PendingAttachment["contentType"] {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}

const URL_PATTERN = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;

function toHref(url: string) {
  return url.startsWith("www.") ? `https://${url}` : url;
}

/** Renders message text with URLs as clickable links plus an "Open" chip. */
function MessageBody({
  body,
  outbound,
  className,
}: {
  body: string;
  outbound?: boolean;
  className?: string;
}) {
  const parts = body.split(URL_PATTERN);
  const links = body.match(URL_PATTERN) ?? [];
  const firstLink = links[0];
  // A global regex keeps lastIndex state across .test() calls, so match the
  // split parts with a fresh anchored check instead.
  const isLink = (part: string) => /^(https?:\/\/|www\.)/i.test(part);

  return (
    <div className={className}>
      <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
        {parts.map((part, i) =>
          isLink(part) ? (
            <a
              key={i}
              href={toHref(part)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "underline underline-offset-2 transition-opacity hover:opacity-80",
                outbound ? "text-white" : "text-primary"
              )}
            >
              {part}
            </a>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </p>
      {firstLink ? (
        <a
          href={toHref(firstLink)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "mt-2 flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
            outbound
              ? "bg-white/15 text-white hover:bg-white/25"
              : "bg-primary/10 text-primary hover:bg-primary/20"
          )}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open link in new tab
        </a>
      ) : null}
    </div>
  );
}

function MessageMedia({
  msg,
  outbound,
  onLoad,
  onOpen,
}: {
  msg: Message;
  outbound?: boolean;
  onLoad?: () => void;
  onOpen?: (media: LightboxMedia) => void;
}) {
  const src = mediaSrc(msg.mediaUrl);
  if (!src) return null;

  if (msg.contentType === "image") {
    return (
      <button
        type="button"
        onClick={() => onOpen?.({ src, type: "image", caption: msg.body })}
        className="block w-full cursor-zoom-in"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={msg.body || "Image"}
          className="max-h-72 w-full rounded-xl object-cover transition-opacity hover:opacity-90"
          onLoad={onLoad}
        />
      </button>
    );
  }

  if (msg.contentType === "video") {
    return (
      <button
        type="button"
        onClick={() => onOpen?.({ src, type: "video", caption: msg.body })}
        className="group relative block w-full"
      >
        <video
          preload="metadata"
          className="max-h-72 w-full rounded-xl"
          onLoadedMetadata={onLoad}
          muted
          playsInline
        >
          <source src={src} />
        </video>
        <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/25 transition-colors group-hover:bg-black/40">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform group-hover:scale-110">
            <Play className="ml-0.5 h-5 w-5 text-gray-900" />
          </span>
        </span>
      </button>
    );
  }

  if (msg.contentType === "audio") {
    return <AudioMessage src={src} onGradient={outbound} onLoad={onLoad} />;
  }

  const filename = msg.body || decodeURIComponent(src.split("/").pop() ?? "file");
  return <DocumentMessage src={src} filename={filename} onGradient={outbound} />;
}

const attachmentIcon = {
  image: ImageIcon,
  video: Film,
  audio: Music,
  document: FileText,
};

const attachOptions = [
  {
    label: "Photo",
    icon: ImageIcon,
    accept: "image/*",
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
  },
  {
    label: "Video",
    icon: Film,
    accept: "video/*",
    color: "text-sky-400",
    bg: "bg-sky-500/15",
  },
  {
    label: "Audio",
    icon: Music,
    accept: "audio/*",
    color: "text-violet-400",
    bg: "bg-violet-500/15",
  },
  {
    label: "Document",
    icon: FileText,
    accept: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar",
    color: "text-amber-400",
    bg: "bg-amber-500/15",
  },
] as const;

export function ChatThread({ conversation, messages, onSend, onBack, loading }: ChatThreadProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachment, setAttachment] = useState<PendingAttachment | null>(null);
  const [attachMenu, setAttachMenu] = useState(false);
  const [recording, setRecording] = useState(false);
  const [lightbox, setLightbox] = useState<LightboxMedia | null>(null);
  const [disconnectedWarning, setDisconnectedWarning] = useState(false);
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // useLayoutEffect so the jump happens before paint (no visible flicker),
  // and media onLoad re-scrolls since images/videos change the height later.
  useLayoutEffect(() => {
    scrollToBottom();
  }, [messages, loading, conversation?.id, scrollToBottom]);

  useEffect(() => {
    setAttachment(null);
    setText("");
    setAttachMenu(false);
    setRecording(false);
  }, [conversation?.id]);

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Select a conversation to start chatting
      </div>
    );
  }

  const name = conversation.contact?.name || conversation.contact?.phone || "Unknown";

  async function handleFileSelect(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${config.API_URL}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAuthToken()}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const json = (await res.json()) as {
        data: { url: string; filename: string; mimetype: string };
      };
      setAttachment({
        url: json.data.url,
        filename: file.name,
        mimetype: json.data.mimetype,
        contentType: contentTypeFromMime(json.data.mimetype),
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSend() {
    if (!text.trim() && !attachment) return;
    // Messages on a disconnected channel would silently fail to deliver.
    if (conversation?.channelConn?.status && conversation.channelConn.status !== "connected") {
      setDisconnectedWarning(true);
      return;
    }
    setSending(true);
    try {
      await onSend(text.trim(), attachment ?? undefined);
      setText("");
      setAttachment(null);
    } finally {
      setSending(false);
    }
  }

  function pickAttachment(accept: string) {
    setAttachMenu(false);
    const input = fileInputRef.current;
    if (!input) return;
    input.accept = accept;
    input.click();
  }

  const AttachmentIcon = attachment ? attachmentIcon[attachment.contentType] : Plus;
  const canSend = Boolean(text.trim() || attachment);

  return (
    <div className="flex h-full flex-col">
      <div className="relative z-10 flex items-center justify-between border-b border-border bg-card/60 px-4 py-2 shadow-[0_4px_12px_-6px_rgba(0,0,0,0.22)] backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          {onBack ? (
            <Button variant="ghost" size="sm" onClick={onBack} className="lg:hidden">
              Back
            </Button>
          ) : null}
          <div className="relative shrink-0">
            <Avatar className="h-9 w-9">
              {conversation.contact?.avatarUrl ? (
                <AvatarImage src={conversation.contact.avatarUrl} alt={name} />
              ) : null}
              <AvatarFallback className="text-xs">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <ChannelDot
              type={conversation.channelType}
              className="absolute -bottom-0.5 -right-0.5"
            />
          </div>
          <p className="truncate text-sm font-semibold">{name}</p>
        </div>
        <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-xs capitalize text-accent-foreground">
          {conversation.status}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto overflow-x-hidden p-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={cn("flex animate-pulse", i % 2 ? "justify-end" : "justify-start")}>
                <div className="h-12 w-48 rounded-2xl bg-accent" />
              </div>
            ))}
          </div>
        ) : (
          messages.map((msg) => {
            const outbound = msg.direction === "outbound";
            const hasMedia = Boolean(msg.mediaUrl);
            return (
              <div key={msg.id} className={cn("flex", outbound ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "min-w-0 max-w-[85%] rounded-2xl text-sm sm:max-w-[75%]",
                    hasMedia ? "overflow-hidden p-1.5" : "px-4 py-2",
                    outbound ? "gradient-accent text-white" : "bg-muted text-foreground"
                  )}
                >
                  {hasMedia ? (
                    <MessageMedia
                      msg={msg}
                      outbound={outbound}
                      onLoad={scrollToBottom}
                      onOpen={setLightbox}
                    />
                  ) : null}
                  {msg.body && !(hasMedia && msg.contentType === "document") ? (
                    <MessageBody
                      body={msg.body}
                      outbound={outbound}
                      className={hasMedia ? "px-2 pt-1.5" : undefined}
                    />
                  ) : null}
                  <div
                    className={cn(
                      "mt-1 flex items-center justify-end gap-1 text-xs opacity-70",
                      hasMedia && "px-2 pb-1"
                    )}
                  >
                    <span>{format(new Date(msg.createdAt), "HH:mm")}</span>
                    {outbound ? <CheckCheck className="h-3 w-3" /> : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {conversation.readOnly ? (
        <div className="border-t border-border bg-card/50 px-4 py-5 backdrop-blur-xl">
          <div className="flex items-center justify-center gap-2.5 rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
            <Lock className="h-4 w-4 shrink-0" />
            <span>Only admins can send messages in this group</span>
          </div>
        </div>
      ) : (
      <div className="border-t border-border bg-card/50 p-4 backdrop-blur-xl">
        {attachment ? (
          <div className="anim-modal-pop mb-3 flex items-center gap-3 rounded-2xl border border-border bg-accent/40 p-2 pr-3">
            {attachment.contentType === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaSrc(attachment.url)}
                alt={attachment.filename}
                className="h-12 w-12 rounded-xl object-cover"
              />
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent">
                <AttachmentIcon className="h-5 w-5 text-accent-foreground" />
              </span>
            )}
            {attachment.contentType === "audio" ? (
              <div className="min-w-0 flex-1">
                <audio controls src={mediaSrc(attachment.url)} className="h-10 w-full" />
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{attachment.filename}</p>
                <p className="text-xs capitalize text-muted-foreground">{attachment.contentType}</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
        />

        {recording ? (
          <VoiceRecorderBar
            onFinish={(file) => {
              setRecording(false);
              void handleFileSelect(file);
            }}
            onCancel={() => setRecording(false)}
          />
        ) : (
          <div className="flex items-end gap-2">
            <div className="relative shrink-0">
              {attachMenu ? (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setAttachMenu(false)} />
                  <div className="anim-modal-pop absolute bottom-full left-0 z-40 mb-2 w-44 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-2xl">
                    {attachOptions.map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => pickAttachment(opt.accept)}
                        className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors hover:bg-accent"
                      >
                        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", opt.bg)}>
                          <opt.icon className={cn("h-4 w-4", opt.color)} />
                        </span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
              <button
                type="button"
                title="Attach"
                disabled={uploading || sending}
                onClick={() => setAttachMenu((v) => !v)}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-accent hover:text-foreground disabled:opacity-50",
                  attachMenu && "rotate-45 bg-accent text-foreground"
                )}
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Plus className="h-5 w-5 transition-transform" />
                )}
              </button>
            </div>

            <div className="flex min-h-[44px] flex-1 items-end rounded-2xl border border-border bg-muted/40 px-2 transition-colors focus-within:border-primary/50">
              <Textarea
                placeholder="Type a message..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                className="max-h-36 min-h-[42px] flex-1 resize-none border-0 bg-transparent px-2 py-2.5 focus-visible:ring-0"
              />
            </div>

            {canSend ? (
              <button
                type="button"
                title="Send"
                onClick={handleSend}
                disabled={sending || uploading}
                className="gradient-accent anim-modal-pop flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-lg shadow-primary/25 transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            ) : (
              <button
                type="button"
                title="Record voice note"
                disabled={uploading || sending}
                onClick={() => setRecording(true)}
                className="anim-modal-pop flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-accent hover:text-foreground disabled:opacity-50"
              >
                <Mic className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
      </div>
      )}

      <MediaLightbox media={lightbox} onClose={() => setLightbox(null)} />

      {disconnectedWarning ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setDisconnectedWarning(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10">
              <Unplug className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="text-base font-semibold">Channel disconnected</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              This conversation&apos;s channel is not connected, so the message
              can&apos;t be delivered. Reconnect it from the Channels page first.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Button variant="outline" onClick={() => setDisconnectedWarning(false)}>
                Close
              </Button>
              <Button onClick={() => router.push("/admin/channels")}>
                Go to Channels
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { format, isToday } from "date-fns";
import {
  Search,
  Inbox,
  Camera,
  MessageCircle,
  Share2,
  MessagesSquare,
  BellDot,
  MailOpen,
  UserRound,
  UserRoundX,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Conversation } from "../hooks/useConversations";

export type Tab = "all" | "unread" | "open" | "mine" | "unassigned";

const tabOptions: Array<{
  id: Tab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "all", label: "All", icon: MessagesSquare },
  { id: "unread", label: "Unread", icon: BellDot },
  { id: "open", label: "Open", icon: MailOpen },
  { id: "mine", label: "Mine", icon: UserRound },
  { id: "unassigned", label: "Unassigned", icon: UserRoundX },
];

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  loading?: boolean;
  tab: Tab;
  onTabChange: (tab: Tab) => void;
}

const channelIcon: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  WHATSAPP_BAILEYS: { icon: MessageCircle, className: "bg-[#25d366]" },
  WHATSAPP_CLOUD: { icon: MessageCircle, className: "bg-[#25d366]" },
  FACEBOOK_PAGE: { icon: Share2, className: "bg-[#1877f2]" },
  INSTAGRAM: { icon: Camera, className: "bg-[#e1306c]" },
};

function formatTime(date: string) {
  const d = new Date(date);
  return isToday(d) ? format(d, "HH:mm") : format(d, "dd MMM");
}

const mediaPreview: Record<string, string> = {
  image: "📷 Photo",
  video: "🎬 Video",
  audio: "🎙️ Voice message",
  document: "📄 Document",
};

function previewText(conv: Conversation) {
  const last = conv.messages?.[0];
  if (!last) return "No messages";
  if (last.body) return last.body;
  return mediaPreview[last.contentType ?? ""] ?? "Message";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightText({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim();
  if (!trimmed) return <>{text}</>;

  const parts = text.split(new RegExp(`(${escapeRegExp(trimmed)})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark key={i} className="rounded bg-primary/20 px-0.5 text-inherit">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  search,
  onSearchChange,
  loading,
  tab,
  onTabChange,
}: ConversationListProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 p-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Inbox</h2>
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {conversations.length}
            </span>
          </div>
          <div className="flex items-center gap-0.5 rounded-full bg-accent/40 p-0.5">
            {tabOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                title={opt.label}
                onClick={() => onTabChange(opt.id)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full transition-all",
                  tab === opt.id
                    ? "gradient-accent text-white shadow-md shadow-primary/25"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <opt.icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search conversations & messages..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="rounded-xl border-transparent bg-accent/50 pl-9 focus-visible:border-border"
          />
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        {loading ? (
          <div className="space-y-2 px-2 pt-1">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex animate-pulse items-center gap-3 p-2">
                <div className="h-11 w-11 shrink-0 rounded-full bg-accent" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 rounded bg-accent" />
                  <div className="h-2 w-1/3 rounded bg-accent" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {search.trim() ? "No results found" : "No conversations yet"}
            </p>
            {search.trim() ? (
              <p className="text-xs text-muted-foreground/70">
                Try a different name, phone number, or message text
              </p>
            ) : null}
          </div>
        ) : (
          conversations.map((conv) => {
            const name = conv.contact?.name || conv.contact?.phone || "Unknown";
            const preview = previewText(conv);
            const channel = channelIcon[conv.channelType] ?? channelIcon.WHATSAPP_BAILEYS;
            const ChannelIcon = channel.icon;
            const selected = selectedId === conv.id;
            const unread = conv.unreadCount > 0;

            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => onSelect(conv.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors",
                  selected ? "bg-accent" : "hover:bg-accent/50"
                )}
              >
                <div className="relative shrink-0">
                  <Avatar className="h-11 w-11">
                    {conv.contact?.avatarUrl ? (
                      <AvatarImage src={conv.contact.avatarUrl} alt={name} />
                    ) : null}
                    <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 border-card p-0.5 text-white",
                      channel.className
                    )}
                  >
                    <ChannelIcon className="h-2.5 w-2.5" />
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("truncate text-sm", unread ? "font-semibold" : "font-medium")}>
                      <HighlightText text={name} query={search} />
                    </p>
                    <span
                      className={cn(
                        "shrink-0 text-xs",
                        unread ? "font-medium text-primary" : "text-muted-foreground"
                      )}
                    >
                      {formatTime(conv.lastMessageAt)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        "truncate text-xs",
                        unread ? "font-medium text-foreground" : "text-muted-foreground"
                      )}
                    >
                      <HighlightText text={preview} query={search} />
                    </p>
                    {unread ? (
                      <span className="gradient-accent flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-white">
                        {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

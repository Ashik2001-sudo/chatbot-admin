"use client";

import { useMemo, useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ConversationList } from "./components/ConversationList";
import { ChatThread } from "./components/ChatThread";
import { ContactPanel } from "./components/ContactPanel";
import { HistorySyncBanner } from "./components/HistorySyncBanner";
import { useConversations } from "./hooks/useConversations";
import { useMessages } from "./hooks/useMessages";
import { cn } from "@/lib/utils";
import type { Tab } from "./components/ConversationList";

export default function InboxPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");

  const filter = useMemo(
    () => ({
      status: tab === "open" ? "open" : undefined,
      mine: tab === "mine",
      search: debouncedSearch || undefined,
    }),
    [tab, debouncedSearch]
  );

  const { conversations, loading, reload, markRead } = useConversations(filter, selectedId);
  const selected = conversations.find((c) => c.id === selectedId) ?? null;
  const { messages, loading: messagesLoading, sendMessage } = useMessages(selectedId);

  const filtered =
    tab === "unassigned"
      ? conversations.filter((c) => !c.assignedTo)
      : tab === "unread"
        ? conversations.filter((c) => c.unreadCount > 0)
        : conversations;

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* Ambient color field behind the glass so the blur has depth to refract */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="absolute -right-40 top-1/4 h-[28rem] w-[28rem] rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-fuchsia-500/15 blur-3xl" />
      </div>

      <HistorySyncBanner onDone={reload} />
      <div className="grid min-h-0 flex-1 auto-rows-[minmax(0,1fr)] gap-3 overflow-hidden p-3 lg:grid-cols-[320px_1fr_280px] lg:gap-4 lg:p-4">
        <div
          className={cn(
            "liquid-glass anim-fade-up h-full min-h-0 overflow-hidden rounded-2xl",
            mobileView === "thread" ? "hidden lg:block" : "block"
          )}
          style={{ "--stagger": 0 } as React.CSSProperties}
        >
          <ConversationList
            conversations={filtered}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setMobileView("thread");
              // Badge clears instantly; the server reset happens when the
              // thread loads its messages.
              markRead(id);
            }}
            search={search}
            onSearchChange={setSearch}
            loading={loading || (search.trim() !== debouncedSearch)}
            tab={tab}
            onTabChange={setTab}
          />
        </div>

        <div
          className={cn(
            "liquid-glass anim-fade-up h-full min-h-0 overflow-hidden rounded-2xl",
            mobileView === "list" ? "hidden lg:block" : "block"
          )}
          style={{ "--stagger": 1 } as React.CSSProperties}
        >
          <ChatThread
            conversation={selected}
            messages={messages}
            onSend={sendMessage}
            onBack={() => setMobileView("list")}
            loading={messagesLoading}
          />
        </div>

        <div
          className="liquid-glass anim-fade-up hidden h-full min-h-0 overflow-hidden rounded-2xl lg:block"
          style={{ "--stagger": 2 } as React.CSSProperties}
        >
          <ContactPanel conversation={selected} onUpdated={reload} />
        </div>
      </div>
    </div>
  );
}

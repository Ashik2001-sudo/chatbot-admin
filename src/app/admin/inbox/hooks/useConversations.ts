"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/config";
import { useRealtimeSocket } from "@/contexts/RealtimeSocketContext";

export interface Conversation {
  id: string;
  status: string;
  unreadCount: number;
  lastMessageAt: string;
  channelType: string;
  /** Announce-only group: only admins can send, composer is disabled. */
  readOnly?: boolean;
  contact: { id: string; name?: string; phone?: string; avatarUrl?: string };
  channelConn?: { id: string; name?: string; type?: string; status?: string };
  assignedTo?: { id: string; name: string } | null;
  messages?: Array<{
    body?: string;
    contentType?: string;
    mediaUrl?: string;
    direction?: string;
    createdAt: string;
  }>;
}

export function useConversations(
  filter: {
    status?: string;
    mine?: boolean;
    search?: string;
    channelType?: string;
  },
  /** Currently open conversation: its unread badge stays cleared. */
  activeId?: string | null
) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useRealtimeSocket();
  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("userData") || "{}") : {};

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status) params.set("status", filter.status);
      if (filter.mine) params.set("mine", "true");
      if (filter.search) params.set("search", filter.search);
      if (filter.channelType) params.set("channelType", filter.channelType);
      const data = await apiFetch<Conversation[]>(`/conversations?${params}`);
      setConversations(data);
    } finally {
      setLoading(false);
    }
  }, [filter.status, filter.mine, filter.search, filter.channelType]);

  const matchesSearch = useCallback(
    (conv: Conversation) => {
      const term = filter.search?.trim().toLowerCase();
      if (!term) return true;
      if (conv.contact?.name?.toLowerCase().includes(term)) return true;
      if (conv.contact?.phone?.toLowerCase().includes(term)) return true;
      if (conv.messages?.[0]?.body?.toLowerCase().includes(term)) return true;
      return false;
    },
    [filter.search]
  );

  useEffect(() => {
    load();
  }, [load]);

  const markRead = useCallback((id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onNew = (payload: { conversation: Conversation }) => {
      setConversations((prev) => {
        const incoming =
          payload.conversation.id === activeId
            ? { ...payload.conversation, unreadCount: 0 }
            : payload.conversation;
        if (!matchesSearch(incoming)) {
          return prev.filter((c) => c.id !== incoming.id);
        }
        const idx = prev.findIndex((c) => c.id === incoming.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = incoming;
          return next.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
        }
        return [incoming, ...prev];
      });
    };
    socket.on("message:new", onNew);
    // Channel connect/disconnect changes whether sending is possible.
    const onChannelStatus = () => load();
    socket.on("channel:status", onChannelStatus);
    return () => {
      socket.off("message:new", onNew);
      socket.off("channel:status", onChannelStatus);
    };
  }, [socket, load, activeId, matchesSearch]);

  return { conversations, loading, reload: load, markRead, userId: user.id };
}

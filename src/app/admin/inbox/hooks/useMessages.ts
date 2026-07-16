"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/config";
import { useRealtimeSocket } from "@/contexts/RealtimeSocketContext";

export interface Message {
  id: string;
  direction: "inbound" | "outbound";
  body?: string;
  contentType: string;
  mediaUrl?: string;
  status: string;
  createdAt: string;
  sentBy?: { id: string; name: string } | null;
}

function appendUnique(prev: Message[], msg: Message) {
  if (prev.some((m) => m.id === msg.id)) return prev;
  return [...prev, msg];
}

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const { socket } = useRealtimeSocket();

  const load = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const data = await apiFetch<Message[]>(`/conversations/${conversationId}/messages`);
      setMessages(data);
      await apiFetch(`/conversations/${conversationId}/messages/read`, { method: "POST" });
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    setMessages([]);
    load();
  }, [load]);

  useEffect(() => {
    if (!socket || !conversationId) return;
    const onNew = (payload: { message: Message; conversation: { id: string } }) => {
      if (payload.conversation.id === conversationId) {
        setMessages((prev) => appendUnique(prev, payload.message));
      }
    };
    socket.on("message:new", onNew);
    return () => {
      socket.off("message:new", onNew);
    };
  }, [socket, conversationId]);

  const sendMessage = async (
    body: string,
    media?: { url: string; contentType: string },
  ) => {
    if (!conversationId || (!body.trim() && !media)) return;
    const msg = await apiFetch<Message>(`/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        body,
        ...(media ? { mediaUrl: media.url, contentType: media.contentType } : {}),
      }),
    });
    setMessages((prev) => appendUnique(prev, msg));
  };

  return { messages, loading, sendMessage, reload: load };
}

"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import { config, getTenantData } from "@/lib/config";
import { initNotificationSound, playNotificationSound } from "@/lib/notification-sound";

interface RealtimeContextValue {
  socket: Socket | null;
  connected: boolean;
}

const RealtimeSocketContext = createContext<RealtimeContextValue>({
  socket: null,
  connected: false,
});

export function RealtimeSocketProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    const tenant = getTenantData<{ id: string }>();
    setTenantId(tenant?.id ?? null);
    // Unlock audio on the first user gesture so chimes can play later.
    initNotificationSound();
  }, []);

  const socket = useMemo(() => {
    if (!tenantId) return null;
    const base = config.API_URL.replace(/\/$/, "");
    return io(`${base}/chat`, {
      query: { tenantId },
      transports: ["websocket", "polling"],
    });
  }, [tenantId]);

  useEffect(() => {
    if (!socket) return;
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    // Chime for new customer messages when the app isn't in focus
    // (minimized window or another tab) so they aren't missed.
    const onNewMessage = (payload: { message?: { direction?: string } }) => {
      if (payload.message?.direction !== "inbound") return;
      if (document.hidden || !document.hasFocus()) void playNotificationSound();
    };
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("message:new", onNewMessage);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("message:new", onNewMessage);
      socket.disconnect();
    };
  }, [socket]);

  return (
    <RealtimeSocketContext.Provider value={{ socket, connected }}>
      {children}
    </RealtimeSocketContext.Provider>
  );
}

export function useRealtimeSocket() {
  return useContext(RealtimeSocketContext);
}

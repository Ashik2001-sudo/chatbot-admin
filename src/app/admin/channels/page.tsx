"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Share2, Camera, CheckCircle2, History, Loader2, MessageCircle, QrCode, Unplug } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/config";
import { useRealtimeSocket } from "@/contexts/RealtimeSocketContext";

interface Channel {
  id: string;
  name: string;
  type: string;
  status: string;
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrModal, setQrModal] = useState<{ channelId: string; qr: string } | null>(null);
  const [historyModal, setHistoryModal] = useState<
    { channelId: string; phase: "ask" | "syncing" } | null
  >(null);
  const [savingHistoryChoice, setSavingHistoryChoice] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{
    progress: number | null;
    imported: number;
    done: boolean;
  } | null>(null);
  const pairingChannelId = useRef<string | null>(null);
  const syncingChannelId = useRef<string | null>(null);
  // Only show the QR modal for a connect the user actually initiated;
  // stray backend QR events must not pop the modal on their own.
  const qrRequested = useRef(false);
  const { socket } = useRealtimeSocket();

  const [baileysName, setBaileysName] = useState("WhatsApp Baileys");
  const [cloudForm, setCloudForm] = useState({ name: "WhatsApp Cloud", phoneNumberId: "", accessToken: "" });
  const [metaForm, setMetaForm] = useState({ name: "Meta Page", pageId: "", accessToken: "", instagramId: "" });

  const load = () =>
    apiFetch<Channel[]>("/channels")
      .then(setChannels)
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onQr = (data: { channelId: string; qr: string }) => {
      if (!qrRequested.current) return;
      pairingChannelId.current = data.channelId;
      setQrModal(data);
    };
    const onStatus = (data: { channelId: string; status: string }) => {
      load();
      if (
        data.status === "connected" &&
        pairingChannelId.current === data.channelId
      ) {
        pairingChannelId.current = null;
        qrRequested.current = false;
        setQrModal(null);
        setHistoryModal({ channelId: data.channelId, phase: "ask" });
        toast.success("WhatsApp connected");
      }
    };
    const onHistoryProgress = (data: {
      channelId: string;
      progress: number | null;
      imported: number;
      done: boolean;
    }) => {
      if (syncingChannelId.current !== data.channelId) return;
      setSyncProgress({
        progress: data.progress,
        imported: data.imported,
        done: data.done,
      });
    };
    socket.on("whatsapp:qr", onQr);
    socket.on("channel:status", onStatus);
    socket.on("history:progress", onHistoryProgress);
    return () => {
      socket.off("whatsapp:qr", onQr);
      socket.off("channel:status", onStatus);
      socket.off("history:progress", onHistoryProgress);
    };
  }, [socket]);

  const connectBaileys = async () => {
    try {
      qrRequested.current = true;
      await apiFetch("/channels/whatsapp/baileys", {
        method: "POST",
        body: JSON.stringify({ name: baileysName }),
      });
      toast.success("QR code generating...");
      load();
    } catch (err) {
      qrRequested.current = false;
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const disconnectChannel = async (channel: Channel) => {
    if (!confirm(`Disconnect "${channel.name}"? Conversations are kept, but WhatsApp will need a new QR scan to reconnect.`)) {
      return;
    }
    try {
      await apiFetch(`/channels/${channel.id}/disconnect`, { method: "POST" });
      toast.success(`${channel.name} disconnected`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect");
    }
  };

  const chooseHistorySync = async (enabled: boolean) => {
    if (!historyModal) return;
    setSavingHistoryChoice(true);
    const channelId = historyModal.channelId;
    if (enabled) {
      // Switch the modal to progress mode before the request so the first
      // progress events (emitted while it processes) aren't missed.
      syncingChannelId.current = channelId;
      setSyncProgress({ progress: null, imported: 0, done: false });
      setHistoryModal({ channelId, phase: "syncing" });
    }
    try {
      await apiFetch(`/channels/${channelId}/history-sync`, {
        method: "POST",
        body: JSON.stringify({ enabled }),
      });
      if (!enabled) {
        setHistoryModal(null);
        toast.success("History sync skipped — new messages will still arrive");
      }
    } catch (err) {
      syncingChannelId.current = null;
      setHistoryModal(null);
      setSyncProgress(null);
      toast.error(err instanceof Error ? err.message : "Failed to save choice");
    } finally {
      setSavingHistoryChoice(false);
    }
  };

  const closeSyncModal = () => {
    syncingChannelId.current = null;
    setHistoryModal(null);
    setSyncProgress(null);
  };

  const connectCloud = async () => {
    try {
      await apiFetch("/channels/whatsapp/cloud", {
        method: "POST",
        body: JSON.stringify(cloudForm),
      });
      toast.success("WhatsApp Cloud connected");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const connectMeta = async () => {
    try {
      await apiFetch("/channels/meta", {
        method: "POST",
        body: JSON.stringify(metaForm),
      });
      toast.success("Meta channels connected");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const statusColor = (status: string) =>
    status === "connected" ? "text-green-500" : status === "pending_qr" ? "text-yellow-500" : "text-muted-foreground";

  // Only fully paired channels belong in the list; QR attempts in progress
  // are represented by the QR modal itself.
  const connectedChannels = channels.filter((ch) => ch.status === "connected");
  const whatsappConnected = connectedChannels.some(
    (ch) => ch.type === "WHATSAPP_BAILEYS" || ch.type === "WHATSAPP_CLOUD"
  );
  const facebookConnected = connectedChannels.some((ch) => ch.type === "FACEBOOK_PAGE");
  const instagramConnected = connectedChannels.some((ch) => ch.type === "INSTAGRAM");

  return (
    <div className="relative space-y-6 overflow-hidden p-4 lg:p-6">
      {/* Ambient color field behind the glass so the blur has depth to refract */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="absolute -right-40 top-1/4 h-[28rem] w-[28rem] rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-fuchsia-500/15 blur-3xl" />
      </div>

      <div className="anim-fade-up" style={{ "--stagger": 0 } as React.CSSProperties}>
        <h1 className="text-2xl font-bold tracking-tight">Channels</h1>
        <p className="text-muted-foreground">Connect WhatsApp, Facebook, and Instagram</p>
      </div>

      {loading ? (
        <div className="liquid-glass anim-fade-up rounded-2xl p-6" style={{ "--stagger": 1 } as React.CSSProperties}>
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="glass-tile flex items-center gap-3 rounded-xl p-3">
                <div className="h-10 w-10 animate-pulse rounded-xl bg-accent" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-40 animate-pulse rounded bg-accent" />
                  <div className="h-3 w-28 animate-pulse rounded bg-accent/70" />
                </div>
                <div className="h-5 w-20 animate-pulse rounded-full bg-accent/70" />
              </div>
            ))}
          </div>
        </div>
      ) : connectedChannels.length > 0 ? (
        <Card
          className="liquid-glass anim-fade-up transition-shadow duration-300 hover:shadow-xl"
          style={{ "--stagger": 1 } as React.CSSProperties}
        >
          <CardHeader>
            <CardTitle>Connected channels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {connectedChannels.map((ch) => (
              <div key={ch.id} className="glass-tile flex items-center justify-between rounded-xl p-3">
                <div>
                  <p className="font-medium">{ch.name}</p>
                  <p className="text-xs text-muted-foreground">{ch.type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={statusColor(ch.status)}>{ch.status}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => disconnectChannel(ch)}
                    className="gap-1.5 text-muted-foreground hover:text-destructive"
                  >
                    <Unplug className="h-4 w-4" />
                    Disconnect
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Card
          className="liquid-glass anim-fade-up transition-shadow duration-300 hover:shadow-xl"
          style={{ "--stagger": 2 } as React.CSSProperties}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="channel-whatsapp h-5 w-5" />
              WhatsApp (Baileys)
            </CardTitle>
            <CardDescription>Scan QR with your phone — unofficial API</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Connection name</Label>
              <Input value={baileysName} onChange={(e) => setBaileysName(e.target.value)} />
            </div>
            <Button disabled={whatsappConnected} onClick={connectBaileys} className="w-full gap-2">
              <QrCode className="h-4 w-4" />
              {whatsappConnected ? "Disconnect current WhatsApp first" : "Connect via QR"}
            </Button>
          </CardContent>
        </Card>

        <Card
          className="liquid-glass anim-fade-up transition-shadow duration-300 hover:shadow-xl"
          style={{ "--stagger": 3 } as React.CSSProperties}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="channel-whatsapp h-5 w-5" />
              WhatsApp Cloud API
            </CardTitle>
            <CardDescription>Official Meta WhatsApp Business API</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Name" value={cloudForm.name} onChange={(e) => setCloudForm({ ...cloudForm, name: e.target.value })} />
            <Input placeholder="Phone Number ID" value={cloudForm.phoneNumberId} onChange={(e) => setCloudForm({ ...cloudForm, phoneNumberId: e.target.value })} />
            <Input placeholder="Access Token" value={cloudForm.accessToken} onChange={(e) => setCloudForm({ ...cloudForm, accessToken: e.target.value })} />
            <Button disabled={whatsappConnected} onClick={connectCloud} className="w-full">
              {whatsappConnected ? "Disconnect current WhatsApp first" : "Connect Cloud API"}
            </Button>
          </CardContent>
        </Card>

        <Card
          className="liquid-glass anim-fade-up transition-shadow duration-300 hover:shadow-xl md:col-span-2"
          style={{ "--stagger": 4 } as React.CSSProperties}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="channel-facebook h-5 w-5" />
              <Camera className="channel-instagram h-5 w-5" />
              Facebook & Instagram
            </CardTitle>
            <CardDescription>Meta Page Access Token for Messenger & IG DMs</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Name" value={metaForm.name} onChange={(e) => setMetaForm({ ...metaForm, name: e.target.value })} />
            <Input placeholder="Page ID" value={metaForm.pageId} onChange={(e) => setMetaForm({ ...metaForm, pageId: e.target.value })} />
            <Input placeholder="Access Token" value={metaForm.accessToken} onChange={(e) => setMetaForm({ ...metaForm, accessToken: e.target.value })} />
            <Input placeholder="Instagram ID (optional)" value={metaForm.instagramId} onChange={(e) => setMetaForm({ ...metaForm, instagramId: e.target.value })} />
            <Button
              disabled={
                facebookConnected ||
                (Boolean(metaForm.instagramId) && instagramConnected)
              }
              onClick={connectMeta}
              className="md:col-span-2"
            >
              {facebookConnected
                ? "Disconnect current Facebook first"
                : metaForm.instagramId && instagramConnected
                  ? "Disconnect current Instagram first"
                  : "Connect Meta"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {qrModal ? (
        <div className="anim-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="liquid-glass anim-modal-pop w-full max-w-sm shadow-2xl">
            <CardHeader>
              <CardTitle>Scan WhatsApp QR</CardTitle>
              <CardDescription>Open WhatsApp → Linked devices → Scan</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <Image src={qrModal.qr} alt="WhatsApp QR" width={256} height={256} unoptimized />
              <Button
                variant="outline"
                onClick={() => {
                  qrRequested.current = false;
                  setQrModal(null);
                }}
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {historyModal?.phase === "ask" ? (
        <div className="anim-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="liquid-glass anim-modal-pop w-full max-w-md shadow-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <History className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Sync previous messages?</CardTitle>
              <CardDescription>
                Import available chat history from your phone. Progress will be
                shown here.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                disabled={savingHistoryChoice}
                onClick={() => chooseHistorySync(false)}
              >
                No, start fresh
              </Button>
              <Button
                disabled={savingHistoryChoice}
                onClick={() => chooseHistorySync(true)}
              >
                {savingHistoryChoice ? "Please wait..." : "Yes, sync history"}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {historyModal?.phase === "syncing" ? (
        <div className="anim-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="liquid-glass anim-modal-pop w-full max-w-md shadow-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                {syncProgress?.done ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                ) : (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                )}
              </div>
              <CardTitle>
                {syncProgress?.done ? "History sync complete" : "Syncing chat history..."}
              </CardTitle>
              <CardDescription>
                {syncProgress?.done
                  ? `${syncProgress.imported} messages imported from your phone.`
                  : "Importing previous messages from your phone. This can take a few minutes for large histories."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-1.5 flex items-baseline justify-between text-xs text-muted-foreground">
                  <span className="tabular-nums">
                    {syncProgress?.imported ?? 0} messages imported
                  </span>
                  {syncProgress?.progress !== null && syncProgress?.progress !== undefined ? (
                    <span className="font-medium tabular-nums text-foreground">
                      {Math.min(100, Math.round(syncProgress.progress))}%
                    </span>
                  ) : null}
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-accent">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      syncProgress?.done ? "bg-emerald-500" : "gradient-accent"
                    } ${!syncProgress?.done && syncProgress?.progress == null ? "animate-pulse" : ""}`}
                    style={{
                      width: syncProgress?.done
                        ? "100%"
                        : syncProgress?.progress != null
                          ? `${Math.min(100, syncProgress.progress)}%`
                          : "35%",
                    }}
                  />
                </div>
              </div>
              <Button
                variant={syncProgress?.done ? "default" : "outline"}
                className="w-full"
                onClick={closeSyncModal}
              >
                {syncProgress?.done ? "Done" : "Hide (sync continues in background)"}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

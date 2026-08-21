"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@teispace/next-themes";
import {
  Building2,
  Check,
  Copy,
  Loader2,
  Monitor,
  Moon,
  Palette,
  Sun,
  Trash2,
  TriangleAlert,
  Unplug,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch, config, getTenantData } from "@/lib/config";
import { cn } from "@/lib/utils";

interface ChannelStatus {
  status: string;
}

const themeOptions = [
  { id: "light", label: "Light", icon: Sun, hint: "Bright and clean" },
  { id: "dark", label: "Dark", icon: Moon, hint: "Easy on the eyes" },
  { id: "system", label: "System", icon: Monitor, hint: "Match your OS" },
] as const;

function SectionIcon({ icon: Icon, className }: { icon: typeof Sun; className?: string }) {
  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary",
        className
      )}
    >
      <Icon className="h-4.5 w-4.5" />
    </span>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="space-y-2">
        <div className="h-7 w-36 animate-pulse rounded-lg bg-accent" />
        <div className="h-4 w-52 animate-pulse rounded-lg bg-accent/70" />
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 animate-pulse rounded-xl bg-accent" />
            <div className="space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-accent" />
              <div className="h-3 w-48 animate-pulse rounded bg-accent/70" />
            </div>
          </div>
          <div className="mt-5 space-y-2.5">
            <div className="h-3.5 w-3/4 animate-pulse rounded bg-accent/60" />
            <div className="h-3.5 w-1/2 animate-pulse rounded bg-accent/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [resetModal, setResetModal] = useState(false);
  const [disconnectModal, setDisconnectModal] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [resetting, setResetting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Theme and tenant both live in localStorage, so render them only after
  // hydration; the skeleton covers the gap (server snapshot returns false).
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const tenant = mounted ? getTenantData<{ name: string; slug: string }>() : null;

  const apiUrl = config.API_URL;
  const webhooks = [
    { label: "Meta FB/IG", url: `${apiUrl}/webhooks/meta` },
    { label: "WhatsApp Cloud", url: `${apiUrl}/webhooks/whatsapp` },
  ];

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const openReset = async () => {
    try {
      const channels = await apiFetch<ChannelStatus[]>("/channels");
      if (channels.some((channel) => channel.status !== "disconnected")) {
        setDisconnectModal(true);
        return;
      }
      setConfirmation("");
      setResetModal(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to check channels");
    }
  };

  const resetMessages = async () => {
    if (confirmation !== "CONFIRM") return;
    setResetting(true);
    try {
      await apiFetch("/channels/reset-inbox", { method: "POST" });
      setResetModal(false);
      setConfirmation("");
      toast.success("All conversations and messages cleared");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset");
    } finally {
      setResetting(false);
    }
  };

  if (!mounted) return <SettingsSkeleton />;

  return (
    <div className="relative space-y-6 overflow-hidden p-4 lg:p-6">
      {/* Ambient color field behind the glass so the blur has depth to refract */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="absolute -right-40 top-1/4 h-[28rem] w-[28rem] rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-fuchsia-500/15 blur-3xl" />
      </div>

      <div className="anim-fade-up" style={{ "--stagger": 0 } as React.CSSProperties}>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Workspace preferences</p>
      </div>

      <Card
        className="liquid-glass anim-fade-up transition-shadow duration-300 hover:shadow-xl"
        style={{ "--stagger": 1 } as React.CSSProperties}
      >
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <SectionIcon icon={Building2} />
          <div>
            <CardTitle>Workspace</CardTitle>
            <CardDescription>Tenant information</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="glass-tile rounded-xl p-3.5">
            <p className="text-xs text-muted-foreground">Name</p>
            <p className="mt-0.5 truncate text-sm font-medium">{tenant?.name ?? "—"}</p>
          </div>
          <div className="glass-tile rounded-xl p-3.5">
            <p className="text-xs text-muted-foreground">Slug</p>
            <p className="mt-0.5 truncate font-mono text-sm font-medium">{tenant?.slug ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card
        className="liquid-glass anim-fade-up transition-shadow duration-300 hover:shadow-xl"
        style={{ "--stagger": 2 } as React.CSSProperties}
      >
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <SectionIcon icon={Palette} />
          <div>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Choose how the dashboard looks</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {themeOptions.map((option) => {
            const active = theme === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setTheme(option.id)}
                className={cn(
                  "glass-tile group relative flex flex-col items-start gap-2 rounded-xl p-4 text-left transition-all duration-300",
                  active
                    ? "ring-2 ring-primary/60 shadow-lg"
                    : "hover:-translate-y-0.5 hover:shadow-md"
                )}
              >
                {active ? (
                  <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full gradient-accent text-white">
                    <Check className="h-3 w-3" />
                  </span>
                ) : null}
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-300",
                    active ? "gradient-accent text-white" : "bg-accent text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  <option.icon className="h-4.5 w-4.5" />
                </span>
                <span>
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span className="block text-xs text-muted-foreground">{option.hint}</span>
                </span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card
        className="liquid-glass anim-fade-up transition-shadow duration-300 hover:shadow-xl"
        style={{ "--stagger": 3 } as React.CSSProperties}
      >
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <SectionIcon icon={Webhook} />
          <div>
            <CardTitle>Webhook URLs</CardTitle>
            <CardDescription>Use these in Meta Developer Console</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {webhooks.map((hook) => (
            <div
              key={hook.url}
              className="glass-tile flex items-center gap-3 rounded-xl p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{hook.label}</p>
                <p className="truncate font-mono text-xs">{hook.url}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyUrl(hook.url)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                {copied === hook.url ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card
        className="liquid-glass anim-fade-up ring-1 ring-destructive/25 transition-shadow duration-300 hover:shadow-xl"
        style={{ "--stagger": 4 } as React.CSSProperties}
      >
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <SectionIcon icon={TriangleAlert} className="bg-destructive/10 text-destructive" />
          <div>
            <CardTitle className="text-destructive">Danger zone</CardTitle>
            <CardDescription>Irreversible actions for this workspace</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Reset inbox</p>
            <p className="text-xs text-muted-foreground">
              Permanently delete all conversations and messages. Channels must be disconnected first.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={openReset}
            className="gap-2 border-destructive/50 text-destructive transition-all duration-300 hover:bg-destructive hover:text-white"
          >
            <Trash2 className="h-4 w-4" />
            Reset messages
          </Button>
        </CardContent>
      </Card>

      {resetModal ? (
        <div
          className="anim-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => !resetting && setResetModal(false)}
        >
          <div
            className="liquid-glass anim-modal-pop w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10">
              <TriangleAlert className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="text-base font-semibold">Delete all messages?</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              All conversations and messages will be permanently deleted.
              Contacts and disconnected channel records are kept. This cannot
              be undone.
            </p>
            <div className="mt-4 text-left">
              <label htmlFor="reset-confirmation" className="text-xs font-medium">
                Type <span className="font-mono text-destructive">CONFIRM</span> to continue
              </label>
              <Input
                id="reset-confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="CONFIRM"
                autoComplete="off"
                className="mt-1.5"
              />
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Button variant="outline" disabled={resetting} onClick={() => setResetModal(false)}>
                Cancel
              </Button>
              <Button
                disabled={resetting || confirmation !== "CONFIRM"}
                onClick={resetMessages}
                className="gap-2 bg-destructive text-white hover:bg-destructive/90"
              >
                {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Yes, delete all
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {disconnectModal ? (
        <div
          className="anim-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setDisconnectModal(false)}
        >
          <div
            className="liquid-glass anim-modal-pop w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10">
              <Unplug className="h-6 w-6 text-amber-500" />
            </div>
            <h3 className="text-base font-semibold">Disconnect channels first</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              The inbox cannot be reset while a channel is connected. Disconnect
              every channel from the Channels page, then return here.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Button variant="outline" onClick={() => setDisconnectModal(false)}>
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

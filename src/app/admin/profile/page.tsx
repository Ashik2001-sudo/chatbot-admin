"use client";

import { useSyncExternalStore } from "react";
import { Building2, Mail, ShieldCheck, UserRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getUserData, getTenantData } from "@/lib/config";
import { cn } from "@/lib/utils";

const roleBadge: Record<string, string> = {
  owner: "bg-amber-500/15 text-amber-400",
  admin: "bg-sky-500/15 text-sky-400",
  agent: "bg-emerald-500/15 text-emerald-400",
};

function ProfileSkeleton() {
  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="h-7 w-32 animate-pulse rounded-lg bg-accent" />
      <div className="max-w-xl rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 animate-pulse rounded-full bg-accent" />
          <div className="space-y-2">
            <div className="h-4 w-36 animate-pulse rounded bg-accent" />
            <div className="h-3 w-48 animate-pulse rounded bg-accent/70" />
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-accent/60" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  // User/tenant live in localStorage; render only after hydration.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!mounted) return <ProfileSkeleton />;

  const user = getUserData<{ name: string; email: string; role: string }>();
  const tenant = getTenantData<{ name: string }>();
  const initials = user?.name?.slice(0, 2).toUpperCase() ?? "?";

  const fields = [
    { label: "Full name", value: user?.name || "—", icon: UserRound },
    { label: "Email", value: user?.email || "—", icon: Mail },
    { label: "Role", value: user?.role || "—", icon: ShieldCheck, capitalize: true },
    { label: "Workspace", value: tenant?.name || "—", icon: Building2 },
  ];

  return (
    <div className="relative space-y-6 overflow-hidden p-4 lg:p-6">
      {/* Ambient color field behind the glass so the blur has depth to refract */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="absolute -right-40 top-1/4 h-[28rem] w-[28rem] rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-fuchsia-500/15 blur-3xl" />
      </div>

      <div className="anim-fade-up" style={{ "--stagger": 0 } as React.CSSProperties}>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Your account details</p>
      </div>

      <Card
        className="liquid-glass anim-fade-up max-w-xl transition-shadow duration-300 hover:shadow-xl"
        style={{ "--stagger": 1 } as React.CSSProperties}
      >
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
          <div className="relative">
            <Avatar className="h-16 w-16 ring-2 ring-border ring-offset-2 ring-offset-transparent">
              <AvatarFallback className="gradient-accent text-lg font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-card bg-emerald-500" />
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate">{user?.name}</CardTitle>
            <CardDescription className="truncate">{user?.email}</CardDescription>
            <span
              className={cn(
                "mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                roleBadge[user?.role ?? ""] ?? "bg-accent text-accent-foreground"
              )}
            >
              {user?.role}
            </span>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.label} className="glass-tile flex items-center gap-3 rounded-xl p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <field.icon className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{field.label}</p>
                <p
                  className={cn(
                    "mt-0.5 truncate text-sm font-medium",
                    field.capitalize && "capitalize"
                  )}
                >
                  {field.value}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

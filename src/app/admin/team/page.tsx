"use client";

import { useEffect, useState } from "react";
import { Mail, ShieldCheck, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { apiFetch } from "@/lib/config";
import { cn } from "@/lib/utils";

interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

function SectionIcon({ icon: Icon, className }: { icon: typeof Users; className?: string }) {
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

const roleStyles: Record<string, string> = {
  owner: "bg-amber-500/15 text-amber-500",
  admin: "bg-violet-500/15 text-violet-400",
  agent: "bg-emerald-500/15 text-emerald-500",
};

function TeamSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="glass-tile flex items-center gap-3 rounded-xl p-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-accent" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-32 animate-pulse rounded bg-accent" />
            <div className="h-3 w-44 animate-pulse rounded bg-accent/70" />
          </div>
          <div className="h-5 w-14 animate-pulse rounded-full bg-accent/70" />
        </div>
      ))}
    </div>
  );
}

export default function TeamPage() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "agent" });

  const load = () =>
    apiFetch<TeamUser[]>("/users")
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      await apiFetch("/users/invite", { method: "POST", body: JSON.stringify(form) });
      toast.success("Agent invited");
      setForm({ name: "", email: "", password: "", role: "agent" });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="relative space-y-6 overflow-hidden p-4 lg:p-6">
      {/* Ambient color field behind the glass so the blur has depth to refract */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="absolute -right-40 top-1/4 h-[28rem] w-[28rem] rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-fuchsia-500/15 blur-3xl" />
      </div>

      <div className="anim-fade-up" style={{ "--stagger": 0 } as React.CSSProperties}>
        <h1 className="text-2xl font-bold tracking-tight">Team</h1>
        <p className="text-muted-foreground">Manage agents and admins</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          className="liquid-glass anim-fade-up transition-shadow duration-300 hover:shadow-xl"
          style={{ "--stagger": 1 } as React.CSSProperties}
        >
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <SectionIcon icon={Users} />
            <div>
              <CardTitle>Team members</CardTitle>
              <CardDescription>
                {loading ? "Loading..." : `${users.length} member${users.length === 1 ? "" : "s"}`}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <TeamSkeleton />
            ) : users.length === 0 ? (
              <div className="glass-tile flex flex-col items-center gap-2 rounded-xl p-8 text-center">
                <Users className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No team members yet</p>
              </div>
            ) : (
              users.map((u) => (
                <div key={u.id} className="glass-tile flex items-center gap-3 rounded-xl p-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-accent text-sm font-semibold text-white">
                    {(u.name || u.email).slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.name}</p>
                    <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <Mail className="h-3 w-3 shrink-0" />
                      {u.email}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                      roleStyles[u.role] ?? "bg-accent text-accent-foreground"
                    )}
                  >
                    <ShieldCheck className="h-3 w-3" />
                    {u.role}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card
          className="liquid-glass anim-fade-up transition-shadow duration-300 hover:shadow-xl"
          style={{ "--stagger": 2 } as React.CSSProperties}
        >
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <SectionIcon icon={UserPlus} />
            <div>
              <CardTitle>Invite agent</CardTitle>
              <CardDescription>Add a new member to the workspace</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={invite} className="space-y-3">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <select
                  className="flex h-11 w-full rounded-xl border border-border bg-input px-3 text-sm"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <Button type="submit" disabled={inviting} className="w-full gap-2">
                <UserPlus className="h-4 w-4" />
                {inviting ? "Inviting..." : "Invite"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

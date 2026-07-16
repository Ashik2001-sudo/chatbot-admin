"use client";

import { Menu } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { ThemeToggle } from "../Header/ThemeToggle";
import { FullscreenToggle } from "../Header/FullscreenToggle";
import { Sidebar } from "../Sidebar/Sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getTenantData, getUserData } from "@/lib/config";

interface HeaderProps {
  unreadCount?: number;
}

export function Header({ unreadCount }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  // User/tenant live in localStorage; read them only after hydration.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const user = mounted ? getUserData<{ name: string; role: string }>() : null;
  const tenant = mounted ? getTenantData<{ name: string }>() : null;

  return (
    <>
      <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/70 px-4 shadow-[0_4px_12px_-6px_rgba(0,0,0,0.18)] backdrop-blur-xl lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="gradient-accent text-xs font-semibold text-white">
              {user?.name?.slice(0, 2).toUpperCase() ?? "··"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {tenant?.name}
              {user?.role ? <span className="capitalize"> · {user.role}</span> : null}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-full border border-border bg-accent/30 p-1">
          <FullscreenToggle />
          <ThemeToggle />
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="anim-overlay absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full bg-sidebar shadow-2xl">
            <Sidebar unreadCount={unreadCount} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}

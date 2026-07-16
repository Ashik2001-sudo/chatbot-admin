"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { clearAuthData, getUserData } from "@/lib/config";
import {
  SIDEBAR_BOTTOM_ITEMS,
  SIDEBAR_MENU_ITEMS,
  type UserRole,
} from "./config/sidebar-menu.config";

interface SidebarProps {
  unreadCount?: number;
  onNavigate?: () => void;
  /** Desktop sidebar can collapse to an icon rail; the mobile drawer can't. */
  collapsible?: boolean;
}

export function Sidebar({ unreadCount = 0, onNavigate, collapsible = false }: SidebarProps) {
  const pathname = usePathname();
  // Read the role after mount: localStorage is unavailable during SSR, so
  // reading it during render causes a hydration mismatch for role-gated items.
  const [role, setRole] = useState<UserRole>("agent");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const user = getUserData<{ role: UserRole }>();
    if (user?.role) setRole(user.role);
    if (collapsible) {
      setCollapsed(localStorage.getItem("sidebarCollapsed") === "1");
    }
  }, [collapsible]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      localStorage.setItem("sidebarCollapsed", prev ? "0" : "1");
      return !prev;
    });
  };

  const visibleItems = SIDEBAR_MENU_ITEMS.filter((item) => item.roles.includes(role));
  const bottomItems = SIDEBAR_BOTTOM_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <aside
      className={cn(
        "relative flex h-full flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-52"
      )}
    >
      {collapsible ? (
        <button
          type="button"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={toggleCollapsed}
          className="absolute -right-3.5 top-[52px] z-40 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-lg transition-all hover:scale-110 hover:border-primary/50 hover:text-primary"
        >
          <ChevronLeft
            className={cn("h-4 w-4 transition-transform duration-300", collapsed && "rotate-180")}
          />
        </button>
      ) : null}

      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-border",
          collapsed ? "justify-center px-2" : "gap-3 px-4"
        )}
      >
        <div className="gradient-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-lg shadow-primary/25">
          CB
        </div>
        {!collapsed ? <p className="truncate font-semibold">Chatbot</p> : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visibleItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          const badge = item.badge === "unreadCount" && unreadCount > 0 ? unreadCount : null;

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-colors",
                collapsed ? "justify-center px-0" : "px-3",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-sidebar-foreground hover:bg-accent/60"
              )}
            >
              <span className="relative shrink-0">
                <Icon className="h-5 w-5" />
                {collapsed && badge ? (
                  <span className="gradient-accent absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full border-2 border-sidebar" />
                ) : null}
              </span>
              {!collapsed ? <span className="flex-1 truncate">{item.label}</span> : null}
              {!collapsed && badge ? (
                <span className="gradient-accent rounded-full px-2 py-0.5 text-xs text-white">
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-border p-3">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          if (item.id === "logout") {
            return (
              <button
                key={item.id}
                type="button"
                title={collapsed ? item.label : undefined}
                onClick={() => {
                  clearAuthData();
                  window.location.href = "/login";
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10",
                  collapsed ? "justify-center px-0" : "px-3"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed ? item.label : null}
              </button>
            );
          }
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium hover:bg-accent/60",
                collapsed ? "justify-center px-0" : "px-3"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed ? item.label : null}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}

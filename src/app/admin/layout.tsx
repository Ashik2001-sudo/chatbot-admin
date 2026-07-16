"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/app/_components/Sidebar/Sidebar";
import { Header } from "@/app/_components/Header/Header";
import { RealtimeSocketProvider } from "@/contexts/RealtimeSocketContext";
import { isAuthenticated } from "@/lib/config";
import { apiFetch } from "@/lib/config";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [verifiedOwnerPath, setVerifiedOwnerPath] = useState<string | null>(null);
  const ownerOnlyRoute = ["/admin/channels", "/admin/team", "/admin/settings"].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    apiFetch<Array<{ unreadCount: number }>>("/conversations")
      .then((conversations) => {
        const total = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
        setUnreadCount(total);
      })
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    if (!ownerOnlyRoute) return;

    let cancelled = false;
    apiFetch<{ user: { role: string } }>("/auth/me")
      .then(({ user }) => {
        if (cancelled) return;
        if (user.role === "owner") {
          setVerifiedOwnerPath(pathname);
        } else {
          router.replace("/admin/inbox");
        }
      })
      .catch(() => {
        if (!cancelled) router.replace("/admin/inbox");
      });

    return () => {
      cancelled = true;
    };
  }, [ownerOnlyRoute, pathname, router]);

  return (
    <RealtimeSocketProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* relative + z keeps the edge collapse button above the main area */}
        <div className="relative z-30 hidden lg:block">
          <Sidebar unreadCount={unreadCount} collapsible />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <Header unreadCount={unreadCount} />
          <main className="flex-1 overflow-auto">
            {ownerOnlyRoute && verifiedOwnerPath !== pathname ? null : children}
          </main>
        </div>
      </div>
    </RealtimeSocketProvider>
  );
}

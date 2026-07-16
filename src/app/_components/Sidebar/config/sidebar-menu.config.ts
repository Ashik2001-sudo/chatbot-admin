import {
  MessageSquare,
  Smartphone,
  UserCheck,
  Settings,
  User,
  LogOut,
} from "lucide-react";

export type UserRole = "owner" | "admin" | "agent";

export interface MenuItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  badge?: string;
}

export const SIDEBAR_MENU_ITEMS: MenuItem[] = [
  {
    id: "inbox",
    label: "Inbox",
    href: "/admin/inbox",
    icon: MessageSquare,
    roles: ["owner", "admin", "agent"],
    badge: "unreadCount",
  },
  {
    id: "channels",
    label: "Channels",
    href: "/admin/channels",
    icon: Smartphone,
    roles: ["owner"],
  },
  {
    id: "team",
    label: "Team",
    href: "/admin/team",
    icon: UserCheck,
    roles: ["owner"],
  },
  {
    id: "settings",
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
    roles: ["owner"],
  },
];

export const SIDEBAR_BOTTOM_ITEMS: MenuItem[] = [
  {
    id: "profile",
    label: "Profile",
    href: "/admin/profile",
    icon: User,
    roles: ["owner", "admin", "agent"],
  },
  {
    id: "logout",
    label: "Logout",
    href: "/login",
    icon: LogOut,
    roles: ["owner", "admin", "agent"],
  },
];

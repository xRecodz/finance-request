"use client";

import { Activity, Bot, LayoutDashboard, Settings, UserPlus, Users } from "lucide-react";
import { AppShell, type NavItem } from "@/components/AppShell";
import { Guard } from "@/components/Guard";

const nav: NavItem[] = [
  { href: "/it", label: "Daftar User", icon: Users, match: "exact" },
  { href: "/it/overview", label: "Dashboard IT", icon: LayoutDashboard },
  { href: "/it/settings", label: "Routing & Password", icon: Settings },
  { href: "/it/audit", label: "Audit", icon: Activity },
  { href: "/it/ai", label: "Asisten AI", icon: Bot },
  {
    href: "/it/users/new",
    label: "Tambah User",
    icon: UserPlus,
    variant: "primary",
    match: "exact",
  },
];

export default function ItLayout({ children }: { children: React.ReactNode }) {
  return (
    <Guard roles={["IT", "ADMIN"]}>
      <AppShell title="Portal IT" nav={nav}>
        {children}
      </AppShell>
    </Guard>
  );
}

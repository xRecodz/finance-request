"use client";

import { Inbox, LayoutDashboard } from "lucide-react";
import { AppShell, type NavItem } from "@/components/AppShell";
import { Guard } from "@/components/Guard";

const nav: NavItem[] = [
  { href: "/approval", label: "Dashboard", icon: LayoutDashboard, match: "exact" },
  { href: "/approval/requests", label: "Antrian & Riwayat", icon: Inbox, match: "prefix" },
];

export default function ApprovalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Guard roles={["APPROVER", "ADMIN"]}>
      <AppShell title="Portal Approval" nav={nav}>
        {children}
      </AppShell>
    </Guard>
  );
}

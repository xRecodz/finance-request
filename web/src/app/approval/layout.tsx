"use client";

import { ClipboardList, Inbox, LayoutDashboard, PlusCircle } from "lucide-react";
import { AppShell, type NavItem } from "@/components/AppShell";
import { Guard } from "@/components/Guard";

const nav: NavItem[] = [
  { href: "/approval", label: "Dashboard", icon: LayoutDashboard, match: "exact" },
  { href: "/approval/requests", label: "Antrian & Riwayat", icon: Inbox, match: "prefix" },
  {
    href: "/pemohon/requests",
    label: "Pengajuan Saya",
    icon: ClipboardList,
    match: "exact",
  },
  {
    href: "/pemohon/requests/new",
    label: "Buat Pengajuan",
    icon: PlusCircle,
    variant: "primary",
    match: "exact",
  },
];

export default function ApprovalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Guard roles={["APPROVER", "MANAGER", "ADMIN"]}>
      <AppShell title="Portal Approval" nav={nav}>
        {children}
      </AppShell>
    </Guard>
  );
}

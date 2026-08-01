"use client";

import { ClipboardList, LayoutDashboard, PlusCircle } from "lucide-react";
import { AppShell, type NavItem } from "@/components/AppShell";
import { Guard } from "@/components/Guard";

const nav: NavItem[] = [
  { href: "/pemohon", label: "Dashboard", icon: LayoutDashboard, match: "exact" },
  { href: "/pemohon/requests", label: "Pengajuan Saya", icon: ClipboardList, match: "prefix" },
  {
    href: "/pemohon/requests/new",
    label: "Buat Pengajuan",
    icon: PlusCircle,
    variant: "primary",
    match: "exact",
  },
];

export default function PemohonLayout({ children }: { children: React.ReactNode }) {
  return (
    <Guard roles={["PEMOHON", "ADMIN"]}>
      <AppShell title="Portal Pemohon" nav={nav}>
        {children}
      </AppShell>
    </Guard>
  );
}

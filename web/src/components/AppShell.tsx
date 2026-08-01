"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Bell, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";

export type NavItem = {
  href: string;
  label: string;
  icon?: LucideIcon;
  /** Tombol aksi utama (mis. Buat Pengajuan). */
  variant?: "default" | "primary";
  /** exact = hanya cocok path sama; prefix = termasuk subpath (kecuali item lain lebih spesifik). */
  match?: "exact" | "prefix";
};

function isNavActive(pathname: string, item: NavItem, nav: NavItem[]): boolean {
  const mode = item.match ?? (item.href.split("/").filter(Boolean).length <= 1 ? "exact" : "prefix");

  if (mode === "exact") {
    return pathname === item.href;
  }

  if (pathname === item.href) return true;
  if (!pathname.startsWith(`${item.href}/`)) return false;

  // Jika ada item lain yang lebih spesifik cocok, jangan aktifkan parent.
  return !nav.some(
    (other) =>
      other.href !== item.href &&
      other.href.startsWith(`${item.href}/`) &&
      (pathname === other.href || pathname.startsWith(`${other.href}/`))
  );
}

export function AppShell({
  title,
  nav,
  children,
}: {
  title: string;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const defaultItems = nav.filter((item) => item.variant !== "primary");
  const primaryItems = nav.filter((item) => item.variant === "primary");

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-30 border-b border-sli-line/80 bg-white/90 shadow-[0_8px_30px_rgba(176,16,32,0.06)] backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 md:px-6">
          <div className="flex min-w-0 items-center gap-3 md:gap-4">
            <Link href="/" className="brand-mark shrink-0 text-xl font-bold text-sli-red md:text-2xl">
              SL INDONESIA
            </Link>
            <div className="hidden h-9 w-px bg-gradient-to-b from-transparent via-sli-line to-transparent md:block" />
            <div className="hidden min-w-0 md:block">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sli-muted">
                {title}
              </p>
              <p className="truncate text-sm font-semibold text-sli-ink">{user?.name}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden rounded-full border border-sli-red/15 bg-sli-red-soft px-3 py-1.5 text-xs font-semibold text-sli-red sm:inline">
              NIP {user?.nip}
            </span>
            <button
              type="button"
              className="btn-ghost inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold"
              onClick={() => {
                logout();
                router.replace("/");
              }}
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>

        <nav className="no-print mx-auto max-w-7xl px-4 pb-3.5 md:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <div className="nav-rail flex min-w-0 flex-1 items-center gap-1 overflow-x-auto rounded-2xl border border-sli-line/90 bg-[#fff7f7] p-1.5 shadow-inner">
              {defaultItems.map((item) => {
                const active = isNavActive(pathname, item, nav);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-link relative flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                      active ? "text-white" : "text-sli-muted hover:bg-white/80 hover:text-sli-red"
                    }`}
                  >
                    {active ? (
                      <motion.span
                        layoutId="nav-active-pill"
                        className="absolute inset-0 rounded-xl bg-gradient-to-br from-sli-red to-sli-red-deep shadow-md shadow-sli-red/25"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    ) : null}
                    <span className="relative z-10 inline-flex items-center gap-2">
                      {Icon ? <Icon size={17} strokeWidth={active ? 2.4 : 2} /> : null}
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>

            {primaryItems.map((item) => {
              const active = isNavActive(pathname, item, nav);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                    active
                      ? "bg-sli-red-deep text-white shadow-lg shadow-sli-red/30 ring-2 ring-sli-red/20"
                      : "btn-primary"
                  }`}
                >
                  {Icon ? <Icon size={17} strokeWidth={2.4} /> : null}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">{children}</main>

      <footer className="no-print border-t border-sli-line/70 py-6 text-center text-xs text-sli-muted">
        <span className="inline-flex items-center gap-2">
          <Bell size={12} /> Sistem Permohonan Finance · SL INDONESIA
        </span>
      </footer>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { homePathForRole } from "@/lib/types";

type Notif = {
  id: string;
  title: string;
  body: string;
  requestId: string | null;
  isRead: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await api<{ data: Notif[]; unread: number }>("/api/meta/notifications");
      setItems(res.data);
      setUnread(res.unread);
    } catch {
      // diam jika sesi belum siap
    }
  }

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 45000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function markAll() {
    await api("/api/meta/notifications/read-all", { method: "POST" });
    await load();
  }

  async function openItem(item: Notif) {
    if (!item.isRead) {
      await api(`/api/meta/notifications/${item.id}/read`, { method: "POST" });
    }
    setOpen(false);
    await load();
  }

  function hrefFor(item: Notif) {
    if (!item.requestId || !user) return "#";
    const base = homePathForRole(user.role);
    if (base === "/it") return `/pemohon/requests/${item.requestId}`;
    return `${base}/requests/${item.requestId}`;
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="btn-ghost relative inline-flex items-center justify-center rounded-xl p-2"
        aria-label="Notifikasi"
        onClick={() => {
          setOpen((v) => !v);
          void load();
        }}
      >
        <Bell size={18} />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sli-red px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-sli-line bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-sli-line px-3 py-2">
            <p className="text-sm font-semibold">Notifikasi</p>
            {unread > 0 ? (
              <button
                type="button"
                className="text-xs font-semibold text-sli-red hover:underline"
                onClick={() => void markAll()}
              >
                Tandai semua dibaca
              </button>
            ) : null}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-sli-muted">Belum ada notifikasi.</li>
            ) : (
              items.map((item) => (
                <li key={item.id} className={item.isRead ? "bg-white" : "bg-sli-red-soft/40"}>
                  <Link
                    href={hrefFor(item)}
                    className="block px-3 py-2.5 hover:bg-sli-red-soft/60"
                    onClick={() => void openItem(item)}
                  >
                    <p className="text-sm font-semibold text-sli-ink">{item.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-sli-muted">{item.body}</p>
                    <p className="mt-1 text-[10px] text-sli-muted">{formatDateTime(item.createdAt)}</p>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

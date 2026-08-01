"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import type { DashboardSummary, RequestRow } from "@/lib/types";

const COLORS = ["#b01020", "#7f0a16", "#d97706", "#0f7a4a", "#1d4f91", "#6b7280", "#be123c"];

export default function ApprovalDashboard() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [pending, setPending] = useState<RequestRow[]>([]);

  useEffect(() => {
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    void api<{ data: DashboardSummary }>(`/api/dashboard/summary?${qs}`).then((res) =>
      setSummary(res.data)
    );
    void api<{ data: RequestRow[] }>(
      "/api/requests?status=MENUNGGU_APPROVAL,DISETUJUI,LPJ_MENUNGGU&pageSize=8"
    ).then((res) => setPending(res.data));
  }, [from, to]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="brand-mark text-3xl font-bold">Dashboard Approval</h1>
          <p className="text-sli-muted">Pantau pendingan, nominal keluar, dan tren pengajuan.</p>
        </div>
        <div className="panel flex flex-wrap gap-2 rounded-2xl p-2">
          <input className="input !w-auto" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className="input !w-auto" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Masuk" value={String(summary?.cards.totalRequests ?? "—")} />
        <StatCard label="Pendingan" value={String(summary?.cards.pending ?? "—")} hint="Perlu tindakan" />
        <StatCard
          label="Sudah Dicairkan"
          value={String(summary?.cards.disbursedCount ?? "—")}
          accent="green"
        />
        <StatCard
          label="Box Nominal Keluar"
          value={summary ? formatRupiah(summary.cards.disbursedNominal) : "—"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="panel rounded-2xl p-5 lg:col-span-3">
          <h2 className="font-semibold">Grafik bulanan</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.monthlyChart || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8d5d8" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => formatRupiah(Number(v))} />
                <Bar dataKey="approvedAmount" name="Disetujui" fill="#0f7a4a" radius={[6, 6, 0, 0]} />
                <Bar dataKey="totalAmount" name="Diajukan" fill="#f2b8bf" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel rounded-2xl p-5 lg:col-span-2">
          <h2 className="font-semibold">Komposisi status</h2>
          <div className="mt-2 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summary?.statusChart || []}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {(summary?.statusChart || []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel rounded-2xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Antrian pending</h2>
            <Link href="/approval/requests" className="text-sm font-semibold text-sli-red">
              Semua
            </Link>
          </div>
          <ul className="space-y-3">
            {pending.map((row) => (
              <li key={row.id} className="flex items-start justify-between gap-3 border-b border-sli-line pb-3">
                <div>
                  <Link href={`/approval/requests/${row.id}`} className="font-semibold text-sli-red">
                    {row.number}
                  </Link>
                  <p className="text-sm">{row.title}</p>
                  <p className="text-xs text-sli-muted">{row.requester.name}</p>
                  <Link
                    href={`/dokumen/${row.id}`}
                    target="_blank"
                    className="mt-1 inline-block text-xs font-semibold text-sli-red/80 hover:underline"
                  >
                    Preview dokumen ↗
                  </Link>
                </div>
                <div className="text-right">
                  <StatusBadge status={row.status} label={row.statusLabel} />
                  <p className="mt-1 text-sm font-semibold">{formatRupiah(row.totalAmount)}</p>
                </div>
              </li>
            ))}
            {pending.length === 0 ? <li className="text-sm text-sli-muted">Tidak ada pendingan.</li> : null}
          </ul>
        </div>

        <div className="panel rounded-2xl p-5">
          <h2 className="font-semibold">Siapa saja yang mengajukan kepada Anda</h2>
          <ul className="mt-4 space-y-3">
            {(summary?.history || []).map((item) => (
              <li key={item.user.id} className="flex justify-between gap-3 border-b border-sli-line pb-3">
                <div>
                  <p className="font-semibold">{item.user.name}</p>
                  <p className="text-xs text-sli-muted">NIP {item.user.nip}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sli-red">{item.count}x</p>
                  <p className="text-xs text-sli-muted">{formatRupiah(item.totalAmount)}</p>
                </div>
              </li>
            ))}
            {(summary?.history || []).length === 0 ? (
              <li className="text-sm text-sli-muted">Belum ada riwayat.</li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}

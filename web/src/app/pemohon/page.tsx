"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import type { DashboardSummary, RequestRow } from "@/lib/types";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";

export default function PemohonDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recent, setRecent] = useState<RequestRow[]>([]);

  useEffect(() => {
    void Promise.all([
      api<{ data: DashboardSummary }>("/api/dashboard/summary?as=requester"),
      api<{ data: RequestRow[] }>("/api/requests?as=requester&pageSize=5"),
    ]).then(([s, r]) => {
      setSummary(s.data);
      setRecent(r.data);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="rise-in flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="brand-mark text-3xl font-bold text-sli-ink">Dashboard Pemohon</h1>
          <p className="mt-1 text-sli-muted">Ringkasan pengajuan Anda dan riwayat tujuan approval.</p>
        </div>
        <Link href="/pemohon/requests/new" className="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold">
          + Pengajuan Baru
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Pengajuan" value={String(summary?.cards.totalRequests ?? "—")} />
        <StatCard label="Menunggu Proses" value={String(summary?.cards.pending ?? "—")} accent="ink" />
        <StatCard
          label="Sudah Dicairkan"
          value={String(summary?.cards.disbursedCount ?? "—")}
          accent="green"
        />
        <StatCard
          label="Nominal Cair"
          value={summary ? formatRupiah(summary.cards.disbursedNominal) : "—"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="panel rise-in rise-in-delay-1 rounded-2xl p-5 lg:col-span-3">
          <h2 className="font-semibold">Tren Pengajuan (bulanan)</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.monthlyChart || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8d5d8" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => formatRupiah(Number(v))} />
                <Bar dataKey="totalAmount" fill="#b01020" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel rise-in rise-in-delay-2 rounded-2xl p-5 lg:col-span-2">
          <h2 className="font-semibold">Anda sudah mengajukan ke</h2>
          <ul className="mt-4 space-y-3">
            {(summary?.history || []).length === 0 ? (
              <li className="text-sm text-sli-muted">Belum ada riwayat pengajuan.</li>
            ) : (
              summary?.history.map((item) => (
                <li key={item.user.id} className="flex items-start justify-between gap-3 border-b border-sli-line pb-3">
                  <div>
                    <p className="font-semibold">{item.user.name}</p>
                    <p className="text-xs text-sli-muted">NIP {item.user.nip}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-sli-red">{item.count}x</p>
                    <p className="text-xs text-sli-muted">{formatRupiah(item.totalAmount)}</p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div className="panel rise-in rise-in-delay-3 rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Pengajuan terbaru</h2>
          <Link href="/pemohon/requests" className="text-sm font-semibold text-sli-red">
            Lihat semua
          </Link>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Nomor</th>
                <th>Judul</th>
                <th>Status</th>
                <th>Nominal</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {recent.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link href={`/pemohon/requests/${row.id}`} className="font-semibold text-sli-red">
                      {row.number}
                    </Link>
                  </td>
                  <td>{row.title}</td>
                  <td>
                    <StatusBadge status={row.status} label={row.statusLabel} />
                  </td>
                  <td>{formatRupiah(row.totalAmount)}</td>
                  <td className="text-right">
                    {row.status === "DRAFT" || row.status === "REVISI" ? (
                      <Link
                        href={`/pemohon/requests/${row.id}/edit`}
                        className="font-semibold text-sli-red hover:underline"
                      >
                        {row.status === "REVISI" ? "Revisi" : "Edit"}
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ))}
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-sli-muted">
                    Belum ada pengajuan.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

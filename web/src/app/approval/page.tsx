"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { downloadRequestsCsv } from "@/lib/exportCsv";
import { formatRupiah } from "@/lib/format";
import type { DashboardSummary, RequestRow } from "@/lib/types";

const MonthlyRequestChart = dynamic(
  () => import("@/components/DashboardCharts").then((module) => module.MonthlyRequestChart),
  { ssr: false }
);
const StatusPieChart = dynamic(
  () => import("@/components/DashboardCharts").then((module) => module.StatusPieChart),
  { ssr: false }
);

export default function ApprovalDashboard() {
  const { user } = useAuth();
  const [view, setView] = useState<"manager" | "approver">("manager");
  const isManager = view === "manager";
  const pendingStatus = isManager
    ? "MENUNGGU_MANAGER"
    : "MENUNGGU_APPROVAL,DISETUJUI,LPJ_MENUNGGU";
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [pending, setPending] = useState<RequestRow[]>([]);

  useEffect(() => {
    if (user && !user.canApprove && user.canDisburse) setView("approver");
  }, [user]);

  useEffect(() => {
    const qs = new URLSearchParams();
    qs.set("as", view);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    void api<{ data: DashboardSummary }>(`/api/dashboard/summary?${qs}`).then((res) =>
      setSummary(res.data)
    );
    void api<{ data: RequestRow[] }>(
      `/api/requests?as=${view}&status=${pendingStatus}&pageSize=8`
    ).then((res) => setPending(res.data));
  }, [from, to, pendingStatus, view]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="brand-mark text-3xl font-bold">
            {isManager ? "Dashboard Manager" : "Dashboard Approval"}
          </h1>
          <p className="text-sli-muted">
            {isManager
              ? "Pantau pengajuan departemen Anda dan putuskan approve / revisi / tolak."
              : "Pantau pendingan, nominal keluar, dan tren pengajuan."}
          </p>
        </div>
        <div className="panel flex flex-wrap items-center gap-2 rounded-2xl p-2">
          <input className="input !w-auto" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className="input !w-auto" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <button
            type="button"
            className="btn-ghost rounded-xl px-3 py-2 text-sm font-semibold"
            onClick={() => {
              const params = new URLSearchParams();
              params.set("status", pendingStatus);
              if (from) params.set("from", from);
              if (to) params.set("to", to);
              void downloadRequestsCsv(params, `antrian-approval-${new Date().toISOString().slice(0, 10)}.csv`);
            }}
          >
            Ekspor CSV
          </button>
        </div>
      </div>

      {user?.canApprove && user?.canDisburse ? <div className="flex gap-2">
        <button className={isManager ? "btn-primary rounded-xl px-4 py-2" : "btn-ghost rounded-xl px-4 py-2"} onClick={() => setView("manager")}>Approval Manager</button>
        <button className={!isManager ? "btn-primary rounded-xl px-4 py-2" : "btn-ghost rounded-xl px-4 py-2"} onClick={() => setView("approver")}>Pencairan</button>
      </div> : null}

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
          hint="Dari transaksi pencairan yang tercatat"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="panel rounded-2xl p-5 lg:col-span-3">
          <h2 className="font-semibold">Grafik bulanan</h2>
          <div className="mt-4 h-72">
            {summary ? <MonthlyRequestChart data={summary.monthlyChart} showDisbursed /> : null}
          </div>
        </div>
        <div className="panel rounded-2xl p-5 lg:col-span-2">
          <h2 className="font-semibold">Komposisi status</h2>
          <div className="mt-2 h-72">
            {summary ? <StatusPieChart data={summary.statusChart} /> : null}
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

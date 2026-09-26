"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { downloadRequestsCsv } from "@/lib/exportCsv";
import { formatDate, formatRupiah, trackLabel, typeLabel } from "@/lib/format";
import type { RequestRow } from "@/lib/types";

const MANAGER_PENDING = "MENUNGGU_MANAGER";
const APPROVER_PENDING = "MENUNGGU_APPROVAL,DISETUJUI,LPJ_MENUNGGU";

function ApprovalRequestsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const requestedView = searchParams.get("view") === "approver" ? "approver" : "manager";
  const [view, setView] = useState<"manager" | "approver">(requestedView);
  const isManager = view === "manager";
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(
    searchParams.get("status") || (requestedView === "manager" ? MANAGER_PENDING : APPROVER_PENDING)
  );
  const [track, setTrack] = useState("");
  const [from, setFrom] = useState(searchParams.get("from") || "");
  const [to, setTo] = useState(searchParams.get("to") || "");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    if (!user.canApprove && user.canDisburse) {
      setView("approver");
      if (!searchParams.get("status")) setStatus(APPROVER_PENDING);
    } else if (user.canApprove && !user.canDisburse) {
      setView("manager");
      if (!searchParams.get("status")) setStatus(MANAGER_PENDING);
    }
  }, [searchParams, user]);

  function changeView(nextView: "manager" | "approver") {
    setView(nextView);
    setStatus(nextView === "manager" ? MANAGER_PENDING : APPROVER_PENDING);
    setPage(1);
  }

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("as", view);
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (track) params.set("track", track);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("page", String(page));
    params.set("pageSize", "20");
    void api<{
      data: RequestRow[];
      pagination: { totalPages: number; total: number };
    }>(`/api/requests?${params}`).then((res) => {
      setRows(res.data);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    });
  }, [q, status, track, from, to, page, view]);

  async function onExport() {
    setError("");
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("as", view);
      if (q) params.set("q", q);
      if (status) params.set("status", status);
      if (track) params.set("track", track);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      await downloadRequestsCsv(params);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal ekspor");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="brand-mark text-3xl font-bold">Antrian & Riwayat</h1>
          <p className="text-sli-muted">
            {isManager
              ? "Pantau dan putuskan pengajuan dari departemen Anda. Gunakan pencarian untuk menemukan data."
              : "Filter berdasarkan status, jalur, dan rentang tanggal."}
          </p>
        </div>
        <button
          type="button"
          disabled={exporting}
          onClick={() => void onExport()}
          className="btn-ghost rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          {exporting ? "Mengunduh..." : "Ekspor CSV"}
        </button>
      </div>

      {user?.canApprove && user?.canDisburse ? <div className="flex gap-2">
        <button className={isManager ? "btn-primary rounded-xl px-4 py-2" : "btn-ghost rounded-xl px-4 py-2"} onClick={() => changeView("manager")}>Approval Manager</button>
        <button className={!isManager ? "btn-primary rounded-xl px-4 py-2" : "btn-ghost rounded-xl px-4 py-2"} onClick={() => changeView("approver")}>Pencairan</button>
      </div> : null}

      {error ? <div className="rounded-xl bg-sli-red-soft px-3 py-2 text-sm text-sli-red">{error}</div> : null}

      <div className="panel grid gap-3 rounded-2xl p-4 md:grid-cols-2 lg:grid-cols-5">
        <input
          className="input lg:col-span-2"
          placeholder="Cari NIP / nama / nomor..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="input"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <optgroup label="Ringkasan">
            {isManager ? (
              <option value={MANAGER_PENDING}>Pending manager (perlu tindakan)</option>
            ) : (
              <option value={APPROVER_PENDING}>Pending aktif (perlu tindakan)</option>
            )}
            <option value="">Semua status</option>
          </optgroup>
          <optgroup label="Urutan proses">
            <option value="MENUNGGU_MANAGER">1. Menunggu manager</option>
            <option value="MENUNGGU_APPROVAL">2. Menunggu approval</option>
            <option value="REVISI">3. Perlu revisi</option>
            <option value="DISETUJUI">4. Disetujui (siap cair)</option>
            <option value="DICAIRKAN">5. Dana dicairkan</option>
            <option value="LPJ_MENUNGGU">6. LPJ menunggu verifikasi</option>
            <option value="LPJ_DITOLAK">7. LPJ ditolak</option>
            <option value="SELESAI">8. Selesai</option>
          </optgroup>
          <optgroup label="Lainnya">
            <option value="DITOLAK">Ditolak</option>
            <option value="DIBATALKAN">Dibatalkan</option>
          </optgroup>
        </select>
        <select
          className="input"
          value={track}
          onChange={(e) => {
            setTrack(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua jalur</option>
          <option value="DIREKTUR">Sekretariat</option>
          <option value="FINANCE">Finance</option>
        </select>
        <div className="flex gap-2 lg:col-span-2">
          <input
            className="input"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
          <input
            className="input"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <p className="text-sm text-sli-muted">{total} pengajuan</p>

      <div className="panel overflow-x-auto rounded-2xl">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-sli-line bg-sli-cream/60 text-xs uppercase tracking-[0.08em] text-sli-muted">
            <tr>
              <th className="px-4 py-3">Nomor</th>
              <th className="px-4 py-3">Pemohon</th>
              <th className="px-4 py-3">Judul</th>
              <th className="px-4 py-3">Jalur</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Nominal</th>
              <th className="px-4 py-3">Tanggal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-sli-line/80 hover:bg-sli-cream/40">
                <td className="px-4 py-3">
                  <Link href={`/approval/requests/${row.id}`} className="font-semibold text-sli-red">
                    {row.number}
                  </Link>
                  <p className="text-xs text-sli-muted">{typeLabel(row.type)}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{row.requester.name}</p>
                  <p className="text-xs text-sli-muted">{row.requester.nip}</p>
                </td>
                <td className="max-w-[220px] truncate px-4 py-3">{row.title}</td>
                <td className="px-4 py-3">{trackLabel(row.track)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} label={row.statusLabel} />
                </td>
                <td className="px-4 py-3 text-right font-semibold">{formatRupiah(row.totalAmount)}</td>
                <td className="px-4 py-3">{formatDate(row.submittedAt || row.createdAt)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sli-muted">
                  Tidak ada data.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          className="btn-ghost rounded-xl px-3 py-2 text-sm font-semibold"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Sebelumnya
        </button>
        <p className="text-sm text-sli-muted">
          Halaman {page} / {totalPages}
        </p>
        <button
          type="button"
          className="btn-ghost rounded-xl px-3 py-2 text-sm font-semibold"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}

export default function ApprovalRequestsPage() {
  return (
    <Suspense fallback={<div className="panel rounded-2xl p-5 text-sm text-sli-muted">Memuat pengajuan...</div>}>
      <ApprovalRequestsContent />
    </Suspense>
  );
}

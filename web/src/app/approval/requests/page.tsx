"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { downloadRequestsCsv } from "@/lib/exportCsv";
import { calendarMonthRange, formatDate, formatRupiah, trackLabel, typeLabel } from "@/lib/format";
import type { RequestRow } from "@/lib/types";

const MANAGER_PENDING = "MENUNGGU_MANAGER";
const APPROVER_PENDING = "MENUNGGU_APPROVAL,DISETUJUI,LPJ_MENUNGGU";

function ApprovalRequestsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const requestedView = searchParams.get("view") === "approver" ? "approver" : "manager";
  const statusParam = searchParams.get("status");
  const [view, setView] = useState<"manager" | "approver">(requestedView);
  const isManager = view === "manager";
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [status, setStatus] = useState(
    statusParam !== null
      ? statusParam
      : requestedView === "manager"
        ? MANAGER_PENDING
        : APPROVER_PENDING
  );
  const [track, setTrack] = useState("");
  const [from, setFrom] = useState(searchParams.get("from") || "");
  const [to, setTo] = useState(searchParams.get("to") || "");
  const rawDateField = searchParams.get("dateField");
  const [dateField, setDateField] = useState<"createdAt" | "submittedAt" | "disbursedAt">(
    rawDateField === "submittedAt" || rawDateField === "disbursedAt" ? rawDateField : "createdAt"
  );
  const [requesterId, setRequesterId] = useState(searchParams.get("requesterId") || "");
  const [requesterName, setRequesterName] = useState(searchParams.get("requesterName") || "");
  const [sortBy, setSortBy] = useState<"status" | "totalAmount" | "createdAt" | "submittedAt">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  function toggleSort(field: "status" | "totalAmount" | "createdAt" | "submittedAt") {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir(field === "status" ? "asc" : "desc");
    }
    setPage(1);
  }

  function sortMark(field: typeof sortBy) {
    if (sortBy !== field) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  useEffect(() => {
    if (!user) return;
    if (!user.canApprove && user.canDisburse) {
      setView("approver");
      if (statusParam === null) setStatus(APPROVER_PENDING);
    } else if (user.canApprove && !user.canDisburse) {
      setView("manager");
      if (statusParam === null) setStatus(MANAGER_PENDING);
    }
  }, [searchParams, statusParam, user]);

  function changeView(nextView: "manager" | "approver") {
    setView(nextView);
    setStatus(nextView === "manager" ? MANAGER_PENDING : APPROVER_PENDING);
    setPage(1);
  }

  function applyMonthPreset(offset: number) {
    const range = calendarMonthRange(offset);
    setFrom(range.from);
    setTo(range.to);
    setPage(1);
  }

  function clearRequesterFilter() {
    setRequesterId("");
    setRequesterName("");
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
    if (dateField !== "createdAt") params.set("dateField", dateField);
    if (requesterId) params.set("requesterId", requesterId);
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    params.set("page", String(page));
    params.set("pageSize", "20");
    void api<{
      data: RequestRow[];
      pagination: { totalPages: number; total: number };
    }>(`/api/requests?${params}`).then((res) => {
      setRows(res.data);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
      if (requesterId && !requesterName && res.data[0]?.requester?.name) {
        setRequesterName(res.data[0].requester.name);
      }
    });
  }, [q, status, track, from, to, dateField, requesterId, requesterName, page, view, sortBy, sortDir]);

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
      if (dateField !== "createdAt") params.set("dateField", dateField);
      if (requesterId) params.set("requesterId", requesterId);
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
              : "Filter berdasarkan status, jalur, keyword, dan rentang tanggal."}
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

      {user?.canApprove && user?.canDisburse ? (
        <div className="flex gap-2">
          <button
            className={isManager ? "btn-primary rounded-xl px-4 py-2" : "btn-ghost rounded-xl px-4 py-2"}
            onClick={() => changeView("manager")}
          >
            Approval Manager
          </button>
          <button
            className={!isManager ? "btn-primary rounded-xl px-4 py-2" : "btn-ghost rounded-xl px-4 py-2"}
            onClick={() => changeView("approver")}
          >
            Pencairan
          </button>
        </div>
      ) : null}

      {error ? <div className="rounded-xl bg-sli-red-soft px-3 py-2 text-sm text-sli-red">{error}</div> : null}

      {requesterId ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sli-line bg-sli-cream/50 px-4 py-3 text-sm">
          <p>
            Riwayat pengajuan:{" "}
            <span className="font-semibold text-sli-ink">{requesterName || "Pemohon terpilih"}</span>
          </p>
          <button
            type="button"
            className="text-sm font-semibold text-sli-red hover:underline"
            onClick={clearRequesterFilter}
          >
            Hapus filter pemohon
          </button>
        </div>
      ) : null}

      <div className="panel grid gap-3 rounded-2xl p-4 md:grid-cols-2 lg:grid-cols-6">
        <input
          className="input lg:col-span-2"
          placeholder="Cari keyword: kudus, NIP, judul, outlet..."
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
        <select
          className="input"
          value={dateField}
          onChange={(e) => {
            setDateField(e.target.value as "createdAt" | "submittedAt" | "disbursedAt");
            setPage(1);
          }}
        >
          <option value="createdAt">Filter: tanggal buat</option>
          <option value="submittedAt">Filter: tanggal submit</option>
          <option value="disbursedAt">Filter: tanggal cair</option>
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
        <div className="flex flex-wrap gap-2 lg:col-span-6">
          <button
            type="button"
            className="btn-ghost rounded-xl px-3 py-1.5 text-xs font-semibold"
            onClick={() => applyMonthPreset(0)}
          >
            Bulan ini
          </button>
          <button
            type="button"
            className="btn-ghost rounded-xl px-3 py-1.5 text-xs font-semibold"
            onClick={() => applyMonthPreset(-1)}
          >
            Bulan lalu
          </button>
          <button
            type="button"
            className="btn-ghost rounded-xl px-3 py-1.5 text-xs font-semibold"
            onClick={() => {
              setFrom("");
              setTo("");
              setPage(1);
            }}
          >
            Reset tanggal
          </button>
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
              <th className="px-4 py-3">
                <button type="button" className="font-inherit uppercase tracking-[0.08em] hover:text-sli-ink" onClick={() => toggleSort("status")}>
                  Status{sortMark("status")}
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button type="button" className="font-inherit uppercase tracking-[0.08em] hover:text-sli-ink" onClick={() => toggleSort("totalAmount")}>
                  Nominal{sortMark("totalAmount")}
                </button>
              </th>
              <th className="px-4 py-3">
                <button type="button" className="font-inherit uppercase tracking-[0.08em] hover:text-sli-ink" onClick={() => toggleSort("submittedAt")}>
                  Tanggal{sortMark("submittedAt")}
                </button>
              </th>
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
                <td className="max-w-[220px] truncate px-4 py-3">
                  <p className="truncate">{row.title}</p>
                  {row.category?.name ? (
                    <p className="truncate text-xs text-sli-muted">{row.category.name}</p>
                  ) : null}
                </td>
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

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { downloadRequestsCsv } from "@/lib/exportCsv";
import { formatDate, formatRupiah, trackLabel, typeLabel } from "@/lib/format";
import type { RequestRow } from "@/lib/types";

export default function ApprovalRequestsPage() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("MENUNGGU_APPROVAL,DISETUJUI,LPJ_MENUNGGU");
  const [track, setTrack] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
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
  }, [q, status, track, from, to, page]);

  async function onExport() {
    setError("");
    setExporting(true);
    try {
      const params = new URLSearchParams();
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
          <p className="text-sli-muted">Filter berdasarkan status, jalur, dan rentang tanggal.</p>
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
            <option value="MENUNGGU_APPROVAL,DISETUJUI,LPJ_MENUNGGU">
              Pending aktif (perlu tindakan)
            </option>
            <option value="">Semua status</option>
          </optgroup>
          <optgroup label="Urutan proses">
            <option value="MENUNGGU_APPROVAL">1. Menunggu approval</option>
            <option value="REVISI">2. Perlu revisi</option>
            <option value="DISETUJUI">3. Disetujui (siap cair)</option>
            <option value="DICAIRKAN">4. Dana dicairkan</option>
            <option value="LPJ_MENUNGGU">5. LPJ menunggu verifikasi</option>
            <option value="LPJ_DITOLAK">6. LPJ ditolak</option>
            <option value="SELESAI">7. Selesai</option>
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
          <option value="DIREKTUR">Bu Sari</option>
          <option value="FINANCE">Finance</option>
        </select>
        <div className="grid grid-cols-2 gap-2">
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

      <div className="panel rounded-2xl p-4">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Nomor</th>
                <th>Pemohon</th>
                <th>Judul</th>
                <th>Jenis</th>
                <th>Jalur</th>
                <th>Status</th>
                <th>Nominal</th>
                <th>Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="flex flex-col gap-1">
                      <Link href={`/approval/requests/${row.id}`} className="font-semibold text-sli-red">
                        {row.number}
                      </Link>
                      <Link
                        href={`/dokumen/${row.id}`}
                        target="_blank"
                        className="text-xs font-semibold text-sli-muted hover:text-sli-red"
                      >
                        Preview dokumen ↗
                      </Link>
                    </div>
                  </td>
                  <td>
                    <p className="font-semibold">{row.requester.name}</p>
                    <p className="text-xs text-sli-muted">{row.requester.nip}</p>
                  </td>
                  <td>{row.title}</td>
                  <td>{typeLabel(row.type)}</td>
                  <td>{trackLabel(row.track)}</td>
                  <td>
                    <StatusBadge status={row.status} label={row.statusLabel} />
                  </td>
                  <td>{formatRupiah(row.totalAmount)}</td>
                  <td>{formatDate(row.createdAt)}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-sli-muted">
                    Tidak ada data pada filter ini.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-sli-muted">
          <span>
            {total} pengajuan · halaman {page}/{totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-ghost rounded-xl px-3 py-1.5 font-semibold disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Sebelumnya
            </button>
            <button
              type="button"
              className="btn-ghost rounded-xl px-3 py-1.5 font-semibold disabled:opacity-40"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Berikutnya
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

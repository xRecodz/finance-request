"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDate, formatRupiah, trackLabel, typeLabel } from "@/lib/format";
import type { RequestRow } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";

export default function PemohonRequestsPage() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [track, setTrack] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (track) params.set("track", track);
    if (type) params.set("type", type);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("page", String(page));
    params.set("pageSize", "20");
    params.set("as", "requester");
    void api<{
      data: RequestRow[];
      pagination: { totalPages: number; total: number };
    }>(`/api/requests?${params}`).then((res) => {
      setRows(res.data);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    });
  }, [q, status, track, type, from, to, page]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="brand-mark text-3xl font-bold">Pengajuan Saya</h1>
          <p className="text-sli-muted">Pantau semua permohonan yang Anda buat.</p>
        </div>
        <Link href="/pemohon/requests/new" className="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold">
          + Buat Pengajuan
        </Link>
      </div>

      <div className="panel grid gap-3 rounded-2xl p-4 md:grid-cols-3 lg:grid-cols-6">
        <input
          className="input md:col-span-2"
          placeholder="Cari nomor / judul..."
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
          <option value="">Semua status</option>
          <option value="DRAFT">1. Draft</option>
          <option value="MENUNGGU_MANAGER">2. Menunggu manager</option>
          <option value="MENUNGGU_APPROVAL">3. Menunggu approval</option>
          <option value="REVISI">4. Perlu revisi</option>
          <option value="DISETUJUI">5. Disetujui</option>
          <option value="DICAIRKAN">6. Dana dicairkan</option>
          <option value="LPJ_MENUNGGU">7. LPJ menunggu verifikasi</option>
          <option value="LPJ_DITOLAK">8. LPJ ditolak</option>
          <option value="SELESAI">9. Selesai</option>
          <option value="DITOLAK">Ditolak</option>
          <option value="DIBATALKAN">Dibatalkan</option>
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
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua jenis</option>
          <option value="DANA">Dana</option>
          <option value="BARANG">Barang</option>
          <option value="REIMBURSEMENT">Reimbursement</option>
        </select>
        <div className="grid grid-cols-2 gap-2 lg:col-span-1 md:col-span-3">
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
                <th>Judul</th>
                <th>Jenis</th>
                <th>Jalur</th>
                <th>Kepada</th>
                <th>Status</th>
                <th>Nominal</th>
                <th>Tanggal</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link className="font-semibold text-sli-red" href={`/pemohon/requests/${row.id}`}>
                      {row.number}
                    </Link>
                  </td>
                  <td>{row.title}</td>
                  <td>{typeLabel(row.type)}</td>
                  <td>{trackLabel(row.track)}</td>
                  <td>{row.approver.name}</td>
                  <td>
                    <StatusBadge status={row.status} label={row.statusLabel} />
                  </td>
                  <td>{formatRupiah(row.totalAmount)}</td>
                  <td>{formatDate(row.createdAt)}</td>
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
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-sli-muted">
                    Tidak ada data.
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

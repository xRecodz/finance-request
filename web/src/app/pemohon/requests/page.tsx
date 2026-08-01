"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDate, formatRupiah, trackLabel } from "@/lib/format";
import type { RequestRow } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";

export default function PemohonRequestsPage() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    params.set("pageSize", "50");
    void api<{ data: RequestRow[] }>(`/api/requests?${params}`).then((res) => setRows(res.data));
  }, [q, status]);

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

      <div className="panel grid gap-3 rounded-2xl p-4 md:grid-cols-2">
        <input
          className="input"
          placeholder="Cari nomor / judul..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Semua status</option>
          <option value="DRAFT">1. Draft</option>
          <option value="MENUNGGU_APPROVAL">2. Menunggu approval</option>
          <option value="REVISI">3. Perlu revisi</option>
          <option value="DISETUJUI">4. Disetujui</option>
          <option value="DICAIRKAN">5. Dana dicairkan</option>
          <option value="LPJ_MENUNGGU">6. LPJ menunggu verifikasi</option>
          <option value="LPJ_DITOLAK">7. LPJ ditolak</option>
          <option value="SELESAI">8. Selesai</option>
          <option value="DITOLAK">Ditolak</option>
          <option value="DIBATALKAN">Dibatalkan</option>
        </select>
      </div>

      <div className="panel rounded-2xl p-4">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Nomor</th>
                <th>Judul</th>
                <th>Jalur</th>
                <th>Kepada</th>
                <th>Status</th>
                <th>Nominal</th>
                <th>Tanggal</th>
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
                  <td>{trackLabel(row.track)}</td>
                  <td>{row.approver.name}</td>
                  <td>
                    <StatusBadge status={row.status} label={row.statusLabel} />
                  </td>
                  <td>{formatRupiah(row.totalAmount)}</td>
                  <td>{formatDate(row.createdAt)}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-sli-muted">
                    Tidak ada data.
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

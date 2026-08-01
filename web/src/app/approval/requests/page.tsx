"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { formatDate, formatRupiah, trackLabel } from "@/lib/format";
import type { RequestRow } from "@/lib/types";

export default function ApprovalRequestsPage() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("MENUNGGU_APPROVAL,DISETUJUI,LPJ_MENUNGGU");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("pageSize", "50");
    void api<{ data: RequestRow[] }>(`/api/requests?${params}`).then((res) => setRows(res.data));
  }, [q, status, from, to]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="brand-mark text-3xl font-bold">Antrian & Riwayat</h1>
        <p className="text-sli-muted">Filter berdasarkan status dan rentang tanggal.</p>
      </div>

      <div className="panel grid gap-3 rounded-2xl p-4 md:grid-cols-4">
        <input
          className="input md:col-span-2"
          placeholder="Cari NIP / nama / nomor..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
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
        <div className="grid grid-cols-2 gap-2">
          <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
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
                  <td colSpan={7} className="text-sli-muted">
                    Tidak ada data pada filter ini.
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

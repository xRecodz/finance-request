"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DocumentPreviewPanel } from "@/components/DocumentPreviewPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { api, ApiError } from "@/lib/api";
import { formatDate, formatDateTime, formatRupiah, trackLabel } from "@/lib/format";
import type { RequestRow } from "@/lib/types";

export default function PemohonRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<RequestRow | null>(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      const res = await api<{ data: RequestRow }>(`/api/requests/${params.id}`);
      setData(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat");
    }
  }

  useEffect(() => {
    void load();
  }, [params.id]);

  if (error) return <div className="rounded-xl bg-sli-red-soft p-4 text-sli-red">{error}</div>;
  if (!data) return <div className="text-sli-muted">Memuat pengajuan...</div>;

  const canLpj = ["DICAIRKAN", "LPJ_DITOLAK"].includes(data.status);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sli-muted">{data.number}</p>
          <h1 className="brand-mark mt-1 text-3xl font-bold">{data.title}</h1>
          <div className="mt-2">
            <StatusBadge status={data.status} label={data.statusLabel} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dokumen/${data.id}?print=1`}
            className="btn-ghost rounded-xl px-4 py-2 text-sm font-semibold"
            target="_blank"
          >
            Cetak / PDF
          </Link>
          {canLpj ? (
            <Link
              href={`/pemohon/requests/${data.id}/lpj`}
              className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold"
            >
              Upload LPJ
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Info label="Jalur" value={trackLabel(data.track)} />
        <Info label="Kepada" value={data.approver.name} />
        <Info label="Total" value={formatRupiah(data.totalAmount)} />
        <Info label="Disetujui" value={formatRupiah(data.approvedAmount)} />
        <Info label="Dibutuhkan" value={formatDate(data.neededDate)} />
        <Info label="Dikirim" value={formatDateTime(data.submittedAt)} />
      </div>

      <DocumentPreviewPanel data={data} />

      {data.lpj ? (
        <div className="panel rounded-2xl p-5">
          <h2 className="font-semibold">LPJ</h2>
          <p className="mt-2 text-sm text-sli-muted">
            Status: {data.lpj.status} · Realisasi {formatRupiah(data.lpj.totalRealisasi)} · Sisa{" "}
            {formatRupiah(data.lpj.sisaDana)}
          </p>
          {data.lpj.verificationNote ? (
            <p className="mt-2 text-sm text-sli-red">Catatan: {data.lpj.verificationNote}</p>
          ) : null}
        </div>
      ) : null}

      <div className="panel rounded-2xl p-5">
        <h2 className="mb-3 font-semibold">Riwayat proses</h2>
        <ul className="space-y-3">
          {(data.logs || []).map((log) => (
            <li key={log.id} className="border-b border-sli-line pb-3 text-sm">
              <p className="font-semibold">
                {log.action} · {log.actor?.name || "Sistem"}
              </p>
              <p className="text-sli-muted">{formatDateTime(log.createdAt)}</p>
              {log.note ? <p className="mt-1">{log.note}</p> : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel rounded-2xl p-4">
      <p className="text-xs uppercase tracking-[0.12em] text-sli-muted">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

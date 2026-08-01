"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DocumentPreviewPanel } from "@/components/DocumentPreviewPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, formatRupiah, trackLabel } from "@/lib/format";
import type { RequestRow } from "@/lib/types";

export default function ApprovalDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<RequestRow | null>(null);
  const [approvedAmount, setApprovedAmount] = useState(0);
  const [note, setNote] = useState("");
  const [disbursementRef, setDisbursementRef] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await api<{ data: RequestRow }>(`/api/requests/${params.id}`);
    setData(res.data);
    setApprovedAmount(res.data.approvedAmount ?? res.data.totalAmount);
  }

  useEffect(() => {
    void load();
  }, [params.id]);

  async function act(path: string, body?: BodyInit | object, isForm = false) {
    setBusy(true);
    setError("");
    try {
      if (isForm) {
        await api(path, { method: "POST", formData: body as FormData });
      } else {
        await api(path, { method: "POST", body: JSON.stringify(body || {}) });
      }
      await load();
      setNote("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Aksi gagal");
    } finally {
      setBusy(false);
    }
  }

  async function onApprove(e: FormEvent) {
    e.preventDefault();
    await act(`/api/approvals/${params.id}/approve`, { approvedAmount, note: note || null });
  }

  async function onReject() {
    if (!note.trim()) {
      setError("Alasan penolakan wajib diisi");
      return;
    }
    await act(`/api/approvals/${params.id}/reject`, { note });
  }

  async function onRevise() {
    if (!note.trim()) {
      setError("Catatan revisi wajib diisi");
      return;
    }
    await act(`/api/approvals/${params.id}/revise`, { note });
  }

  async function onDisburse(e: FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    if (disbursementRef) fd.append("disbursementRef", disbursementRef);
    if (note) fd.append("note", note);
    if (proof) fd.append("proof", proof);
    await act(`/api/approvals/${params.id}/disburse`, fd, true);
  }

  async function onVerifyLpj(approve: boolean) {
    if (!data?.lpj) return;
    if (!approve && !note.trim()) {
      setError("Alasan penolakan LPJ wajib diisi");
      return;
    }
    await act(`/api/lpj/${data.lpj.id}/verify`, { approve, note: note || null });
  }

  if (!data) return <div className="text-sli-muted">Memuat...</div>;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sli-muted">{data.number}</p>
        <h1 className="brand-mark mt-1 text-3xl font-bold">{data.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={data.status} label={data.statusLabel} />
          <span className="text-sm text-sli-muted">
            {data.requester.name} · {trackLabel(data.track)}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Box label="Diajukan" value={formatRupiah(data.totalAmount)} />
        <Box label="Disetujui" value={formatRupiah(data.approvedAmount)} />
        <Box label="Dikirim" value={formatDateTime(data.submittedAt)} />
      </div>

      <DocumentPreviewPanel data={data} />

      {error ? <div className="rounded-xl bg-sli-red-soft px-3 py-2 text-sm text-sli-red">{error}</div> : null}

      {data.status === "MENUNGGU_APPROVAL" ? (
        <form onSubmit={onApprove} className="panel space-y-3 rounded-2xl p-5">
          <h2 className="font-semibold">Keputusan approval</h2>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Nominal disetujui</span>
            <input
              className="input"
              type="number"
              min={0}
              max={data.totalAmount}
              value={approvedAmount}
              onChange={(e) => setApprovedAmount(Number(e.target.value))}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Catatan</span>
            <textarea className="input min-h-20" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold">
              Setujui
            </button>
            <button
              type="button"
              disabled={busy}
              className="btn-ghost rounded-xl px-4 py-2 text-sm font-semibold"
              onClick={() => void onRevise()}
            >
              Minta Revisi
            </button>
            <button
              type="button"
              disabled={busy}
              className="rounded-xl bg-sli-red-soft px-4 py-2 text-sm font-semibold text-sli-red"
              onClick={() => void onReject()}
            >
              Tolak
            </button>
          </div>
        </form>
      ) : null}

      {data.status === "DISETUJUI" ? (
        <form onSubmit={onDisburse} className="panel space-y-3 rounded-2xl p-5">
          <h2 className="font-semibold">Pencairan dana</h2>
          <input
            className="input"
            placeholder="Referensi transfer (opsional)"
            value={disbursementRef}
            onChange={(e) => setDisbursementRef(e.target.value)}
          />
          <textarea
            className="input min-h-20"
            placeholder="Catatan pencairan"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <input
            className="input"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            onChange={(e) => setProof(e.target.files?.[0] || null)}
          />
          <button type="submit" disabled={busy} className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold">
            Tandai Sudah Ditransfer
          </button>
        </form>
      ) : null}

      {data.status === "LPJ_MENUNGGU" && data.lpj ? (
        <div className="panel space-y-3 rounded-2xl p-5">
          <h2 className="font-semibold">Verifikasi LPJ</h2>
          <p className="text-sm text-sli-muted">
            Realisasi {formatRupiah(data.lpj.totalRealisasi)} · Sisa {formatRupiah(data.lpj.sisaDana)}
          </p>
          <ul className="space-y-2 text-sm">
            {(data.lpj.items || []).map((item) => (
              <li key={item.id} className="flex justify-between gap-3 border-b border-sli-line pb-2">
                <span>{item.description}</span>
                <span className="font-semibold">{formatRupiah(item.amount)}</span>
              </li>
            ))}
          </ul>
          <textarea
            className="input min-h-20"
            placeholder="Catatan verifikasi"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold"
              onClick={() => void onVerifyLpj(true)}
            >
              Setujui LPJ
            </button>
            <button
              type="button"
              disabled={busy}
              className="btn-ghost rounded-xl px-4 py-2 text-sm font-semibold"
              onClick={() => void onVerifyLpj(false)}
            >
              Tolak LPJ
            </button>
          </div>
        </div>
      ) : null}

      <div className="panel rounded-2xl p-5">
        <h2 className="mb-3 font-semibold">Timeline</h2>
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

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel rounded-2xl p-4">
      <p className="text-xs uppercase tracking-[0.12em] text-sli-muted">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

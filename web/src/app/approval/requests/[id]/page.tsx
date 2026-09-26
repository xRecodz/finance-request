"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, FileUp, Upload } from "lucide-react";
import { DocumentPreviewPanel } from "@/components/DocumentPreviewPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime, formatRupiah, trackLabel } from "@/lib/format";
import type { RequestRow } from "@/lib/types";

export default function ApprovalDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [data, setData] = useState<RequestRow | null>(null);
  const [approvedAmount, setApprovedAmount] = useState(0);
  const [note, setNote] = useState("");
  const [disbursementRef, setDisbursementRef] = useState("");
  const [disbursementAmount, setDisbursementAmount] = useState(0);
  const [proof, setProof] = useState<File | null>(null);
  const [missingProof, setMissingProof] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await api<{ data: RequestRow }>(`/api/requests/${params.id}`);
    setData(res.data);
    setApprovedAmount(res.data.approvedAmount ?? res.data.totalAmount);
    setDisbursementAmount(res.data.approvedAmount ?? res.data.totalAmount);
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

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
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Aksi gagal");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function onApprove(e: FormEvent) {
    e.preventDefault();
    const body =
      data?.status === "MENUNGGU_MANAGER"
        ? { note: note || null }
        : { approvedAmount, note: note || null };
    await act(`/api/approvals/${params.id}/approve`, body);
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
    if (!proof) {
      setError("Bukti transfer wajib dipilih sebelum menandai sudah ditransfer");
      return;
    }
    const fd = new FormData();
    if (disbursementRef) fd.append("disbursementRef", disbursementRef);
    fd.append("amount", String(disbursementAmount));
    if (note) fd.append("note", note);
    if (proof) fd.append("proof", proof);
    if (await act(`/api/approvals/${params.id}/disburse`, fd, true)) setProof(null);
  }

  async function onUploadMissingProof(e: FormEvent) {
    e.preventDefault();
    if (!missingProof) {
      setError("Pilih file bukti transfer terlebih dahulu");
      return;
    }
    const fd = new FormData();
    fd.append("proof", missingProof);
    if (await act(`/api/approvals/${params.id}/transfer-proof`, fd, true)) setMissingProof(null);
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

  const isPureManager = user?.role === "MANAGER";
  const canActAsAssignedManager =
    user?.role === "ADMIN" || Boolean(data.manager && user && data.manager.id === user.id);

  const stageLabel =
    data.status === "MENUNGGU_MANAGER"
      ? "Tahap Manager"
      : data.status === "MENUNGGU_APPROVAL"
        ? data.track === "DIREKTUR"
          ? "Tahap Sekretariat"
          : "Tahap Finance"
        : null;

  const showManagerDecision = data.status === "MENUNGGU_MANAGER" && canActAsAssignedManager;
  const assignedOfficer = user?.role === "ADMIN" || (data.workflowVersion && data.workflowVersion >= 2
    ? data.disbursementOfficer?.id === user?.id : data.approver?.id === user?.id);
  const showFinanceDecision = data.status === "MENUNGGU_APPROVAL" && !isPureManager && assignedOfficer;
  const showDisburse = data.status === "DISETUJUI" && assignedOfficer;
  const showLpjVerify = data.status === "LPJ_MENUNGGU" && data.lpj && assignedOfficer;
  const hasTransferProof = (data.attachments || []).some((file) => file.kind === "BUKTI_TRANSFER");
  const showMissingTransferProof =
    assignedOfficer &&
    ["DICAIRKAN", "LPJ_MENUNGGU", "LPJ_DITOLAK", "SELESAI"].includes(data.status) &&
    !hasTransferProof;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sli-muted">{data.number}</p>
        <h1 className="brand-mark mt-1 text-3xl font-bold">{data.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={data.status} label={data.statusLabel} />
          {stageLabel ? (
            <span className="rounded-full bg-sli-red-soft px-2.5 py-0.5 text-xs font-semibold text-sli-red">
              {stageLabel}
            </span>
          ) : null}
          <span className="text-sm text-sli-muted">
            {data.requester.name} · {trackLabel(data.track)}
          </span>
        </div>
        {data.manager ? (
          <p className="mt-1 text-sm text-sli-muted">Manager: {data.manager.name}</p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Box label="Diajukan" value={formatRupiah(data.totalAmount)} />
        <Box label="Disetujui" value={formatRupiah(data.approvedAmount)} />
        <Box label="Dikirim" value={formatDateTime(data.submittedAt)} />
      </div>

      <DocumentPreviewPanel data={data} onChanged={() => void load()} />

      {error ? <div className="rounded-xl bg-sli-red-soft px-3 py-2 text-sm text-sli-red">{error}</div> : null}

      {showManagerDecision ? (
        <form onSubmit={onApprove} className="panel space-y-3 rounded-2xl p-5">
          <h2 className="font-semibold">Keputusan manager</h2>
          <p className="text-sm text-sli-muted">
            Setujui untuk meneruskan ke petugas pencairan, atau minta revisi / tolak.
          </p>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Catatan</span>
            <textarea className="input min-h-20" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold">
              Setujui & teruskan ke pencairan
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

      {showFinanceDecision ? (
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

      {showDisburse ? (
        <form onSubmit={onDisburse} className="panel space-y-3 rounded-2xl p-5">
          <h2 className="font-semibold">Pencairan dana</h2>
          <label className="block"><span className="mb-1 block text-sm font-semibold">Nominal aktual dicairkan</span>
            <input className="input" type="number" min="1" max={data.approvedAmount ?? data.totalAmount}
              value={disbursementAmount} onChange={(e) => setDisbursementAmount(Number(e.target.value))} required />
          </label>
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
          <label className="block rounded-xl border-2 border-dashed border-sli-red/35 bg-sli-red-soft/40 p-4">
            <span className="flex items-center gap-2 font-semibold text-sli-red">
              <Upload size={19} /> Bukti transfer (wajib)
            </span>
            <span className="mt-1 block text-xs text-sli-muted">JPG, PNG, WEBP, HEIC, atau PDF. Pastikan file benar sebelum menyelesaikan transfer.</span>
            <input
              className="input mt-3 bg-white"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.heic,.pdf,image/jpeg,image/png,image/webp,image/heic,application/pdf"
              required
              onChange={(e) => setProof(e.target.files?.[0] || null)}
            />
            {proof ? <span className="mt-2 block text-xs font-semibold text-emerald-700">Dipilih: {proof.name}</span> : null}
          </label>
          <button type="submit" disabled={busy} className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold">
            <span className="inline-flex items-center gap-2"><FileUp size={17} /> Tandai Sudah Ditransfer</span>
          </button>
        </form>
      ) : null}

      {showMissingTransferProof ? (
        <form onSubmit={onUploadMissingProof} className="panel space-y-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-amber-700" size={22} />
            <div>
              <h2 className="font-semibold text-amber-950">Bukti transfer belum dilampirkan</h2>
              <p className="mt-1 text-sm text-amber-900">Dana sudah ditandai dicairkan. Lengkapi bukti agar dokumen pengajuan dan audit transaksi lengkap.</p>
            </div>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Perbaiki / upload bukti transfer</span>
            <input
              className="input bg-white"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.heic,.pdf,image/jpeg,image/png,image/webp,image/heic,application/pdf"
              required
              onChange={(e) => setMissingProof(e.target.files?.[0] || null)}
            />
          </label>
          <button type="submit" disabled={busy} className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
            <Upload size={17} /> Upload Bukti Transfer
          </button>
        </form>
      ) : null}

      {showLpjVerify ? (
        <div className="panel space-y-3 rounded-2xl p-5">
          <h2 className="font-semibold">Verifikasi LPJ</h2>
          <p className="text-sm text-sli-muted">
            Realisasi {formatRupiah(data.lpj!.totalRealisasi)} · Sisa {formatRupiah(data.lpj!.sisaDana)}
          </p>
          <ul className="space-y-2 text-sm">
            {(data.lpj!.items || []).map((item) => (
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

"use client";

import { FormEvent, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatRupiah } from "@/lib/format";

type Person = { id: string; nip: string; name: string; isActive: boolean } | null;
type RequestPreview = {
  id: string;
  number: string;
  title: string;
  status: string;
  totalAmount?: number | string;
  requester?: Person;
  manager: Person;
  disbursementOfficer: Person;
  approver: Person;
};

export default function ItDeleteRequestPage() {
  const [number, setNumber] = useState("");
  const [preview, setPreview] = useState<RequestPreview | null>(null);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSearching(true);
    try {
      const result = await api<{ data: RequestPreview }>(
        `/api/settings/request-preview?number=${encodeURIComponent(number.trim())}`
      );
      setPreview(result.data);
      setConfirm("");
      setReason("");
    } catch (err) {
      setPreview(null);
      setError(err instanceof ApiError ? err.message : "Pengajuan tidak ditemukan");
    } finally {
      setSearching(false);
    }
  }

  async function onDelete(event: FormEvent) {
    event.preventDefault();
    if (!preview) return;
    if (confirm.trim() !== preview.number) {
      setError("Ketik ulang nomor pengajuan dengan tepat untuk konfirmasi hapus");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api<{ message: string }>("/api/settings/delete-request", {
        method: "POST",
        body: JSON.stringify({ number: preview.number, reason: reason.trim() }),
      });
      setNotice(result.message);
      setPreview(null);
      setNumber("");
      setReason("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menghapus pengajuan");
    } finally {
      setBusy(false);
    }
  }

  const amount = preview?.totalAmount != null ? Number(preview.totalAmount) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:px-6">
      <div>
        <h1 className="text-2xl font-bold text-sli-ink">Hapus Pengajuan</h1>
        <p className="mt-1 text-sm text-sli-muted">
          Cari nomor pengajuan lalu hapus permanen beserta item, log, notifikasi, LPJ, dan pencairan.
          File lampiran di storage tidak ikut terhapus.
        </p>
      </div>

      {error ? <p className="rounded-xl bg-sli-red-soft p-3 text-sm text-sli-red">{error}</p> : null}
      {notice ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p> : null}

      <section className="panel rounded-2xl p-5">
        <h2 className="text-lg font-bold">Cari pengajuan</h2>
        <form className="mt-4 flex flex-wrap gap-2" onSubmit={onSearch}>
          <input
            className="input min-w-[230px] flex-1"
            value={number}
            onChange={(event) => setNumber(event.target.value)}
            placeholder="Contoh: SLI/FIN/2026/10/0005"
            required
          />
          <button type="submit" className="btn-primary rounded-xl px-4" disabled={searching}>
            {searching ? "Mencari..." : "Cari"}
          </button>
        </form>
      </section>

      {preview ? (
        <section className="panel space-y-4 rounded-2xl border border-red-200 p-5">
          <div>
            <h2 className="text-lg font-bold text-sli-ink">{preview.number}</h2>
            <p className="mt-1 text-sm font-semibold">{preview.title}</p>
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-sli-muted">Status</dt>
              <dd className="font-semibold">{preview.status}</dd>
            </div>
            <div>
              <dt className="text-sli-muted">Nominal</dt>
              <dd className="font-semibold">{amount != null ? formatRupiah(amount) : "—"}</dd>
            </div>
            <div>
              <dt className="text-sli-muted">Pemohon</dt>
              <dd className="font-semibold">
                {preview.requester?.name || "—"}
                {preview.requester?.nip ? ` · ${preview.requester.nip}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-sli-muted">Atasan / petugas</dt>
              <dd className="font-semibold">
                {preview.manager?.name || "—"} /{" "}
                {preview.disbursementOfficer?.name || preview.approver?.name || "—"}
              </dd>
            </div>
          </dl>

          <form className="space-y-3 border-t border-sli-line pt-4" onSubmit={onDelete}>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Alasan hapus</span>
              <input
                className="input"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Minimal 5 karakter"
                minLength={5}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">
                Ketik ulang nomor untuk konfirmasi
              </span>
              <input
                className="input"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder={preview.number}
                required
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-sli-red px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Menghapus..." : "Hapus pengajuan permanen"}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}

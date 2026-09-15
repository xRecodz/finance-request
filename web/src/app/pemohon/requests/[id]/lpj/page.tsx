"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import type { RequestRow } from "@/lib/types";

type LpjItemForm = {
  description: string;
  transactionDate: string;
  amount: number;
  vendor: string;
};

const empty = (): LpjItemForm => ({
  description: "",
  transactionDate: new Date().toISOString().slice(0, 10),
  amount: 0,
  vendor: "",
});

export default function LpjPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [request, setRequest] = useState<RequestRow | null>(null);
  const [items, setItems] = useState<LpjItemForm[]>([empty()]);
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void api<{ data: RequestRow }>(`/api/requests/${params.id}`).then((res) => setRequest(res.data));
  }, [params.id]);

  const total = items.reduce((s, i) => s + Number(i.amount || 0), 0);
  const diterima = request?.approvedAmount ?? request?.totalAmount ?? 0;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await api<{ data: RequestRow }>(`/api/requests/${params.id}/lpj`, {
        method: "POST",
        body: JSON.stringify({
          note: note || null,
          items: items.map((item) => ({
            description: item.description,
            transactionDate: item.transactionDate,
            amount: Number(item.amount),
            vendor: item.vendor || null,
          })),
        }),
      });

      if (files && files.length > 0 && res.data.lpj?.id) {
        const fd = new FormData();
        Array.from(files).forEach((f) => fd.append("files", f));
        await api(`/api/lpj/${res.data.lpj.id}/attachments`, {
          method: "POST",
          formData: fd,
        });
      }

      router.replace(`/pemohon/requests/${params.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengirim LPJ");
    } finally {
      setSaving(false);
    }
  }

  if (!request) return <div className="text-sli-muted">Memuat...</div>;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <h1 className="brand-mark text-3xl font-bold">Laporan Pertanggungjawaban</h1>
        <p className="text-sli-muted">
          {request.number} · Dana diterima {formatRupiah(diterima)}
        </p>
      </div>

      <div className="panel space-y-3 rounded-2xl p-5">
        {items.map((item, index) => (
          <div key={index} className="grid gap-2 rounded-xl border border-sli-line p-3 md:grid-cols-4">
            <input
              className="input md:col-span-2"
              placeholder="Keterangan transaksi"
              value={item.description}
              onChange={(e) =>
                setItems((prev) =>
                  prev.map((row, i) => (i === index ? { ...row, description: e.target.value } : row))
                )
              }
              required
            />
            <input
              className="input"
              type="date"
              value={item.transactionDate}
              onChange={(e) =>
                setItems((prev) =>
                  prev.map((row, i) =>
                    i === index ? { ...row, transactionDate: e.target.value } : row
                  )
                )
              }
              required
            />
            <input
              className="input"
              type="number"
              min={0}
              placeholder="Nominal"
              value={item.amount}
              onChange={(e) =>
                setItems((prev) =>
                  prev.map((row, i) =>
                    i === index ? { ...row, amount: Number(e.target.value) } : row
                  )
                )
              }
              required
            />
          </div>
        ))}
        <button
          type="button"
          className="btn-ghost rounded-xl px-3 py-1.5 text-sm font-semibold"
          onClick={() => setItems((prev) => [...prev, empty()])}
        >
          + Transaksi
        </button>
        <div className="flex flex-wrap justify-between gap-2 border-t border-sli-line pt-3 text-sm">
          <span>Realisasi: <strong>{formatRupiah(total)}</strong></span>
          <span>
            Sisa dana: <strong className="text-sli-red">{formatRupiah(diterima - total)}</strong>
          </span>
        </div>
      </div>

      <div className="panel space-y-3 rounded-2xl p-5">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Catatan</span>
          <textarea className="input min-h-24" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Bukti transaksi (JPG/PNG/PDF)</span>
          <input
            className="input"
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            onChange={(e) => setFiles(e.target.files)}
          />
        </label>
      </div>

      {error ? <div className="rounded-xl bg-sli-red-soft px-3 py-2 text-sm text-sli-red">{error}</div> : null}

      <button type="submit" disabled={saving} className="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold">
        {saving ? "Mengirim..." : "Kirim LPJ"}
      </button>
    </form>
  );
}

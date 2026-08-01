"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDate, formatRupiah, trackLabel } from "@/lib/format";
import type { RequestRow } from "@/lib/types";

export default function PrintRequestPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<RequestRow | null>(null);

  useEffect(() => {
    void api<{ data: RequestRow }>(`/api/requests/${params.id}`).then((res) => setData(res.data));
  }, [params.id]);

  useEffect(() => {
    if (!data) return;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [data]);

  if (!data) return <div className="p-8">Menyiapkan dokumen cetak...</div>;

  return (
    <div className="min-h-screen bg-white px-6 py-8 text-black">
      <div className="no-print mb-4 flex gap-2">
        <button
          type="button"
          className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold"
          onClick={() => window.print()}
        >
          Cetak / Save as PDF
        </button>
        <button
          type="button"
          className="btn-ghost rounded-lg px-4 py-2 text-sm font-semibold"
          onClick={() => window.close()}
        >
          Tutup
        </button>
      </div>

      <article className="print-sheet mx-auto max-w-3xl border border-neutral-300 p-8">
        <header className="border-b-2 border-[#b01020] pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#b01020]">
            Formulir Permohonan Finance
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-[#b01020]">
            SL INDONESIA
          </h1>
          <p className="mt-1 text-sm text-neutral-600">Nomor: {data.number}</p>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <Row label="Judul" value={data.title} />
          <Row label="Status" value={data.statusLabel} />
          <Row label="Pemohon" value={`${data.requester.name} (${data.requester.nip})`} />
          <Row label="Approver" value={`${data.approver.name} · ${trackLabel(data.track)}`} />
          <Row label="Tanggal dibutuhkan" value={formatDate(data.neededDate)} />
          <Row label="Total" value={formatRupiah(data.totalAmount)} />
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide">Keperluan</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{data.purpose}</p>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">Rincian Item</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-neutral-100">
                <th className="border border-neutral-300 px-2 py-2 text-left">Item</th>
                <th className="border border-neutral-300 px-2 py-2 text-left">Qty</th>
                <th className="border border-neutral-300 px-2 py-2 text-right">Harga</th>
                <th className="border border-neutral-300 px-2 py-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {(data.items || []).map((item) => (
                <tr key={item.id || item.name}>
                  <td className="border border-neutral-300 px-2 py-2">{item.name}</td>
                  <td className="border border-neutral-300 px-2 py-2">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="border border-neutral-300 px-2 py-2 text-right">
                    {formatRupiah(item.unitPrice)}
                  </td>
                  <td className="border border-neutral-300 px-2 py-2 text-right">
                    {formatRupiah(item.subtotal ?? item.quantity * item.unitPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="border border-neutral-300 px-2 py-2 text-right font-bold">
                  Total
                </td>
                <td className="border border-neutral-300 px-2 py-2 text-right font-bold">
                  {formatRupiah(data.totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        {(data.bankName || data.bankAccountNumber) && (
          <section className="mt-6 text-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide">Rekening</h2>
            <p className="mt-2">
              {data.bankName} · {data.bankAccountNumber} a.n. {data.bankAccountHolder}
            </p>
          </section>
        )}

        <section className="mt-12 grid grid-cols-2 gap-8 text-center text-sm">
          <div>
            <p>Pemohon</p>
            <div className="mt-16 border-t border-neutral-400 pt-2">{data.requester.name}</div>
          </div>
          <div>
            <p>Menyetujui</p>
            <div className="mt-16 border-t border-neutral-400 pt-2">{data.approver.name}</div>
          </div>
        </section>

        <p className="mt-8 text-center text-[11px] text-neutral-500">
          Dokumen ini digenerate dari sistem Finance SL INDONESIA. Versi HTML — siap dicetak / Save
          as PDF dari browser.
        </p>
      </article>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-neutral-200 py-1">
      <p className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

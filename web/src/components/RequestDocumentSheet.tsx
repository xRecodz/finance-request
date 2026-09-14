"use client";

import { formatDate, formatRupiah, trackLabel, typeLabel } from "@/lib/format";
import type { RequestRow } from "@/lib/types";

/** Lembar dokumen compact (~setengah A4) untuk preview / cetak. */
export function RequestDocumentSheet({ data }: { data: RequestRow }) {
  return (
    <article className="print-sheet mx-auto bg-white text-black shadow-none">
      <header className="border-b border-[#b01020] pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#b01020]">
              Formulir Permohonan Finance
            </p>
            <h1 className="mt-0.5 font-serif text-xl font-bold tracking-tight text-[#b01020]">
              SL INDONESIA
            </h1>
          </div>
          <div className="rounded border border-[#b01020]/30 px-2 py-1 text-right text-[10px] leading-tight">
            <p className="font-semibold text-[#b01020]">DOC</p>
            <p className="text-neutral-600">{data.statusLabel}</p>
          </div>
        </div>
        <p className="mt-1.5 text-[11px] text-neutral-600">
          Nomor: <strong>{data.number}</strong>
        </p>
      </header>

      <section className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <Row label="Judul" value={data.title} />
        <Row label="Jenis" value={typeLabel(data.type)} />
        <Row label="Pemohon" value={`${data.requester.name} (${data.requester.nip})`} />
        <Row label="Jalur" value={trackLabel(data.track)} />
        <Row label="Menyetujui" value={data.approver.name} />
        <Row label="Tgl dibutuhkan" value={formatDate(data.neededDate)} />
        <Row label="Total diajukan" value={formatRupiah(data.totalAmount)} />
        {data.approvedAmount != null ? (
          <Row label="Nominal disetujui" value={formatRupiah(data.approvedAmount)} />
        ) : null}
        {data.category ? <Row label="Kategori" value={data.category.name} /> : null}
      </section>

      <section className="mt-2.5">
        <h2 className="text-[9px] font-bold uppercase tracking-wide text-neutral-700">Keperluan</h2>
        <p className="mt-1 whitespace-pre-wrap text-[11px] leading-snug text-neutral-800">
          {data.purpose}
        </p>
      </section>

      <section className="mt-2.5">
        <h2 className="mb-1 text-[9px] font-bold uppercase tracking-wide text-neutral-700">
          Rincian Item
        </h2>
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-neutral-100">
              <th className="border border-neutral-300 px-1.5 py-1 text-left">Item</th>
              <th className="border border-neutral-300 px-1.5 py-1 text-left">Qty</th>
              <th className="border border-neutral-300 px-1.5 py-1 text-right">Harga</th>
              <th className="border border-neutral-300 px-1.5 py-1 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {(data.items || []).map((item) => (
              <tr key={item.id || item.name}>
                <td className="border border-neutral-300 px-1.5 py-1">
                  <p className="font-medium leading-tight">{item.name}</p>
                  {item.spec ? <p className="text-[9px] text-neutral-500">{item.spec}</p> : null}
                </td>
                <td className="border border-neutral-300 px-1.5 py-1 whitespace-nowrap">
                  {item.quantity} {item.unit}
                </td>
                <td className="border border-neutral-300 px-1.5 py-1 text-right whitespace-nowrap">
                  {formatRupiah(item.unitPrice)}
                </td>
                <td className="border border-neutral-300 px-1.5 py-1 text-right whitespace-nowrap">
                  {formatRupiah(item.subtotal ?? item.quantity * item.unitPrice)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="border border-neutral-300 px-1.5 py-1 text-right font-bold">
                Total
              </td>
              <td className="border border-neutral-300 px-1.5 py-1 text-right font-bold">
                {formatRupiah(data.totalAmount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      {(data.bankName || data.bankAccountNumber) && (
        <section className="mt-2.5 text-[11px]">
          <h2 className="text-[9px] font-bold uppercase tracking-wide text-neutral-700">Rekening</h2>
          <p className="mt-1 leading-snug">
            {data.bankName} · {data.bankAccountNumber} a.n. {data.bankAccountHolder}
          </p>
        </section>
      )}

      <section className="mt-5 grid grid-cols-2 gap-6 text-center text-[11px]">
        <div>
          <p className="text-neutral-600">Pemohon</p>
          <div className="mt-8 border-t border-neutral-400 pt-1 font-medium">
            {data.requester.name}
          </div>
        </div>
        <div>
          <p className="text-neutral-600">Menyetujui</p>
          <div className="mt-8 border-t border-neutral-400 pt-1 font-medium">
            {data.approver.name}
          </div>
        </div>
      </section>

      <p className="mt-3 text-center text-[8px] text-neutral-400">
        Dokumen sistem Finance SL INDONESIA — cetak / PDF dari browser (ukuran ~½ A4).
      </p>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-neutral-200 py-0.5">
      <p className="text-[8px] uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="font-medium leading-tight text-neutral-900">{value}</p>
    </div>
  );
}

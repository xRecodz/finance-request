"use client";

import { formatDate, formatRupiah, trackLabel } from "@/lib/format";
import type { RequestRow } from "@/lib/types";

/** Lembar dokumen bergaya PDF untuk preview / cetak. */
export function RequestDocumentSheet({ data }: { data: RequestRow }) {
  return (
    <article className="print-sheet mx-auto max-w-[794px] bg-white text-black shadow-none">
      <header className="border-b-2 border-[#b01020] pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#b01020]">
              Formulir Permohonan Finance
            </p>
            <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-[#b01020]">
              SL INDONESIA
            </h1>
          </div>
          <div className="rounded border border-[#b01020]/30 px-3 py-2 text-right text-xs">
            <p className="font-semibold text-[#b01020]">DOC PREVIEW</p>
            <p className="mt-0.5 text-neutral-600">{data.statusLabel}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-neutral-600">Nomor: <strong>{data.number}</strong></p>
      </header>

      <section className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <Row label="Judul" value={data.title} />
        <Row label="Jenis" value={data.type} />
        <Row label="Pemohon" value={`${data.requester.name} (${data.requester.nip})`} />
        <Row label="Approver" value={`${data.approver.name} · ${trackLabel(data.track)}`} />
        <Row label="Tanggal dibutuhkan" value={formatDate(data.neededDate)} />
        <Row label="Total diajukan" value={formatRupiah(data.totalAmount)} />
        {data.approvedAmount != null ? (
          <Row label="Nominal disetujui" value={formatRupiah(data.approvedAmount)} />
        ) : null}
        {data.category ? <Row label="Kategori" value={data.category.name} /> : null}
      </section>

      <section className="mt-5">
        <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-700">Keperluan</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">
          {data.purpose}
        </p>
      </section>

      <section className="mt-5">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-700">
          Rincian Item
        </h2>
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
                <td className="border border-neutral-300 px-2 py-2">
                  <p className="font-medium">{item.name}</p>
                  {item.spec ? <p className="text-xs text-neutral-500">{item.spec}</p> : null}
                </td>
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
        <section className="mt-5 text-sm">
          <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-700">Rekening</h2>
          <p className="mt-2">
            {data.bankName} · {data.bankAccountNumber} a.n. {data.bankAccountHolder}
          </p>
        </section>
      )}

      <section className="mt-10 grid grid-cols-2 gap-8 text-center text-sm">
        <div>
          <p className="text-neutral-600">Pemohon</p>
          <div className="mt-14 border-t border-neutral-400 pt-2 font-medium">
            {data.requester.name}
          </div>
        </div>
        <div>
          <p className="text-neutral-600">Menyetujui</p>
          <div className="mt-14 border-t border-neutral-400 pt-2 font-medium">
            {data.approver.name}
          </div>
        </div>
      </section>

      <p className="mt-8 text-center text-[10px] text-neutral-400">
        Preview dokumen sistem Finance SL INDONESIA — dapat dicetak / disimpan sebagai PDF dari
        browser.
      </p>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-neutral-200 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="font-medium text-neutral-900">{value}</p>
    </div>
  );
}

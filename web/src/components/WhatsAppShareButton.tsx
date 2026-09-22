"use client";

import { useMemo, useState } from "react";
import { Check, Copy, MessageCircle, X } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import type { RequestRow } from "@/lib/types";

function statusSentence(data: RequestRow): string {
  if (["DICAIRKAN", "LPJ_MENUNGGU", "LPJ_DITOLAK", "SELESAI"].includes(data.status)) {
    return "sudah di-approve dan dicairkan";
  }
  if (data.status === "DISETUJUI") return "sudah di-approve dan sedang menunggu pencairan";
  if (data.status === "REVISI") return "memerlukan revisi dari pemohon";
  if (data.status === "DITOLAK") return "ditolak";
  if (["MENUNGGU_MANAGER", "MENUNGGU_APPROVAL"].includes(data.status)) {
    return "sedang menunggu approval";
  }
  if (data.status === "DRAFT") return "masih berupa draft";
  if (data.status === "DIBATALKAN") return "dibatalkan";
  return `berstatus ${data.statusLabel}`;
}

function shareText(data: RequestRow): string {
  const origin = typeof window === "undefined" ? "https://pengajuan.slcorp.or.id" : window.location.origin;
  const amount = data.approvedAmount ?? data.totalAmount;
  return [
    `FYI, Pengajuan ${data.number} — ${data.title} ${statusSentence(data)}.`,
    `Pemohon: ${data.requester.name}`,
    `Nominal: ${formatRupiah(amount)}`,
    `Info lebih lanjut bisa cek ${origin}`,
  ].join("\n");
}

export function WhatsAppShareButton({ data }: { data: RequestRow }) {
  const initialMessage = useMemo(() => shareText(data), [data]);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [copied, setCopied] = useState(false);

  function showDialog() {
    setMessage(shareText(data));
    setCopied(false);
    setOpen(true);
  }

  function openWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(message.trim())}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function copyMessage() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <>
      <button
        type="button"
        onClick={showDialog}
        className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#1fb85a]"
      >
        <MessageCircle size={16} aria-hidden="true" /> WhatsApp
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="whatsapp-share-title">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="whatsapp-share-title" className="text-lg font-bold text-sli-ink">Bagikan ke WhatsApp</h2>
                <p className="mt-1 text-sm text-sli-muted">Periksa atau edit teks, lalu pilih penerima di WhatsApp.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-sli-muted hover:bg-sli-red-soft hover:text-sli-red" aria-label="Tutup">
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-semibold">Pesan</span>
              <textarea
                className="input min-h-44 resize-y"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={2000}
              />
            </label>

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => void copyMessage()} className="btn-ghost inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Tersalin" : "Salin teks"}
              </button>
              <button type="button" disabled={!message.trim()} onClick={openWhatsApp} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                <MessageCircle size={17} /> Buka WhatsApp
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

"use client";

import { useMemo, useRef, useState } from "react";
import { Download, ExternalLink, FileText, Paperclip, Printer, Trash2, Upload } from "lucide-react";
import { AttachmentPreview, AttachmentThumb } from "@/components/AttachmentPreview";
import { RequestDocumentSheet } from "@/components/RequestDocumentSheet";
import { api, ApiError, getToken } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { RequestRow } from "@/lib/types";

type Tab = "form" | "file";

type FileRow = {
  id: string;
  originalFilename: string;
  mimeType?: string;
  kind: string;
  label: string;
};

/**
 * Panel preview dokumen pengajuan (lembar PDF-like) + lampiran pendukung.
 * Dipakai di halaman detail approval / pemohon.
 */
export function DocumentPreviewPanel({
  data,
  onChanged,
}: {
  data: RequestRow;
  onChanged?: () => void;
}) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentRef = useRef<HTMLDivElement>(null);
  const attachments = useMemo(
    () =>
      (data.attachments || []).filter((f) =>
        ["PENDUKUNG", "BUKTI_TRANSFER", "BUKTI_LPJ"].includes(f.kind)
      ),
    [data.attachments]
  );
  const lpjFiles = data.lpj?.attachments || [];
  const allFiles: FileRow[] = [
    ...attachments.map((f) => ({ ...f, label: f.kind })),
    ...lpjFiles.map((f) => ({
      id: f.id,
      originalFilename: f.originalFilename,
      mimeType: f.mimeType,
      kind: f.kind || "BUKTI_LPJ",
      label: "BUKTI_LPJ",
    })),
  ];

  const [tab, setTab] = useState<Tab>("form");
  const [fileId, setFileId] = useState<string | null>(allFiles[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const activeFile = allFiles.find((f) => f.id === fileId) || allFiles[0] || null;

  const isRequester = user?.id === data.requester.id;
  const canManagePendukung =
    isRequester && ["DRAFT", "REVISI"].includes(data.status);

  async function downloadDocument(format: "png" | "pdf") {
    if (!documentRef.current) return;
    setBusy(true); setError("");
    try {
      const { toPng } = await import("html-to-image");
      const png = await toPng(documentRef.current, { backgroundColor: "#ffffff", pixelRatio: 2, cacheBust: true });
      const filename = data.number.replace(/[^a-zA-Z0-9-_]/g, "-");
      if (format === "png") {
        const link = document.createElement("a");
        link.href = png; link.download = `${filename}.png`; link.click();
      } else {
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const image = pdf.getImageProperties(png);
        const margin = 10;
        const width = 210 - margin * 2;
        const height = image.height * width / image.width;
        const pageHeight = 297 - margin * 2;
        const pages = Math.ceil(height / pageHeight);
        for (let page = 0; page < pages; page++) {
          if (page) pdf.addPage();
          pdf.addImage(png, "PNG", margin, margin - page * pageHeight, width, height);
        }
        pdf.save(`${filename}.pdf`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyiapkan dokumen");
    } finally { setBusy(false); }
  }

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    setBusy(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      const headers = new Headers();
      const token = getToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      const res = await fetch(`/api/requests/${data.id}/attachments`, {
        method: "POST",
        headers,
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new ApiError(json.error || "Gagal unggah", res.status);
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal unggah");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function removeFile(id: string) {
    if (!window.confirm("Hapus lampiran ini?")) return;
    setError("");
    setBusy(true);
    try {
      await api(`/api/attachments/${id}`, { method: "DELETE" });
      if (fileId === id) setFileId(null);
      onChanged?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menghapus");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sli-line bg-white/70 px-4 py-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <FileText size={18} className="text-sli-red" />
            Preview dokumen
          </h2>
          <p className="text-xs text-sli-muted">
            Formulir pengajuan + lampiran (PDF/gambar) yang diunggah pemohon
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy || tab !== "form"} onClick={() => void downloadDocument("pdf")} className="btn-ghost inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold disabled:opacity-40"><Download size={15}/> PDF</button>
          <button type="button" disabled={busy || tab !== "form"} onClick={() => void downloadDocument("png")} className="btn-ghost inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold disabled:opacity-40"><Download size={15}/> PNG</button>
          <a
            href={`/dokumen/${data.id}?print=1`}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold"
          >
            <Printer size={15} /> Cetak / PDF
          </a>
          <a
            href={`/dokumen/${data.id}`}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold"
          >
            <ExternalLink size={15} /> Layar penuh
          </a>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-sli-line px-4 py-2">
        <button
          type="button"
          onClick={() => setTab("form")}
          className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
            tab === "form" ? "bg-sli-red text-white" : "bg-sli-red-soft text-sli-red"
          }`}
        >
          Formulir pengajuan
        </button>
        <button
          type="button"
          onClick={() => setTab("file")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${
            tab === "file" ? "bg-sli-red text-white" : "bg-sli-red-soft text-sli-red"
          }`}
        >
          <Paperclip size={14} />
          Lampiran ({allFiles.length})
        </button>
      </div>

      {error ? (
        <div className="mx-4 mt-3 rounded-xl bg-sli-red-soft px-3 py-2 text-sm text-sli-red">{error}</div>
      ) : null}

      {tab === "form" ? (
        <div className="max-h-[75vh] overflow-auto bg-[#ece4e6] p-3 md:p-4">
          <div ref={documentRef} className="print-frame mx-auto max-w-[190mm] rounded-sm bg-white p-4 shadow-xl shadow-black/15 md:p-5">
            <RequestDocumentSheet data={data} />
          </div>
        </div>
      ) : (
        <div className="grid gap-3 p-4 lg:grid-cols-[240px_1fr]">
          <div className="space-y-2">
            {canManagePendukung ? (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => void uploadFiles(e.target.files)}
                />
                <button
                  type="button"
                  disabled={busy}
                  className="btn-ghost mb-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} />
                  {busy ? "Memproses..." : "Unggah / ganti lampiran"}
                </button>
                <p className="mb-2 text-[11px] text-sli-muted">
                  Hapus file salah lalu unggah yang benar (saat draft/revisi).
                </p>
              </div>
            ) : null}
            {allFiles.length === 0 ? (
              <p className="rounded-xl border border-dashed border-sli-line p-4 text-sm text-sli-muted">
                Belum ada lampiran yang diunggah.
              </p>
            ) : (
              allFiles.map((file) => (
                <div key={file.id} className="space-y-1">
                  <AttachmentThumb
                    file={{
                      id: file.id,
                      originalFilename: file.originalFilename,
                      mimeType: file.mimeType || "application/octet-stream",
                      kind: file.kind,
                    }}
                    selected={activeFile?.id === file.id}
                    onSelect={() => setFileId(file.id)}
                  />
                  {canManagePendukung && file.kind === "PENDUKUNG" ? (
                    <button
                      type="button"
                      disabled={busy}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-sli-muted hover:text-sli-red"
                      onClick={() => void removeFile(file.id)}
                    >
                      <Trash2 size={12} /> Hapus
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>
          <div>
            {activeFile ? (
              <AttachmentPreview
                file={{
                  id: activeFile.id,
                  originalFilename: activeFile.originalFilename,
                  mimeType: activeFile.mimeType || "application/octet-stream",
                  kind: activeFile.kind,
                }}
                active={tab === "file"}
              />
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-sli-muted">
                Pilih lampiran untuk preview
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

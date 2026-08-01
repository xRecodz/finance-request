"use client";

import { useMemo, useState } from "react";
import { ExternalLink, FileText, Paperclip, Printer } from "lucide-react";
import { AttachmentPreview, AttachmentThumb } from "@/components/AttachmentPreview";
import { RequestDocumentSheet } from "@/components/RequestDocumentSheet";
import type { RequestRow } from "@/lib/types";

type Tab = "form" | "file";

/**
 * Panel preview dokumen pengajuan (lembar PDF-like) + lampiran pendukung.
 * Dipakai di halaman detail approval / pemohon.
 */
export function DocumentPreviewPanel({ data }: { data: RequestRow }) {
  const attachments = useMemo(
    () =>
      (data.attachments || []).filter((f) =>
        ["PENDUKUNG", "BUKTI_TRANSFER", "BUKTI_LPJ"].includes(f.kind)
      ),
    [data.attachments]
  );
  const lpjFiles = data.lpj?.attachments || [];
  const allFiles = [
    ...attachments.map((f) => ({ ...f, label: f.kind })),
    ...lpjFiles.map((f) => ({ ...f, kind: f.kind || "BUKTI_LPJ", label: "BUKTI_LPJ" })),
  ];

  const [tab, setTab] = useState<Tab>("form");
  const [fileId, setFileId] = useState<string | null>(allFiles[0]?.id ?? null);
  const activeFile = allFiles.find((f) => f.id === fileId) || allFiles[0] || null;

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

      {tab === "form" ? (
        <div className="max-h-[75vh] overflow-auto bg-[#ece4e6] p-4 md:p-6">
          <div className="mx-auto origin-top scale-[0.98] rounded-sm bg-white p-6 shadow-xl shadow-black/15 md:p-8">
            <RequestDocumentSheet data={data} />
          </div>
        </div>
      ) : (
        <div className="grid gap-3 p-4 lg:grid-cols-[240px_1fr]">
          <div className="space-y-2">
            {allFiles.length === 0 ? (
              <p className="rounded-xl border border-dashed border-sli-line p-4 text-sm text-sli-muted">
                Belum ada lampiran yang diunggah.
              </p>
            ) : (
              allFiles.map((file) => (
                <AttachmentThumb
                  key={file.id}
                  file={{
                    id: file.id,
                    originalFilename: file.originalFilename,
                    mimeType: file.mimeType || "application/octet-stream",
                    kind: file.kind,
                  }}
                  selected={activeFile?.id === file.id}
                  onSelect={() => setFileId(file.id)}
                />
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

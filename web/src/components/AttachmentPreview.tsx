"use client";

import { useEffect, useState } from "react";
import { FileText, ImageIcon, Loader2 } from "lucide-react";
import { getToken } from "@/lib/api";

type Attachment = {
  id: string;
  originalFilename: string;
  mimeType: string;
  kind?: string;
};

/** Preview lampiran PDF/gambar via blob URL ber-auth. */
export function AttachmentPreview({
  file,
  active,
}: {
  file: Attachment;
  active?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (active === false) return;
    let objectUrl: string | null = null;
    let cancelled = false;

    async function load() {
      try {
        const token = getToken();
        const res = await fetch(`/api/attachments/${file.id}/file`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error("Gagal memuat file");
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setUrl(objectUrl);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Preview gagal");
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.id, active]);

  const mime = file.mimeType || "";
  const isPdf = mime.includes("pdf") || file.originalFilename.toLowerCase().endsWith(".pdf");
  const isImage = mime.startsWith("image/");

  if (error) {
    return <div className="rounded-xl bg-sli-red-soft p-4 text-sm text-sli-red">{error}</div>;
  }

  if (!url) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-sli-muted">
        <Loader2 className="animate-spin" size={18} /> Memuat preview...
      </div>
    );
  }

  if (isPdf) {
    return (
      <iframe
        title={file.originalFilename}
        src={url}
        className="h-[70vh] w-full rounded-xl border border-sli-line bg-white"
      />
    );
  }

  if (isImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={file.originalFilename}
        className="max-h-[70vh] w-full rounded-xl border border-sli-line object-contain bg-neutral-50"
      />
    );
  }

  return (
    <div className="rounded-xl border border-sli-line bg-white p-6 text-sm text-sli-muted">
      Format ini belum bisa di-preview di browser. Unduh untuk membuka.
    </div>
  );
}

export function AttachmentThumb({
  file,
  selected,
  onSelect,
}: {
  file: Attachment;
  selected: boolean;
  onSelect: () => void;
}) {
  const isPdf = file.mimeType.includes("pdf");
  const Icon = isPdf ? FileText : ImageIcon;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition ${
        selected
          ? "border-sli-red bg-sli-red-soft text-sli-red"
          : "border-sli-line bg-white hover:border-sli-red/40"
      }`}
    >
      <Icon size={16} />
      <span className="truncate font-medium">{file.originalFilename}</span>
    </button>
  );
}

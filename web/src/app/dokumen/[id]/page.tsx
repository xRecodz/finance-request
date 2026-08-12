"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { RequestDocumentSheet } from "@/components/RequestDocumentSheet";
import { api } from "@/lib/api";
import type { RequestRow } from "@/lib/types";

function DokumenContent() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const autoPrint = search.get("print") === "1";
  const [data, setData] = useState<RequestRow | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void api<{ data: RequestRow }>(`/api/requests/${params.id}`)
      .then((res) => setData(res.data))
      .catch(() => setError("Dokumen tidak ditemukan atau sesi habis. Login ulang lalu buka lagi."));
  }, [params.id]);

  useEffect(() => {
    if (!data || !autoPrint) return;
    const t = setTimeout(() => window.print(), 350);
    return () => clearTimeout(t);
  }, [data, autoPrint]);

  if (error) {
    return <div className="flex min-h-screen items-center justify-center p-6 text-sli-red">{error}</div>;
  }
  if (!data) {
    return <div className="flex min-h-screen items-center justify-center p-6 text-sli-muted">Memuat dokumen...</div>;
  }

  return (
    <div className="min-h-screen bg-[#e8e0e2] px-3 py-6 md:px-6">
      <div className="no-print mx-auto mb-4 flex max-w-[190mm] flex-wrap gap-2">
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
      <div className="print-frame mx-auto max-w-[190mm] rounded-sm bg-white p-4 shadow-2xl md:p-5">
        <RequestDocumentSheet data={data} />
      </div>
    </div>
  );
}

export default function DokumenPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sli-muted">Memuat...</div>}>
      <DokumenContent />
    </Suspense>
  );
}

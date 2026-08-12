"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { RequestDocumentSheet } from "@/components/RequestDocumentSheet";
import { api } from "@/lib/api";
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
    <div className="min-h-screen bg-white px-4 py-6 text-black">
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

      <div className="print-frame mx-auto max-w-[190mm] border border-neutral-300 p-4">
        <RequestDocumentSheet data={data} />
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RequestForm } from "@/components/RequestForm";
import { api, ApiError } from "@/lib/api";
import type { RequestRow } from "@/lib/types";
import { uploadRequestAttachments } from "@/lib/requestAttachments";

const EDITABLE = new Set(["DRAFT", "REVISI"]);

export default function EditRequestPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<RequestRow | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void api<{ data: RequestRow }>(`/api/requests/${params.id}`)
      .then((res) => {
        if (!EDITABLE.has(res.data.status)) {
          setError("Pengajuan ini tidak bisa diedit. Hanya draft atau yang diminta revisi.");
          return;
        }
        setData(res.data);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Gagal memuat pengajuan");
      });
  }, [params.id]);

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-sli-red-soft p-4 text-sli-red">{error}</div>
        <Link href={`/pemohon/requests/${params.id}`} className="font-semibold text-sli-red hover:underline">
          Kembali ke detail
        </Link>
      </div>
    );
  }

  if (!data) return <div className="text-sli-muted">Memuat pengajuan...</div>;

  return (
    <RequestForm
      mode="edit"
      initial={data}
      onSave={async (payload, submitNow, files) => {
        const mustUploadBeforeSubmit = files.length > 0;
        await api(`/api/requests/${data.id}`, {
          method: "PATCH",
          body: JSON.stringify({ ...payload, submit: mustUploadBeforeSubmit ? false : submitNow }),
        });
        await uploadRequestAttachments(data.id, files);
        if (submitNow && mustUploadBeforeSubmit) {
          await api(`/api/requests/${data.id}/submit`, { method: "POST" });
        }
        router.replace(`/pemohon/requests/${data.id}`);
      }}
    />
  );
}

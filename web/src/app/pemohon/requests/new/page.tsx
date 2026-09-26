"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RequestForm } from "@/components/RequestForm";
import { api } from "@/lib/api";
import { uploadRequestAttachments } from "@/lib/requestAttachments";

export default function NewRequestPage() {
  const router = useRouter();
  const [createdDraftId, setCreatedDraftId] = useState<string | null>(null);

  return (
    <RequestForm
      mode="create"
      onSave={async (payload, submitNow, files) => {
        const mustUploadBeforeSubmit = files.length > 0 || (payload.type === "REIMBURSEMENT" && submitNow);
        const saved = createdDraftId
          ? await api<{ data: { id: string } }>(`/api/requests/${createdDraftId}`, {
              method: "PATCH",
              body: JSON.stringify({ ...payload, submit: mustUploadBeforeSubmit ? false : submitNow }),
            })
          : await api<{ data: { id: string } }>("/api/requests", {
              method: "POST",
              body: JSON.stringify({ ...payload, submit: mustUploadBeforeSubmit ? false : submitNow }),
            });
        setCreatedDraftId(saved.data.id);
        await uploadRequestAttachments(saved.data.id, files);
        if (submitNow && mustUploadBeforeSubmit) {
          await api(`/api/requests/${saved.data.id}/submit`, { method: "POST" });
        }
        router.replace(`/pemohon/requests/${saved.data.id}`);
      }}
    />
  );
}

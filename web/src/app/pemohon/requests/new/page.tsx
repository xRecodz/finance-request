"use client";

import { useRouter } from "next/navigation";
import { RequestForm } from "@/components/RequestForm";
import { api } from "@/lib/api";

export default function NewRequestPage() {
  const router = useRouter();

  return (
    <RequestForm
      mode="create"
      onSave={async (payload) => {
        const res = await api<{ data: { id: string } }>("/api/requests", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        router.replace(`/pemohon/requests/${res.data.id}`);
      }}
    />
  );
}

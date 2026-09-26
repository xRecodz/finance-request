import { api } from "@/lib/api";

export async function uploadRequestAttachments(requestId: string, files: File[]): Promise<void> {
  if (files.length === 0) return;
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  await api(`/api/requests/${requestId}/attachments`, {
    method: "POST",
    formData,
  });
}

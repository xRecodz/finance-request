import { prisma } from "./prisma";

export function notify(params: {
  userId: string;
  title: string;
  body: string;
  requestId?: string | null;
}): void {
  prisma.notification
    .create({
      data: {
        userId: params.userId,
        title: params.title,
        body: params.body,
        requestId: params.requestId ?? null,
      },
    })
    .catch((error) => console.error("Gagal membuat notifikasi:", error));
}

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

import { prisma } from "./prisma";
import { sendEmail, isSmtpConfigured } from "./email";
import { env } from "../config/env";
import { UserRole } from "@prisma/client";

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
    .then(async () => {
      if (!isSmtpConfigured()) return;
      const user = await prisma.user.findUnique({
        where: { id: params.userId },
        select: { email: true, name: true, role: true },
      });
      if (!user?.email) return;

      const base = (env.APP_PUBLIC_URL || "http://localhost:3000").replace(/\/$/, "");
      let link = base;
      if (params.requestId) {
        const portal =
          user.role === UserRole.APPROVER || user.role === UserRole.ADMIN
            ? "approval"
            : "pemohon";
        link = `${base}/${portal}/requests/${params.requestId}`;
      }

      await sendEmail({
        to: user.email,
        subject: `[${env.APP_NAME}] ${params.title}`,
        text: `Halo ${user.name},\n\n${params.body}\n\nBuka sistem: ${link}\n`,
      });
    })
    .catch((error) => console.error("Gagal membuat/kirim notifikasi:", error));
}

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

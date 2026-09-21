/** Isi ledger pencairan untuk pengajuan lama. Aman dijalankan ulang. */
import "dotenv/config";
import { Prisma, RequestStatus } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

async function main() {
  const rows = await prisma.request.findMany({
    where: {
      workflowVersion: 1,
      disbursedAt: { not: null },
      status: { in: [RequestStatus.DICAIRKAN, RequestStatus.LPJ_MENUNGGU, RequestStatus.LPJ_DITOLAK, RequestStatus.SELESAI] },
      disbursements: { none: {} },
    },
    select: { id: true, approverId: true, disbursedAt: true, approvedAmount: true, totalAmount: true, disbursementRef: true },
  });
  let created = 0;
  for (const row of rows) {
    await prisma.$transaction(async tx => {
      const existing = await tx.disbursement.count({ where: { requestId: row.id } });
      if (existing) return;
      await tx.disbursement.create({ data: {
        requestId: row.id,
        officerId: row.approverId,
        amount: new Prisma.Decimal(row.approvedAmount ?? row.totalAmount),
        disbursedAt: row.disbursedAt!,
        reference: row.disbursementRef,
        source: "LEGACY_BACKFILL",
      } });
      created++;
    });
  }
  console.log(`Backfill selesai: ${created} pencairan lama dicatat.`);
}

main().finally(() => prisma.$disconnect());

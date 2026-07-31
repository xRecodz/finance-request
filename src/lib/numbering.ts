import { Prisma } from "@prisma/client";
import { env } from "../config/env";

/**
 * Nomor pengajuan berurut per bulan: SLI/FIN/2026/07/0001.
 * Dipanggil di dalam transaksi supaya dua pengajuan bersamaan tidak dapat nomor sama.
 */
export async function generateRequestNumber(
  tx: Prisma.TransactionClient,
  date = new Date()
): Promise<string> {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const period = `${year}-${month}`;

  const counter = await tx.requestCounter.upsert({
    where: { period },
    create: { period, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });

  const sequence = String(counter.lastNumber).padStart(4, "0");
  return `${env.REQUEST_NUMBER_PREFIX}/${year}/${month}/${sequence}`;
}

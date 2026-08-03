/**
 * Hapus semua pengajuan terkait NIP tertentu (sebagai pemohon maupun tujuan approval).
 * Usage:
 *   npx tsx scripts/delete-requests-by-nip.ts 1511.1.77.00020 2510.1.01.79957
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const nips = process.argv.slice(2).map((n) => n.trim()).filter(Boolean);

async function main() {
  if (nips.length === 0) {
    console.error("Usage: npx tsx scripts/delete-requests-by-nip.ts <NIP> [NIP...]");
    process.exit(1);
  }

  const users = await prisma.user.findMany({
    where: { nip: { in: nips } },
    select: { id: true, nip: true, name: true },
  });

  if (users.length === 0) {
    console.log("Tidak ada user dengan NIP tersebut.");
    return;
  }

  for (const u of users) {
    console.log(`Ditemukan: ${u.nip} — ${u.name}`);
  }

  const ids = users.map((u) => u.id);
  const related = await prisma.request.findMany({
    where: {
      OR: [{ requesterId: { in: ids } }, { approverId: { in: ids } }],
    },
    select: { id: true, number: true, title: true, requesterId: true, approverId: true },
  });

  console.log(`Pengajuan terkait: ${related.length}`);
  for (const r of related) {
    console.log(`  - ${r.number} | ${r.title}`);
  }

  if (related.length === 0) {
    console.log("Tidak ada data pengajuan untuk dihapus.");
    return;
  }

  const requestIds = related.map((r) => r.id);

  // Hapus turunan yang tidak selalu ikut cascade dari Request (aman berlapis).
  await prisma.notification.deleteMany({ where: { requestId: { in: requestIds } } });
  await prisma.approvalLog.deleteMany({ where: { requestId: { in: requestIds } } });
  await prisma.attachment.deleteMany({ where: { requestId: { in: requestIds } } });

  const deleted = await prisma.request.deleteMany({
    where: { id: { in: requestIds } },
  });

  console.log(`Selesai. Pengajuan terhapus: ${deleted.count}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient, UserRole } from "@prisma/client";
import { APPROVER_WHITELIST, LEGACY_TEST_NIPS } from "../prisma/whitelist-approvers";

const prisma = new PrismaClient();

async function main() {
  const legacy = await prisma.user.findMany({
    where: { nip: { in: [...LEGACY_TEST_NIPS] } },
    select: { id: true, nip: true },
  });

  if (legacy.length) {
    const ids = legacy.map((u) => u.id);
    const delReq = await prisma.request.deleteMany({
      where: { OR: [{ requesterId: { in: ids } }, { approverId: { in: ids } }] },
    });
    await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
    await prisma.activityLog.deleteMany({ where: { actorId: { in: ids } } });
    await prisma.approvalLog.deleteMany({ where: { actorId: { in: ids } } });
    await prisma.attachment.deleteMany({ where: { uploadedById: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    console.log("Deleted legacy:", legacy.map((u) => u.nip).join(", "), "| requests:", delReq.count);
  } else {
    console.log("Tidak ada akun uji DIR001/FIN001/ADMIN001.");
  }

  for (const row of APPROVER_WHITELIST) {
    const u = await prisma.user.update({
      where: { nip: row.nip },
      data: {
        role: row.role,
        approverTrack: row.approverTrack,
        isActive: true,
      },
    });
    console.log(`Whitelist ${u.nip} | ${u.name} | ${u.role} | ${u.approverTrack}`);
  }

  const demoted = await prisma.user.updateMany({
    where: {
      role: { in: [UserRole.APPROVER, UserRole.ADMIN] },
      nip: { notIn: APPROVER_WHITELIST.map((w) => w.nip) },
    },
    data: { role: UserRole.PEMOHON, approverTrack: null },
  });
  console.log("Demoted non-whitelist approvers:", demoted.count);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

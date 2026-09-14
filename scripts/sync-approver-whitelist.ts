import bcrypt from "bcryptjs";
import { PrismaClient, UserRole, UserSource } from "@prisma/client";
import {
  APPROVER_WHITELIST,
  DEMOTED_FROM_APPROVER_NIPS,
  LEGACY_TEST_NIPS,
} from "../prisma/whitelist-approvers";

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || "100100";

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

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  for (const row of APPROVER_WHITELIST) {
    const existing = await prisma.user.findUnique({ where: { nip: row.nip } });
    if (!existing) {
      const name = row.nameHint.replace(/\s*\([^)]*\)\s*/g, "").trim() || row.nameHint;
      const created = await prisma.user.create({
        data: {
          nip: row.nip,
          name,
          role: row.role,
          approverTrack: row.approverTrack,
          passwordHash,
          mustChangePassword: true,
          isActive: true,
          source: UserSource.MANUAL,
        },
      });
      console.log(
        `Created+whitelist ${created.nip} | ${created.name} | ${created.role} | ${created.approverTrack} (password default)`
      );
      continue;
    }

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

  // Turunkan Farhan, Handoyo, dll. agar tidak muncul di dropdown tujuan.
  const demotedNamed = await prisma.user.updateMany({
    where: { nip: { in: [...DEMOTED_FROM_APPROVER_NIPS] } },
    data: { role: UserRole.PEMOHON, approverTrack: null },
  });
  console.log("Diturunkan ke Pemohon (Farhan/Handoyo):", demotedNamed.count);

  const demoted = await prisma.user.updateMany({
    where: {
      // Jangan turunkan ADMIN / IT — hanya Approver di luar whitelist.
      role: UserRole.APPROVER,
      nip: { notIn: APPROVER_WHITELIST.map((w) => w.nip) },
    },
    data: { role: UserRole.PEMOHON, approverTrack: null },
  });
  console.log("Demoted non-whitelist approvers:", demoted.count);

  const dropdown = await prisma.user.findMany({
    where: { role: UserRole.APPROVER, isActive: true },
    select: { nip: true, name: true, approverTrack: true },
    orderBy: { approverTrack: "asc" },
  });
  console.log("Opsi 'pengajuan kepada' sekarang:");
  for (const a of dropdown) {
    console.log(`  - ${a.approverTrack}: ${a.name} (${a.nip})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

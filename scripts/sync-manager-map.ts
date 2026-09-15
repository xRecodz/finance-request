import { PrismaClient, UserRole } from "@prisma/client";
import {
  DEPARTMENT_MANAGER_MAP,
  MANAGER_NIPS,
  managerNipsFromMap,
} from "../src/lib/managerMap";

const prisma = new PrismaClient();

/** NIP yang juga APPROVER (dual-role) — jangan diturunkan ke MANAGER-only. */
const KEEP_AS_APPROVER = new Set<string>([
  MANAGER_NIPS.GA_HRD, // Sari — Sekretariat + manager GA/HRD
]);

async function main() {
  const nips = managerNipsFromMap();
  if (nips.length === 0) {
    console.log("Manager map masih kosong.");
    return;
  }

  console.log("Departemen exact → Manager NIP:");
  for (const [dept, nip] of Object.entries(DEPARTMENT_MANAGER_MAP)) {
    console.log(`  - ${dept} → ${nip}`);
  }
  console.log("NIP manager:", nips.join(", "));

  let promoted = 0;
  let keptApprover = 0;
  let missing = 0;

  for (const nip of nips) {
    const existing = await prisma.user.findUnique({ where: { nip } });
    if (!existing) {
      console.warn(`  ! User NIP ${nip} belum ada di database — lewati`);
      missing += 1;
      continue;
    }

    if (existing.role === UserRole.ADMIN || existing.role === UserRole.IT) {
      console.log(`  ~ Skip ${nip} (${existing.name}) — role ${existing.role}`);
      continue;
    }

    if (KEEP_AS_APPROVER.has(nip) || existing.role === UserRole.APPROVER) {
      // Dual-role: biarkan APPROVER (Sekretariat) tapi pastikan aktif.
      if (existing.role === UserRole.APPROVER) {
        await prisma.user.update({
          where: { nip },
          data: { isActive: true },
        });
        console.log(
          `  = Dual-role APPROVER ${existing.nip} | ${existing.name} | track ${existing.approverTrack} (juga manager map)`
        );
        keptApprover += 1;
        continue;
      }
    }

    const u = await prisma.user.update({
      where: { nip },
      data: {
        role: UserRole.MANAGER,
        approverTrack: null,
        isActive: true,
      },
    });
    console.log(`  + MANAGER ${u.nip} | ${u.name}`);
    promoted += 1;
  }

  const demoted = await prisma.user.updateMany({
    where: {
      role: UserRole.MANAGER,
      nip: { notIn: nips },
    },
    data: { role: UserRole.PEMOHON, approverTrack: null },
  });

  console.log(`Promoted to MANAGER: ${promoted}`);
  console.log(`Kept as APPROVER (dual): ${keptApprover}`);
  console.log(`Missing users: ${missing}`);
  console.log(`Demoted former managers: ${demoted.count}`);

  const managers = await prisma.user.findMany({
    where: {
      OR: [{ role: UserRole.MANAGER }, { nip: { in: nips } }],
      isActive: true,
    },
    select: { nip: true, name: true, role: true, department: true, approverTrack: true },
    orderBy: { name: "asc" },
  });
  console.log("Akun di map manager:");
  for (const m of managers.filter((u) => nips.includes(u.nip))) {
    console.log(
      `  - ${m.name} (${m.nip}) | role=${m.role}${m.approverTrack ? `/${m.approverTrack}` : ""}`
    );
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

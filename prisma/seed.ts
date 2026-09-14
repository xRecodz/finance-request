import { PrismaClient, UserRole, UserSource } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { APPROVER_WHITELIST, LEGACY_TEST_NIPS } from "./whitelist-approvers";
import { CATEGORY_MASTER } from "./categories";

const prisma = new PrismaClient();

type HrisEmployee = {
  nip: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  department?: string | null;
  isActive?: boolean;
};

const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || "100100";

async function applyApproverWhitelist() {
  for (const row of APPROVER_WHITELIST) {
    const existing = await prisma.user.findUnique({ where: { nip: row.nip } });
    if (!existing) {
      console.warn(`  ! NIP whitelist belum ada di DB: ${row.nip} (${row.nameHint})`);
      continue;
    }
    await prisma.user.update({
      where: { nip: row.nip },
      data: {
        role: row.role,
        approverTrack: row.approverTrack,
        isActive: true,
      },
    });
    console.log(
      `  ✓ ${row.nip} → ${row.role}${row.approverTrack ? ` / ${row.approverTrack}` : ""} (${existing.name})`
    );
  }
}

async function removeLegacyTestUsers() {
  const legacy = await prisma.user.findMany({
    where: { nip: { in: [...LEGACY_TEST_NIPS] } },
    select: { id: true, nip: true },
  });
  if (legacy.length === 0) return;

  const ids = legacy.map((u) => u.id);
  // Hapus pengajuan yang terkait akun uji agar FK tidak menghalangi.
  await prisma.request.deleteMany({
    where: {
      OR: [{ requesterId: { in: ids } }, { approverId: { in: ids } }],
    },
  });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  console.log(`Akun uji dihapus: ${legacy.map((u) => u.nip).join(", ")}`);
}

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  console.log(`Password default: ${DEFAULT_PASSWORD}`);

  for (const category of CATEGORY_MASTER) {
    await prisma.category.upsert({
      where: { code: category.code },
      create: { ...category, description: `Kategori ${category.name}` },
      update: { name: category.name, sortOrder: category.sortOrder, isActive: true },
    });
  }

  await prisma.category.updateMany({
    where: { code: { notIn: CATEGORY_MASTER.map((c) => c.code) }, isActive: true },
    data: { isActive: false },
  });

  await removeLegacyTestUsers();

  const dataPath = path.resolve(__dirname, "data/hris-employees.json");
  if (!fs.existsSync(dataPath)) {
    console.warn(`File ${dataPath} tidak ditemukan. Skip import NIP HRIS.`);
    console.warn("Jalankan: npm run hris:extract");
  } else {
    const employees = JSON.parse(fs.readFileSync(dataPath, "utf8")) as HrisEmployee[];
    const rows = employees
      .map((emp) => ({
        nip: String(emp.nip || "").trim(),
        name: String(emp.name || "").trim(),
        email: emp.email || null,
        phone: emp.phone || null,
        position: emp.position || null,
        department: emp.department || null,
        role: UserRole.PEMOHON,
        passwordHash,
        mustChangePassword: true,
        isActive: emp.isActive !== false,
        source: UserSource.HRIS,
      }))
      .filter((emp) => emp.nip && emp.name);

    console.log(`Mengimpor ${rows.length} NIP dari HRIS (createMany, skipDuplicates)...`);

    const batchSize = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const result = await prisma.user.createMany({
        data: batch,
        skipDuplicates: true,
      });
      inserted += result.count;
      process.stdout.write(`\r  progress ${Math.min(i + batchSize, rows.length)}/${rows.length}`);
    }
    console.log(`\nBaris baru dimasukkan: ${inserted}`);
  }

  console.log("Menerapkan whitelist Approval / Admin...");
  await applyApproverWhitelist();

  const total = await prisma.user.count();
  const approvers = await prisma.user.count({
    where: { role: { in: [UserRole.APPROVER, UserRole.ADMIN] } },
  });
  console.log(`Total user: ${total}. Role Approval/Admin: ${approvers}`);
  console.log("Password awal semua akun:", DEFAULT_PASSWORD, "(wajib ganti saat login pertama)");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

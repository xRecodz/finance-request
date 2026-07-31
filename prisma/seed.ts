import { ApproverTrack, PrismaClient, UserRole, UserSource } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

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

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  console.log(`Password default: ${DEFAULT_PASSWORD}`);

  const categories = [
    { code: "OPS", name: "Operasional", sortOrder: 1 },
    { code: "MKT", name: "Marketing", sortOrder: 2 },
    { code: "HRD", name: "SDM / HRD", sortOrder: 3 },
    { code: "IT", name: "IT & Sistem", sortOrder: 4 },
    { code: "UMUM", name: "Umum", sortOrder: 5 },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { code: category.code },
      create: { ...category, description: `Kategori ${category.name}` },
      update: { name: category.name, sortOrder: category.sortOrder, isActive: true },
    });
  }

  const systemUsers = [
    {
      nip: "ADMIN001",
      name: "Administrator Finance",
      role: UserRole.ADMIN,
      approverTrack: null as ApproverTrack | null,
      position: "Admin Sistem",
      department: "IT",
    },
    {
      nip: "DIR001",
      name: "Direktur SL Indonesia",
      role: UserRole.APPROVER,
      approverTrack: ApproverTrack.DIREKTUR,
      position: "Direktur",
      department: "Direksi",
    },
    {
      nip: "FIN001",
      name: "Finance Manager",
      role: UserRole.APPROVER,
      approverTrack: ApproverTrack.FINANCE,
      position: "Finance Manager",
      department: "Finance",
    },
  ];

  for (const user of systemUsers) {
    await prisma.user.upsert({
      where: { nip: user.nip },
      create: {
        nip: user.nip,
        name: user.name,
        role: user.role,
        approverTrack: user.approverTrack,
        position: user.position,
        department: user.department,
        passwordHash,
        mustChangePassword: true,
        isActive: true,
        source: UserSource.MANUAL,
      },
      update: {
        name: user.name,
        role: user.role,
        approverTrack: user.approverTrack,
        position: user.position,
        department: user.department,
        passwordHash,
        mustChangePassword: true,
        isActive: true,
      },
    });
  }

  const dataPath = path.resolve(__dirname, "data/hris-employees.json");
  if (!fs.existsSync(dataPath)) {
    console.warn(`File ${dataPath} tidak ditemukan. Skip import NIP HRIS.`);
    console.warn("Jalankan: npm run hris:extract");
    return;
  }

  const employees = JSON.parse(fs.readFileSync(dataPath, "utf8")) as HrisEmployee[];
  const reserved = new Set(systemUsers.map((u) => u.nip));
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
    .filter((emp) => emp.nip && emp.name && !reserved.has(emp.nip));

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

  const total = await prisma.user.count();
  console.log(`\nBaris baru dimasukkan: ${inserted}. Total user di DB: ${total}`);
  console.log("Akun uji approval: DIR001, FIN001, ADMIN001 — password:", DEFAULT_PASSWORD);
  console.log("Pemohon: login pakai NIP HRIS + password yang sama (wajib ganti saat pertama).");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

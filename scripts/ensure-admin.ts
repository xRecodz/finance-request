/**
 * Pastikan ada akun ADMIN sistem untuk Portal IT (kelola user).
 * NIP: SLI.ADMIN — bukan NIP karyawan, jadi tidak bentrok dengan pengajuan pribadi.
 *
 * Password awal = DEFAULT_PASSWORD dari .env (default 100100), wajib ganti di login pertama.
 * Jalankan: npm run admin:ensure
 */
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole, UserSource } from "@prisma/client";

const prisma = new PrismaClient();

const ADMIN_NIP = process.env.ADMIN_NIP || "SLI.ADMIN";
const ADMIN_NAME = process.env.ADMIN_NAME || "Administrator Sistem";
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || "100100";

async function main() {
  const existing = await prisma.user.findUnique({ where: { nip: ADMIN_NIP } });

  if (existing) {
    const updated = await prisma.user.update({
      where: { nip: ADMIN_NIP },
      data: {
        role: UserRole.ADMIN,
        approverTrack: null,
        isActive: true,
        name: existing.name || ADMIN_NAME,
      },
      select: { nip: true, name: true, role: true, mustChangePassword: true },
    });
    console.log("Admin sudah ada — role dipastikan ADMIN (password tidak diubah):");
    console.log(`  NIP: ${updated.nip}`);
    console.log(`  Nama: ${updated.name}`);
    console.log(`  Role: ${updated.role}`);
    return;
  }

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const created = await prisma.user.create({
    data: {
      nip: ADMIN_NIP,
      name: ADMIN_NAME,
      role: UserRole.ADMIN,
      approverTrack: null,
      passwordHash,
      mustChangePassword: true,
      isActive: true,
      source: UserSource.MANUAL,
    },
    select: { nip: true, name: true, role: true },
  });

  console.log("Admin dibuat:");
  console.log(`  NIP: ${created.nip}`);
  console.log(`  Nama: ${created.name}`);
  console.log(`  Role: ${created.role}`);
  console.log(`  Password awal: ${DEFAULT_PASSWORD} (wajib ganti saat login pertama)`);
  console.log("Login lewat kartu Portal IT di halaman depan.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/**
 * Sinkronkan master kategori pengajuan (aman production — tidak sentuh User/Request).
 * npm run categories:sync
 */
import { PrismaClient } from "@prisma/client";
import { CATEGORY_MASTER } from "../prisma/categories";

const prisma = new PrismaClient();

async function main() {
  const codes = CATEGORY_MASTER.map((c) => c.code);

  for (const category of CATEGORY_MASTER) {
    await prisma.category.upsert({
      where: { code: category.code },
      create: {
        ...category,
        description: `Kategori ${category.name}`,
        isActive: true,
      },
      update: {
        name: category.name,
        sortOrder: category.sortOrder,
        isActive: true,
        description: `Kategori ${category.name}`,
      },
    });
    console.log(`✓ ${category.code} — ${category.name}`);
  }

  const deactivated = await prisma.category.updateMany({
    where: { code: { notIn: codes }, isActive: true },
    data: { isActive: false },
  });
  if (deactivated.count) {
    console.log(`Nonaktifkan kategori lama di luar daftar: ${deactivated.count}`);
  }

  const active = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { code: true, name: true },
  });
  console.log("Kategori aktif di form:");
  for (const c of active) console.log(`  - ${c.name} (${c.code})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

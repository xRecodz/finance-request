/**
 * Sinkronkan kategori STANDARD + OUTLET (aman production).
 * npm run categories:sync
 */
import { CategoryKind, PrismaClient } from "@prisma/client";
import { CATEGORY_MASTER } from "../prisma/categories";
import { OUTLET_NAMES } from "../prisma/outlets";
import { outletCode } from "../src/lib/outlets";

const prisma = new PrismaClient();

async function main() {
  const standardCodes = CATEGORY_MASTER.map((c) => c.code);

  for (const category of CATEGORY_MASTER) {
    await prisma.category.upsert({
      where: { code: category.code },
      create: {
        ...category,
        kind: CategoryKind.STANDARD,
        description: `Kategori ${category.name}`,
        isActive: true,
      },
      update: {
        name: category.name,
        sortOrder: category.sortOrder,
        kind: CategoryKind.STANDARD,
        isActive: true,
        description: `Kategori ${category.name}`,
      },
    });
    console.log(`✓ STANDARD ${category.code} — ${category.name}`);
  }

  let outletOrder = 100;
  const outletCodes: string[] = [];
  for (const name of OUTLET_NAMES) {
    const code = outletCode(name);
    outletCodes.push(code);
    await prisma.category.upsert({
      where: { code },
      create: {
        code,
        name,
        kind: CategoryKind.OUTLET,
        sortOrder: outletOrder++,
        isActive: true,
        description: "Outlet",
      },
      update: {
        name,
        kind: CategoryKind.OUTLET,
        sortOrder: outletOrder - 1,
        isActive: true,
        description: "Outlet",
      },
    });
  }
  console.log(`✓ OUTLET synced: ${outletCodes.length} outlet`);

  const keep = [...standardCodes, ...outletCodes];
  const deactivated = await prisma.category.updateMany({
    where: { code: { notIn: keep }, isActive: true },
    data: { isActive: false },
  });
  if (deactivated.count) {
    console.log(`Nonaktifkan kategori di luar daftar: ${deactivated.count}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

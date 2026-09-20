import { ApproverTrack, CategoryKind } from "@prisma/client";
import { prisma } from "./prisma";
import { HttpError } from "../middleware/errorHandler";

export type Destination = "HO" | "OUTLET";

const DEFAULT_OFFICER_NIPS: Record<string, string> = {
  "FINANCE:HO": "1906.0.96.05580",
  "FINANCE:OUTLET": "1512.0.94.01171",
  "DIREKTUR:HO": "1109.0.86.00052",
  "DIREKTUR:OUTLET": "1109.0.86.00052",
};

export async function resolveDisbursementOfficer(track: ApproverTrack, destination: Destination) {
  const route = await prisma.disbursementRoute.findUnique({
    where: { track_destination: { track, destination } },
    include: { officer: true },
  });
  const nip = DEFAULT_OFFICER_NIPS[`${track}:${destination}`];
  const officer = route?.isActive ? route.officer : nip
    ? await prisma.user.findUnique({ where: { nip } })
    : null;
  if (!officer || !officer.isActive) {
    throw new HttpError(400, "Petugas pencairan untuk jalur dan tujuan ini belum diatur");
  }
  return officer;
}

export async function validateDestinationCategory(destination: Destination, categoryId: string | null | undefined) {
  if (!categoryId) throw new HttpError(400, "Kategori tujuan wajib dipilih");
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category || !category.isActive) throw new HttpError(400, "Kategori tujuan tidak aktif atau tidak ditemukan");
  if (destination === "OUTLET" && category.kind !== CategoryKind.OUTLET) {
    throw new HttpError(400, "Tujuan Outlet harus memakai kategori outlet");
  }
  if (destination === "HO" && category.kind !== CategoryKind.STANDARD) {
    throw new HttpError(400, "Tujuan Head Office harus memakai kategori Head Office");
  }
  return category;
}

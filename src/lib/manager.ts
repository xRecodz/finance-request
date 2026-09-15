import { UserRole } from "@prisma/client";
import {
  DEPARTMENT_MANAGER_MAP,
  POSITION_MANAGER_RULES,
  managerNipsFromMap,
} from "./managerMap";
import { prisma } from "./prisma";
import { HttpError } from "../middleware/errorHandler";

export { managerNipsFromMap };

/**
 * Apakah NIP ini terdaftar sebagai manager di map
 * (boleh role MANAGER atau APPROVER dual-role seperti Sekretariat+GA).
 */
export function isMappedManagerNip(nip: string): boolean {
  return managerNipsFromMap().includes(nip);
}

/**
 * Resolve manager aktif dari departemen / posisi pemohon.
 */
export async function resolveManagerForDepartment(
  department: string | null | undefined,
  position?: string | null
) {
  const dept = department?.trim() || "";
  const pos = position?.trim() || "";

  let nip: string | undefined = dept ? DEPARTMENT_MANAGER_MAP[dept] : undefined;
  let via = nip ? `departemen "${dept}"` : "";

  if (!nip && pos) {
    const lower = pos.toLowerCase();
    for (const rule of POSITION_MANAGER_RULES) {
      if (rule.includes.some((token) => lower.includes(token.toLowerCase()))) {
        nip = rule.nip;
        via = `posisi (${rule.label})`;
        break;
      }
    }
  }

  if (!nip) {
    if (!dept && !pos) {
      throw new HttpError(
        400,
        "Departemen/posisi Anda belum terisi. Hubungi IT untuk melengkapi data sebelum mengajukan ke Finance."
      );
    }
    throw new HttpError(
      400,
      `Belum ada manager untuk unit Anda${dept ? ` (departemen "${dept}")` : ""}. Hubungi IT untuk menambahkan mapping manager.`
    );
  }

  const manager = await prisma.user.findUnique({ where: { nip } });
  if (!manager || !manager.isActive) {
    throw new HttpError(
      400,
      `Manager untuk ${via || "unit Anda"} (NIP ${nip}) tidak ditemukan atau tidak aktif.`
    );
  }

  // MANAGER, ADMIN, atau APPROVER yang ada di map (dual-role, mis. Sekretariat + GA).
  const allowed =
    manager.role === UserRole.MANAGER ||
    manager.role === UserRole.ADMIN ||
    (manager.role === UserRole.APPROVER && isMappedManagerNip(manager.nip));

  if (!allowed) {
    throw new HttpError(
      400,
      `Akun ${manager.name} belum berstatus Manager. Jalankan npm run managers:sync atau hubungi IT.`
    );
  }

  return manager;
}

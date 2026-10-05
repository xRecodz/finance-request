import { HttpError } from "../middleware/errorHandler";
import { prisma } from "./prisma";

export function normalizeBusinessRoleCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "_");
}

export async function assertActiveBusinessRole(value: string): Promise<string> {
  const code = normalizeBusinessRoleCode(value);
  const role = await prisma.businessRole.findUnique({ where: { code } });
  if (!role?.isActive) throw new HttpError(400, "Divisi tidak aktif atau tidak ditemukan. Hubungi Portal IT.");
  return code;
}

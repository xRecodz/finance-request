import { UserRole } from "@prisma/client";
import { AuthUser } from "./auth";
import { isMappedManagerNip } from "./manager";
import { prisma } from "./prisma";

export async function loadAuthUser(id: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || !user.isActive) return null;
  const managerRoute = await prisma.managerRoute.count({ where: { managerId: user.id, isActive: true } });
  const disbursementRoute = await prisma.disbursementRoute.count({ where: { officerId: user.id, isActive: true } });
  return {
    id: user.id,
    nip: user.nip,
    name: user.name,
    role: user.role,
    approverTrack: user.approverTrack,
    mustChangePassword: user.mustChangePassword,
    onboardingComplete: user.onboardingComplete,
    businessRole: user.businessRole,
    workLocation: user.workLocation,
    homeOutletId: user.homeOutletId,
    canApprove: user.role === UserRole.ADMIN || user.role === UserRole.MANAGER || isMappedManagerNip(user.nip) || managerRoute > 0,
    canDisburse: user.role === UserRole.ADMIN || user.role === UserRole.APPROVER || disbursementRoute > 0,
  };
}

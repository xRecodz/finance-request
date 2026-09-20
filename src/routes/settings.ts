import { Router } from "express";
import { ApproverTrack, CategoryKind, UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/auth";
import { BUSINESS_ROLES, BUSINESS_ROLE_MANAGER_NIPS } from "../lib/managerMap";
import { AuthedRequest, requireAuth, requirePasswordChanged, requireRoles } from "../middleware/auth";
import { HttpError, asyncHandler } from "../middleware/errorHandler";
import { logActivity } from "../lib/activity";

export const settingsRouter = Router();
settingsRouter.use(requireAuth, requirePasswordChanged, requireRoles(UserRole.IT, UserRole.ADMIN));

settingsRouter.get("/overview", asyncHandler<AuthedRequest>(async (_req, res) => {
  const [activeUsers, incompleteProfiles, inactiveUsers, pendingManager, pendingPayout, byRole] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: true, onboardingComplete: false } }),
    prisma.user.count({ where: { isActive: false } }),
    prisma.request.count({ where: { status: "MENUNGGU_MANAGER" } }),
    prisma.request.count({ where: { status: "DISETUJUI" } }),
    prisma.user.groupBy({ by: ["businessRole"], where: { isActive: true }, _count: { _all: true } }),
  ]);
  res.json({ data: { activeUsers, inactiveUsers, incompleteProfiles, pendingManager, pendingPayout, byRole: byRole.map(row => ({ role: row.businessRole || "Belum dipilih", count: row._count._all })) } });
}));

settingsRouter.get("/audit", asyncHandler<AuthedRequest>(async (req, res) => {
  const page = z.coerce.number().int().min(1).parse(req.query.page || 1);
  const rows = await prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 30, skip: (page - 1) * 30, include: { actor: { select: { nip: true, name: true } } } });
  res.json({ data: rows });
}));

settingsRouter.get("/request-preview", asyncHandler<AuthedRequest>(async (req, res) => {
  const number = z.string().trim().min(3).parse(req.query.number);
  const row = await prisma.request.findUnique({ where: { number }, select: { id: true, number: true, title: true, status: true, workflowVersion: true, manager: { select: { nip: true, name: true } }, disbursementOfficer: { select: { nip: true, name: true } }, approver: { select: { nip: true, name: true } } } });
  if (!row) throw new HttpError(404, "Nomor pengajuan tidak ditemukan");
  res.json({ data: row });
}));

settingsRouter.put("/reroute-request", asyncHandler<AuthedRequest>(async (req, res) => {
  const body = z.object({ number: z.string().trim().min(3), target: z.enum(["manager", "officer"]), nip: z.string().trim().min(3), reason: z.string().trim().min(5) }).parse(req.body);
  const row = await prisma.request.findUnique({ where: { number: body.number } });
  if (!row) throw new HttpError(404, "Nomor pengajuan tidak ditemukan");
  if (row.workflowVersion < 2) throw new HttpError(400, "Pengajuan lama tidak mendukung penugasan ulang melalui menu ini");
  if (body.target === "manager" && row.status !== "MENUNGGU_MANAGER") throw new HttpError(409, "Manager hanya dapat diganti saat masih menunggu approval manager");
  if (body.target === "officer" && !["MENUNGGU_MANAGER", "DISETUJUI"].includes(row.status)) throw new HttpError(409, "Petugas pencairan hanya dapat diganti sebelum dana dicairkan");
  const target = await prisma.user.findUnique({ where: { nip: body.nip } });
  if (!target?.isActive) throw new HttpError(400, "NIP tujuan tidak ditemukan atau tidak aktif");
  if (body.target === "manager" && target.id === row.requesterId) throw new HttpError(400, "Manager tidak boleh sama dengan pemohon");
  await prisma.$transaction(async tx => {
    const claimed = await tx.request.updateMany({ where: { id: row.id, status: row.status }, data: body.target === "manager" ? { managerId: target.id } : { disbursementOfficerId: target.id, approverId: target.id } });
    if (claimed.count !== 1) throw new HttpError(409, "Status pengajuan berubah. Muat ulang sebelum mengubah penugasan.");
    await tx.approvalLog.create({ data: { requestId: row.id, actorId: req.user!.id, action: "ADMIN_REROUTE", fromStatus: row.status, toStatus: row.status, note: `${body.target} → ${target.nip}. Alasan: ${body.reason}` } });
  });
  logActivity({ actorId: req.user!.id, action: "REROUTE_REQUEST", entity: "Request", entityId: row.id, detail: `${body.number}: ${body.target} → ${target.nip}. ${body.reason}`, ip: req.ip });
  await prisma.notification.create({ data: { userId: target.id, title: "Tugas pengajuan dialihkan kepada Anda", body: `${row.number}: ${body.reason}`, requestId: row.id } });
  res.json({ message: `Pengajuan ${row.number} dialihkan ke ${target.name}` });
}));

const defaultOfficers: Record<string, string> = {
  "FINANCE:HO": "1906.0.96.05580",
  "FINANCE:OUTLET": "1512.0.94.01171",
  "DIREKTUR:HO": "1109.0.86.00052",
  "DIREKTUR:OUTLET": "1109.0.86.00052",
};

settingsRouter.get("/", asyncHandler<AuthedRequest>(async (_req, res) => {
  const [managerRoutes, payoutRoutes, users] = await Promise.all([
    prisma.managerRoute.findMany({ include: { manager: { select: { id: true, nip: true, name: true, isActive: true } } } }),
    prisma.disbursementRoute.findMany({ include: { officer: { select: { id: true, nip: true, name: true, isActive: true } } } }),
    prisma.user.findMany({ where: { nip: { in: [...new Set([...Object.values(BUSINESS_ROLE_MANAGER_NIPS), ...Object.values(defaultOfficers)])] } }, select: { id: true, nip: true, name: true, isActive: true } }),
  ]);
  const byNip = new Map(users.map(user => [user.nip, user]));
  const managerData = BUSINESS_ROLES.map(role => {
    const route = managerRoutes.find(item => item.businessRole === role && item.outletCategoryId === null && item.isActive);
    return { businessRole: role, manager: route?.manager || byNip.get(BUSINESS_ROLE_MANAGER_NIPS[role]) || null, configured: Boolean(route) };
  });
  const payoutData = Object.entries(defaultOfficers).map(([key, nip]) => {
    const [track, destination] = key.split(":");
    const route = payoutRoutes.find(item => item.track === track && item.destination === destination && item.isActive);
    return { track, destination, officer: route?.officer || byNip.get(nip) || null, configured: Boolean(route) };
  });
  res.json({ data: { managerRoutes: managerData, payoutRoutes: payoutData, outletOverrides: managerRoutes.filter(item => item.outletCategoryId !== null), defaultPasswordConfigured: Boolean(await prisma.systemSetting.findUnique({ where: { key: "defaultPasswordHash" } })) } });
}));

settingsRouter.put("/manager-route", asyncHandler<AuthedRequest>(async (req, res) => {
  const body = z.object({ businessRole: z.enum([...BUSINESS_ROLES] as [string, ...string[]]), outletCategoryId: z.string().nullable().optional(), managerNip: z.string().trim().min(3) }).parse(req.body);
  const manager = await prisma.user.findUnique({ where: { nip: body.managerNip } });
  if (!manager?.isActive) throw new HttpError(400, "NIP manager tidak ditemukan atau tidak aktif");
  if (body.outletCategoryId) {
    const outlet = await prisma.category.findUnique({ where: { id: body.outletCategoryId } });
    if (!outlet?.isActive || outlet.kind !== CategoryKind.OUTLET) throw new HttpError(400, "Outlet tidak valid");
  }
  await prisma.$transaction(async tx => {
    await tx.managerRoute.updateMany({ where: { businessRole: body.businessRole, outletCategoryId: body.outletCategoryId || null }, data: { isActive: false } });
    await tx.managerRoute.create({ data: { businessRole: body.businessRole, outletCategoryId: body.outletCategoryId || null, managerId: manager.id } });
  });
  logActivity({ actorId: req.user!.id, action: "SET_MANAGER_ROUTE", entity: "ManagerRoute", detail: `${body.businessRole}:${body.outletCategoryId || "ALL"} -> ${manager.nip}`, ip: req.ip });
  res.json({ message: `Manager ${body.businessRole} diperbarui` });
}));

settingsRouter.put("/payout-route", asyncHandler<AuthedRequest>(async (req, res) => {
  const body = z.object({ track: z.nativeEnum(ApproverTrack), destination: z.enum(["HO", "OUTLET"]), officerNip: z.string().trim().min(3) }).parse(req.body);
  const officer = await prisma.user.findUnique({ where: { nip: body.officerNip } });
  if (!officer?.isActive) throw new HttpError(400, "NIP petugas tidak ditemukan atau tidak aktif");
  await prisma.disbursementRoute.upsert({ where: { track_destination: { track: body.track, destination: body.destination } }, create: { track: body.track, destination: body.destination, officerId: officer.id }, update: { officerId: officer.id, isActive: true } });
  logActivity({ actorId: req.user!.id, action: "SET_PAYOUT_ROUTE", entity: "DisbursementRoute", detail: `${body.track}:${body.destination} -> ${officer.nip}`, ip: req.ip });
  res.json({ message: "Petugas pencairan diperbarui" });
}));

settingsRouter.put("/default-password", asyncHandler<AuthedRequest>(async (req, res) => {
  const body = z.object({ password: z.string().min(6).max(128) }).parse(req.body);
  const hash = await hashPassword(body.password);
  await prisma.systemSetting.upsert({ where: { key: "defaultPasswordHash" }, create: { key: "defaultPasswordHash", value: hash }, update: { value: hash } });
  logActivity({ actorId: req.user!.id, action: "SET_DEFAULT_PASSWORD", entity: "SystemSetting", detail: "Password awal untuk akun baru/reset diperbarui", ip: req.ip });
  res.json({ message: "Password default baru berlaku untuk akun baru dan reset berikutnya" });
}));

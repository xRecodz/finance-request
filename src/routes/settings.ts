import { Router } from "express";
import { ApproverTrack, CategoryKind, UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/auth";
import { BUSINESS_ROLE_MANAGER_NIPS } from "../lib/managerMap";
import { normalizeBusinessRoleCode } from "../lib/businessRoles";
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
  const [managerRoutes, payoutRoutes, users, businessRoles, categories] = await Promise.all([
    prisma.managerRoute.findMany({ include: { manager: { select: { id: true, nip: true, name: true, isActive: true } } } }),
    prisma.disbursementRoute.findMany({ include: { officer: { select: { id: true, nip: true, name: true, isActive: true } } } }),
    prisma.user.findMany({ where: { nip: { in: [...new Set([...Object.values(BUSINESS_ROLE_MANAGER_NIPS), ...Object.values(defaultOfficers)])] } }, select: { id: true, nip: true, name: true, isActive: true } }),
    prisma.businessRole.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.category.findMany({ orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  const byNip = new Map(users.map(user => [user.nip, user]));
  const managerData = businessRoles.map(role => {
    const route = managerRoutes.find(item => item.businessRole === role.code && item.outletCategoryId === null && item.isActive);
    return { ...role, businessRole: role.code, manager: route?.manager || byNip.get(BUSINESS_ROLE_MANAGER_NIPS[role.code]) || null, configured: Boolean(route) };
  });
  const payoutData = Object.entries(defaultOfficers).map(([key, nip]) => {
    const [track, destination] = key.split(":");
    const route = payoutRoutes.find(item => item.track === track && item.destination === destination && item.isActive);
    return { track, destination, officer: route?.officer || byNip.get(nip) || null, configured: Boolean(route) };
  });
  res.json({ data: { businessRoles, categories, managerRoutes: managerData, payoutRoutes: payoutData, outletOverrides: managerRoutes.filter(item => item.outletCategoryId !== null), defaultPasswordConfigured: Boolean(await prisma.systemSetting.findUnique({ where: { key: "defaultPasswordHash" } })) } });
}));

const businessRoleCreateSchema = z.object({
  code: z.string().trim().min(2).max(40),
  name: z.string().trim().min(2).max(80),
  supervisorLabel: z.string().trim().min(2).max(40).default("Manager"),
  defaultTrack: z.nativeEnum(ApproverTrack).default(ApproverTrack.FINANCE),
  defaultDestination: z.enum(["HO", "OUTLET"]).default("HO"),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(500),
});

settingsRouter.post("/business-roles", asyncHandler<AuthedRequest>(async (req, res) => {
  const body = businessRoleCreateSchema.parse(req.body);
  const code = normalizeBusinessRoleCode(body.code);
  if (!/^[A-Z][A-Z0-9_]*$/.test(code)) throw new HttpError(400, "Kode divisi hanya boleh huruf, angka, dan garis bawah");
  const created = await prisma.businessRole.create({ data: { ...body, code } });
  logActivity({ actorId: req.user!.id, action: "CREATE_BUSINESS_ROLE", entity: "BusinessRole", entityId: created.id, detail: `${created.code} — ${created.name}`, ip: req.ip });
  res.status(201).json({ data: created, message: `Divisi ${created.name} ditambahkan` });
}));

settingsRouter.patch("/business-roles/:id", asyncHandler<AuthedRequest>(async (req, res) => {
  const body = businessRoleCreateSchema.omit({ code: true }).extend({ isActive: z.boolean().optional() }).parse(req.body);
  const existing = await prisma.businessRole.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new HttpError(404, "Divisi tidak ditemukan");
  const updated = await prisma.businessRole.update({ where: { id: existing.id }, data: body });
  logActivity({ actorId: req.user!.id, action: "UPDATE_BUSINESS_ROLE", entity: "BusinessRole", entityId: updated.id, detail: `${updated.code} — ${updated.name}`, ip: req.ip });
  res.json({ data: updated, message: `Divisi ${updated.name} diperbarui` });
}));

const categorySchema = z.object({
  code: z.string().trim().min(2).max(40),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(191).optional().nullable(),
  kind: z.nativeEnum(CategoryKind),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(500),
});

settingsRouter.post("/categories", asyncHandler<AuthedRequest>(async (req, res) => {
  const body = categorySchema.parse(req.body);
  const code = body.code.toUpperCase().replace(/\s+/g, "_");
  if (!/^[A-Z][A-Z0-9_]*$/.test(code)) throw new HttpError(400, "Kode kategori hanya boleh huruf, angka, dan garis bawah");
  const created = await prisma.category.create({ data: { ...body, code, description: body.description || null } });
  logActivity({ actorId: req.user!.id, action: "CREATE_CATEGORY", entity: "Category", entityId: created.id, detail: `${created.code} — ${created.name}`, ip: req.ip });
  res.status(201).json({ data: created, message: `Kategori ${created.name} ditambahkan` });
}));

settingsRouter.patch("/categories/:id", asyncHandler<AuthedRequest>(async (req, res) => {
  const body = categorySchema.omit({ code: true }).extend({ isActive: z.boolean().optional() }).parse(req.body);
  const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new HttpError(404, "Kategori tidak ditemukan");
  const updated = await prisma.category.update({ where: { id: existing.id }, data: { ...body, description: body.description || null } });
  logActivity({ actorId: req.user!.id, action: "UPDATE_CATEGORY", entity: "Category", entityId: updated.id, detail: `${updated.code} — ${updated.name}`, ip: req.ip });
  res.json({ data: updated, message: `Kategori ${updated.name} diperbarui` });
}));

settingsRouter.put("/manager-route", asyncHandler<AuthedRequest>(async (req, res) => {
  const body = z.object({ businessRole: z.string().trim().min(2).max(40), outletCategoryId: z.string().nullable().optional(), managerNip: z.string().trim().min(3) }).parse(req.body);
  const businessRole = normalizeBusinessRoleCode(body.businessRole);
  const role = await prisma.businessRole.findUnique({ where: { code: businessRole } });
  if (!role?.isActive) throw new HttpError(400, "Divisi tidak aktif atau tidak ditemukan");
  const manager = await prisma.user.findUnique({ where: { nip: body.managerNip } });
  if (!manager?.isActive) throw new HttpError(400, "NIP manager tidak ditemukan atau tidak aktif");
  if (body.outletCategoryId) {
    const outlet = await prisma.category.findUnique({ where: { id: body.outletCategoryId } });
    if (!outlet?.isActive || outlet.kind !== CategoryKind.OUTLET) throw new HttpError(400, "Outlet tidak valid");
  }
  await prisma.$transaction(async tx => {
    await tx.managerRoute.updateMany({ where: { businessRole, outletCategoryId: body.outletCategoryId || null }, data: { isActive: false } });
    await tx.managerRoute.create({ data: { businessRole, outletCategoryId: body.outletCategoryId || null, managerId: manager.id } });
  });
  logActivity({ actorId: req.user!.id, action: "SET_MANAGER_ROUTE", entity: "ManagerRoute", detail: `${businessRole}:${body.outletCategoryId || "ALL"} -> ${manager.nip}`, ip: req.ip });
  res.json({ message: `${role.supervisorLabel} ${role.name} diperbarui` });
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

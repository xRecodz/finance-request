import { Router } from "express";
import { ApproverTrack, Prisma, UserRole, UserSource } from "@prisma/client";
import { z } from "zod";
import { env } from "../config/env";
import { hashPassword } from "../lib/auth";
import { logActivity } from "../lib/activity";
import { prisma } from "../lib/prisma";
import {
  AuthedRequest,
  requireAuth,
  requirePasswordChanged,
  requireRoles,
} from "../middleware/auth";
import { HttpError, asyncHandler } from "../middleware/errorHandler";

export const usersRouter = Router();

usersRouter.use(
  requireAuth,
  requirePasswordChanged,
  requireRoles(UserRole.IT, UserRole.ADMIN)
);

const userSelect = {
  id: true,
  nip: true,
  name: true,
  email: true,
  phone: true,
  position: true,
  department: true,
  role: true,
  approverTrack: true,
  mustChangePassword: true,
  isActive: true,
  source: true,
  lastLoginAt: true,
  passwordChangedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const listQuerySchema = z.object({
  q: z.string().trim().optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const createSchema = z
  .object({
    nip: z.string().trim().min(3, "NIP wajib diisi"),
    name: z.string().trim().min(2, "Nama wajib diisi"),
    email: z.string().trim().email().optional().nullable().or(z.literal("")),
    phone: z.string().trim().optional().nullable(),
    position: z.string().trim().optional().nullable(),
    department: z.string().trim().optional().nullable(),
    role: z.enum([UserRole.PEMOHON, UserRole.APPROVER, UserRole.MANAGER, UserRole.IT]).default(UserRole.PEMOHON),
    approverTrack: z.nativeEnum(ApproverTrack).optional().nullable(),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.role === UserRole.APPROVER && !data.approverTrack) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Approver wajib punya jalur (Sekretariat / Finance)",
        path: ["approverTrack"],
      });
    }
  });

const patchSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    email: z.string().trim().email().optional().nullable().or(z.literal("")),
    phone: z.string().trim().optional().nullable(),
    position: z.string().trim().optional().nullable(),
    department: z.string().trim().optional().nullable(),
    role: z.enum([UserRole.PEMOHON, UserRole.APPROVER, UserRole.MANAGER, UserRole.IT]).optional(),
    approverTrack: z.nativeEnum(ApproverTrack).optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === UserRole.APPROVER && data.approverTrack === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Approver wajib punya jalur (Sekretariat / Finance)",
        path: ["approverTrack"],
      });
    }
  });

function normalizeEmail(email?: string | null) {
  if (!email || email.trim() === "") return null;
  return email.trim();
}

function assertCanAssignRole(actorRole: UserRole, targetRole: UserRole) {
  if (targetRole === UserRole.ADMIN) {
    throw new HttpError(403, "Role ADMIN tidak bisa diatur dari portal IT");
  }
  if (actorRole === UserRole.IT && targetRole === UserRole.IT) {
    // IT boleh assign IT lain (opsional) — sesuai plan boleh kelola kecuali ADMIN
    return;
  }
}

usersRouter.get(
  "/",
  asyncHandler<AuthedRequest>(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const where: Prisma.UserWhereInput = {};

    if (query.role) where.role = query.role;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.q) {
      where.OR = [
        { nip: { contains: query.q } },
        { name: { contains: query.q } },
        { department: { contains: query.q } },
        { position: { contains: query.q } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: [{ role: "asc" }, { name: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    res.json({
      data: rows,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    });
  })
);

usersRouter.get(
  "/:id",
  asyncHandler<AuthedRequest>(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: userSelect,
    });
    if (!user) throw new HttpError(404, "User tidak ditemukan");
    res.json({ data: user });
  })
);

usersRouter.post(
  "/",
  asyncHandler<AuthedRequest>(async (req, res) => {
    const body = createSchema.parse(req.body);
    assertCanAssignRole(req.user!.role, body.role);

    const existing = await prisma.user.findUnique({ where: { nip: body.nip } });
    if (existing) throw new HttpError(409, "NIP sudah terdaftar");

    const passwordHash = await hashPassword(env.DEFAULT_PASSWORD);
    const created = await prisma.user.create({
      data: {
        nip: body.nip,
        name: body.name,
        email: normalizeEmail(body.email),
        phone: body.phone || null,
        position: body.position || null,
        department: body.department || null,
        role: body.role,
        approverTrack: body.role === UserRole.APPROVER ? body.approverTrack! : null,
        passwordHash,
        mustChangePassword: true,
        isActive: body.isActive,
        source: UserSource.MANUAL,
      },
      select: userSelect,
    });

    logActivity({
      actorId: req.user!.id,
      action: "CREATE_USER",
      entity: "User",
      entityId: created.id,
      detail: `${created.nip} — ${created.name} (${created.role})`,
      ip: req.ip,
    });

    res.status(201).json({
      data: created,
      message: `User dibuat. Password awal = default sistem; wajib diganti saat login pertama.`,
    });
  })
);

usersRouter.patch(
  "/:id",
  asyncHandler<AuthedRequest>(async (req, res) => {
    const body = patchSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "User tidak ditemukan");

    if (existing.role === UserRole.ADMIN && req.user!.role !== UserRole.ADMIN) {
      throw new HttpError(403, "Akun ADMIN tidak bisa diubah dari portal IT");
    }

    const nextRole = body.role ?? existing.role;
    if (body.role) assertCanAssignRole(req.user!.role, body.role);

    if (nextRole === UserRole.APPROVER) {
      const track = body.approverTrack !== undefined ? body.approverTrack : existing.approverTrack;
      if (!track) {
        throw new HttpError(400, "Approver wajib punya jalur (Sekretariat / Finance)");
      }
    }

    // Jangan sentuh passwordHash di sini.
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: body.name,
        email: body.email !== undefined ? normalizeEmail(body.email) : undefined,
        phone: body.phone === undefined ? undefined : body.phone || null,
        position: body.position === undefined ? undefined : body.position || null,
        department: body.department === undefined ? undefined : body.department || null,
        role: body.role,
        approverTrack:
          nextRole === UserRole.APPROVER
            ? body.approverTrack !== undefined
              ? body.approverTrack
              : existing.approverTrack
            : null,
        isActive: body.isActive,
      },
      select: userSelect,
    });

    const action =
      body.isActive === false && existing.isActive
        ? "DEACTIVATE_USER"
        : body.isActive === true && !existing.isActive
          ? "ACTIVATE_USER"
          : "UPDATE_USER";

    logActivity({
      actorId: req.user!.id,
      action,
      entity: "User",
      entityId: updated.id,
      detail: `${updated.nip} — ${updated.name} (${updated.role})`,
      ip: req.ip,
    });

    res.json({ data: updated });
  })
);

usersRouter.post(
  "/:id/reset-password",
  asyncHandler<AuthedRequest>(async (req, res) => {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "User tidak ditemukan");

    if (existing.role === UserRole.ADMIN && req.user!.role !== UserRole.ADMIN) {
      throw new HttpError(403, "Password akun ADMIN tidak bisa di-reset dari portal IT");
    }

    const passwordHash = await hashPassword(env.DEFAULT_PASSWORD);
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        mustChangePassword: true,
        passwordChangedAt: null,
      },
      select: userSelect,
    });

    logActivity({
      actorId: req.user!.id,
      action: "RESET_PASSWORD",
      entity: "User",
      entityId: updated.id,
      detail: `${updated.nip} — password dikembalikan ke default sistem`,
      ip: req.ip,
    });

    res.json({
      data: updated,
      message: "Password direset ke default sistem. User wajib ganti saat login berikutnya.",
    });
  })
);

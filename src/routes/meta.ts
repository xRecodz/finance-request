import { Router } from "express";
import { CategoryKind, UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { outletCode } from "../lib/outlets";
import {
  AuthedRequest,
  requireAuth,
  requirePasswordChanged,
} from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

export const metaRouter = Router();

metaRouter.use(requireAuth, requirePasswordChanged);

/** Daftar approver aktif untuk dropdown "pengajuan kepada siapa". */
metaRouter.get(
  "/approvers",
  asyncHandler<AuthedRequest>(async (_req, res) => {
    // Termasuk diri sendiri — agar Sekretariat bisa mengajukan ke jalur sendiri lalu approve.
    const approvers = await prisma.user.findMany({
      where: {
        role: UserRole.APPROVER,
        isActive: true,
      },
      select: {
        id: true,
        nip: true,
        name: true,
        position: true,
        department: true,
        approverTrack: true,
      },
      orderBy: [{ approverTrack: "asc" }, { name: "asc" }],
    });
    res.json({ data: approvers });
  })
);

metaRouter.get(
  "/categories",
  asyncHandler<AuthedRequest>(async (req, res) => {
    const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
    const where =
      kind === "OUTLET" || kind === "STANDARD"
        ? { isActive: true, kind: kind as CategoryKind }
        : { isActive: true };

    const categories = await prisma.category.findMany({
      where,
      orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, code: true, name: true, kind: true, description: true },
    });
    res.json({ data: categories });
  })
);

/** Buat / ambil kategori outlet dari teks bebas (combobox bisa diketik). */
metaRouter.post(
  "/outlets",
  asyncHandler<AuthedRequest>(async (req, res) => {
    const body = z
      .object({ name: z.string().trim().min(2).max(120) })
      .parse(req.body);
    const name = body.name.trim();
    const code = outletCode(name);

    const existing = await prisma.category.findFirst({
      where: {
        OR: [{ code }, { name: { equals: name } }],
        kind: CategoryKind.OUTLET,
      },
    });
    if (existing) {
      if (!existing.isActive) {
        await prisma.category.update({
          where: { id: existing.id },
          data: { isActive: true, name },
        });
      }
      res.json({
        data: {
          id: existing.id,
          code: existing.code,
          name: existing.name,
          kind: CategoryKind.OUTLET,
        },
      });
      return;
    }

    const created = await prisma.category.create({
      data: {
        code,
        name,
        kind: CategoryKind.OUTLET,
        sortOrder: 9000,
        description: "Outlet (manual)",
        isActive: true,
      },
      select: { id: true, code: true, name: true, kind: true },
    });
    res.status(201).json({ data: created });
  })
);

metaRouter.get(
  "/notifications",
  asyncHandler<AuthedRequest>(async (req, res) => {
    const items = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    const unread = await prisma.notification.count({
      where: { userId: req.user!.id, isRead: false },
    });
    res.json({ data: items, unread });
  })
);

metaRouter.post(
  "/notifications/:id/read",
  asyncHandler<AuthedRequest>(async (req, res) => {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { isRead: true },
    });
    res.json({ message: "Notifikasi ditandai dibaca" });
  })
);

metaRouter.post(
  "/notifications/read-all",
  asyncHandler<AuthedRequest>(async (req, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: "Semua notifikasi ditandai dibaca" });
  })
);

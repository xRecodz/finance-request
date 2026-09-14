import { Router } from "express";
import { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
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
    // Termasuk diri sendiri — agar Sekretariat (Bu Sari) bisa mengajukan ke jalur sendiri lalu approve.
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
  asyncHandler<AuthedRequest>(async (_req, res) => {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, code: true, name: true, description: true },
    });
    res.json({ data: categories });
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

import { Router } from "express";
import { CategoryKind, UserRole } from "@prisma/client";
import { z } from "zod";
import { env } from "../config/env";
import {
  hashPassword,
  signToken,
  validatePasswordStrength,
  verifyPassword,
} from "../lib/auth";
import { loadAuthUser } from "../lib/authUser";
import { BUSINESS_ROLES } from "../lib/managerMap";
import { resolveManagerForBusinessRole } from "../lib/manager";
import { prisma } from "../lib/prisma";
import { logActivity } from "../lib/activity";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { HttpError, asyncHandler } from "../middleware/errorHandler";

export const authRouter = Router();

const loginSchema = z.object({
  nip: z.string().trim().min(1, "NIP wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
  /** Pintu masuk yang dipilih user di halaman depan. */
  portal: z.enum(["PEMOHON", "APPROVAL", "IT"]).optional(),
});

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { nip, password, portal } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { nip } });
    // Pesan disamakan agar NIP terdaftar tidak bisa ditebak dari respons.
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new HttpError(401, "NIP atau password salah");
    }
    if (!user.isActive) {
      throw new HttpError(403, "Akun Anda nonaktif. Hubungi admin HRD.");
    }

    // APPROVER / MANAGER / ADMIN boleh masuk portal Pemohon juga (untuk mengajukan dana).
    const authUser = await loadAuthUser(user.id);
    if (!authUser) throw new HttpError(403, "Akun Anda nonaktif");
    if (portal === "APPROVAL" && !authUser.canApprove && !authUser.canDisburse) {
      throw new HttpError(
        403,
        "Akun ini terdaftar sebagai Pemohon. Silakan masuk lewat pintu Pemohon."
      );
    }
    if (portal === "IT" && user.role !== UserRole.IT && user.role !== UserRole.ADMIN) {
      throw new HttpError(403, "Akun ini tidak memiliki akses portal IT.");
    }
    // Semua akun aktif dapat membuat pengajuan melalui portal Pemohon.

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    logActivity({
      actorId: user.id,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
      ip: req.ip,
    });

    res.json({
      token: signToken(authUser),
      user: {
        ...authUser,
        department: user.department,
        position: user.position,
      },
      mustChangePassword: user.mustChangePassword,
    });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler<AuthedRequest>(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
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
        lastLoginAt: true,
        createdAt: true,
      },
    });
    if (!user || !user.isActive) {
      throw new HttpError(401, "Akun tidak ditemukan atau nonaktif");
    }
    res.json({ user: { ...user, ...(await loadAuthUser(user.id)) } });
  })
);

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Password saat ini wajib diisi"),
  newPassword: z.string().min(1, "Password baru wajib diisi"),
  confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
});

authRouter.post(
  "/change-password",
  requireAuth,
  asyncHandler<AuthedRequest>(async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = changePasswordSchema.parse(
      req.body
    );

    if (newPassword !== confirmPassword) {
      throw new HttpError(400, "Konfirmasi password tidak cocok");
    }

    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) {
      throw new HttpError(400, strengthError);
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      throw new HttpError(404, "User tidak ditemukan");
    }
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new HttpError(400, "Password saat ini salah");
    }
    if (await verifyPassword(newPassword, user.passwordHash)) {
      throw new HttpError(400, "Password baru tidak boleh sama dengan password lama");
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(newPassword),
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    });

    logActivity({
      actorId: user.id,
      action: "CHANGE_PASSWORD",
      entity: "User",
      entityId: user.id,
      ip: req.ip,
    });

    // Token lama masih membawa mustChangePassword=true, jadi terbitkan yang baru.
    const authUser = await loadAuthUser(updated.id);
    if (!authUser) throw new HttpError(401, "Akun tidak aktif");
    res.json({
      message: "Password berhasil diperbarui",
      token: signToken(authUser),
      user: authUser,
    });
  })
);

const setupProfileSchema = z.object({
  businessRole: z.enum(BUSINESS_ROLES),
  workLocation: z.enum(["HO", "OUTLET"]),
  homeOutletId: z.string().optional().nullable(),
});

authRouter.post(
  "/setup-profile",
  requireAuth,
  asyncHandler<AuthedRequest>(async (req, res) => {
    if (req.user!.mustChangePassword) throw new HttpError(403, "Ganti password terlebih dahulu");
    const body = setupProfileSchema.parse(req.body);
    if (body.workLocation === "OUTLET") {
      if (!body.homeOutletId) throw new HttpError(400, "Pilih outlet asal");
      const outlet = await prisma.category.findUnique({ where: { id: body.homeOutletId } });
      if (!outlet || !outlet.isActive || outlet.kind !== CategoryKind.OUTLET) {
        throw new HttpError(400, "Outlet asal tidak valid");
      }
    }
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        businessRole: body.businessRole,
        workLocation: body.workLocation,
        homeOutletId: body.workLocation === "OUTLET" ? body.homeOutletId : null,
        onboardingComplete: true,
      },
    });
    let manager: { id: string; name: string; nip: string } | null = null;
    try {
      const found = await resolveManagerForBusinessRole(updated.businessRole, updated.homeOutletId, updated.id);
      manager = { id: found.id, name: found.name, nip: found.nip };
    } catch { /* Penempatan boleh selesai walau rute manager belum diatur. */ }
    logActivity({ actorId: updated.id, action: "SETUP_PROFILE", entity: "User", entityId: updated.id,
      detail: `${updated.businessRole}/${updated.workLocation}`, ip: req.ip });
    const authUser = await loadAuthUser(updated.id);
    if (!authUser) throw new HttpError(401, "Akun tidak aktif");
    res.json({ user: authUser, token: signToken(authUser), manager });
  })
);

authRouter.get("/policy", (_req, res) => {
  res.json({
    minPasswordLength: env.MIN_PASSWORD_LENGTH,
    appName: env.APP_NAME,
  });
});

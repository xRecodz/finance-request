import { Router } from "express";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { env } from "../config/env";
import {
  AuthUser,
  hashPassword,
  signToken,
  validatePasswordStrength,
  verifyPassword,
} from "../lib/auth";
import { prisma } from "../lib/prisma";
import { logActivity } from "../lib/activity";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { HttpError, asyncHandler } from "../middleware/errorHandler";

export const authRouter = Router();

const loginSchema = z.object({
  nip: z.string().trim().min(1, "NIP wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
  /** Pintu masuk yang dipilih user di halaman depan. */
  portal: z.enum(["PEMOHON", "APPROVAL"]).optional(),
});

function toAuthUser(user: {
  id: string;
  nip: string;
  name: string;
  role: UserRole;
  approverTrack: AuthUser["approverTrack"];
  mustChangePassword: boolean;
}): AuthUser {
  return {
    id: user.id,
    nip: user.nip,
    name: user.name,
    role: user.role,
    approverTrack: user.approverTrack,
    mustChangePassword: user.mustChangePassword,
  };
}

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

    if (portal === "APPROVAL" && user.role === UserRole.PEMOHON) {
      throw new HttpError(
        403,
        "Akun ini terdaftar sebagai Pemohon. Silakan masuk lewat pintu Pemohon."
      );
    }
    if (portal === "PEMOHON" && user.role === UserRole.APPROVER) {
      throw new HttpError(
        403,
        "Akun ini terdaftar sebagai Approval. Silakan masuk lewat pintu Approval."
      );
    }

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

    const authUser = toAuthUser(user);
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
    res.json({ user });
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
    const authUser = toAuthUser(updated);
    res.json({
      message: "Password berhasil diperbarui",
      token: signToken(authUser),
      user: authUser,
    });
  })
);

authRouter.get("/policy", (_req, res) => {
  res.json({
    minPasswordLength: env.MIN_PASSWORD_LENGTH,
    appName: env.APP_NAME,
  });
});

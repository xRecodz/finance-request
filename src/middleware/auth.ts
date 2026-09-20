import { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { AuthUser, verifyToken } from "../lib/auth";
import { loadAuthUser } from "../lib/authUser";

export type AuthedRequest = Request & { user?: AuthUser };

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token tidak ditemukan" });
    return;
  }

  try {
    const tokenUser = verifyToken(header.slice(7));
    const currentUser = await loadAuthUser(tokenUser.id);
    if (!currentUser) {
      res.status(401).json({ error: "Akun tidak aktif atau tidak ditemukan" });
      return;
    }
    req.user = currentUser;
    next();
  } catch {
    res.status(401).json({ error: "Sesi berakhir, silakan login kembali" });
  }
}

export function requireOnboardingComplete(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.user?.onboardingComplete) {
    res.status(403).json({ error: "Lengkapi divisi dan penempatan pada login pertama", code: "MUST_COMPLETE_PROFILE" });
    return;
  }
  next();
}

export function requireRoles(...roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Akses ditolak untuk role ini" });
      return;
    }
    next();
  };
}

/**
 * Selama password default belum diganti, user hanya boleh mengakses
 * endpoint auth. Semua fitur lain diblokir di sini.
 */
export function requirePasswordChanged(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.mustChangePassword) {
    res.status(403).json({
      error: "Anda harus mengganti password default terlebih dahulu",
      code: "MUST_CHANGE_PASSWORD",
    });
    return;
  }
  next();
}

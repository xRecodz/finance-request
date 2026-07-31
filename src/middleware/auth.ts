import { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { AuthUser, verifyToken } from "../lib/auth";

export type AuthedRequest = Request & { user?: AuthUser };

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token tidak ditemukan" });
    return;
  }

  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ error: "Sesi berakhir, silakan login kembali" });
  }
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

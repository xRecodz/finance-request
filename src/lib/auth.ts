import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { ApproverTrack, UserRole } from "@prisma/client";
import { env } from "../config/env";

export type AuthUser = {
  id: string;
  nip: string;
  name: string;
  role: UserRole;
  approverTrack: ApproverTrack | null;
  mustChangePassword: boolean;
  onboardingComplete: boolean;
  businessRole: string | null;
  workLocation: string | null;
  homeOutletId: string | null;
  canApprove: boolean;
  canDisburse: boolean;
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as SignOptions);
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, env.JWT_SECRET) as AuthUser;
}

/**
 * Password baru wajib beda dari default dan cukup kuat: minimal
 * MIN_PASSWORD_LENGTH karakter serta mengandung huruf dan angka.
 */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < env.MIN_PASSWORD_LENGTH) {
    return `Password minimal ${env.MIN_PASSWORD_LENGTH} karakter`;
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password harus mengandung huruf dan angka";
  }
  if (password === env.DEFAULT_PASSWORD) {
    return "Password baru tidak boleh sama dengan password default";
  }
  return null;
}

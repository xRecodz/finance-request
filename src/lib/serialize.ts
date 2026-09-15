import { Prisma } from "@prisma/client";

type DecimalLike = Prisma.Decimal | number | string | null | undefined;

/** Decimal Prisma tidak JSON-friendly, selalu lewatkan angka uang lewat sini. */
export function toNumber(value: DecimalLike): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value.toNumber();
}

export function toNumberOrNull(value: DecimalLike): number | null {
  if (value === null || value === undefined) return null;
  return toNumber(value);
}

/** Bulatkan ke rupiah penuh supaya tidak ada pecahan sen liar. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

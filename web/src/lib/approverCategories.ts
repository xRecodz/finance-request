/** Mapping NIP approver → set kategori form (mirror prisma/categories.ts). */
export const APPROVER_CATEGORY_NIPS = {
  SEKRETARIAT: "1109.0.86.00052",
  FINANCE_OUTLET: "1512.0.94.01171", // Belly
  FINANCE_HO: "1906.0.96.05580", // Resi
} as const;

export type CategoryMode = "outlet" | "head_office";

export type SekretariatDest = "HO" | "OUTLET";

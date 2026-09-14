/** Master kategori pengajuan Head Office — dipakai seed & sync. */
export const CATEGORY_MASTER: Array<{
  code: string;
  name: string;
  sortOrder: number;
}> = [
  { code: "OPS", name: "Operasional", sortOrder: 1 },
  { code: "MKT", name: "Marketing", sortOrder: 2 },
  { code: "HRD", name: "HRD", sortOrder: 3 },
  { code: "IT", name: "IT", sortOrder: 4 },
  { code: "GA", name: "GA", sortOrder: 5 },
  { code: "OPEN", name: "Opening Outlet", sortOrder: 6 },
  { code: "LAIN", name: "Lain-Lain", sortOrder: 7 },
];

/** Kategori Head Office (Resi / Sekretariat→HO): tanpa Operasional. */
export const HEAD_OFFICE_CATEGORY_CODES = CATEGORY_MASTER.filter((c) => c.code !== "OPS").map(
  (c) => c.code
);

/** NIP approver yang menentukan set kategori. */
export const APPROVER_CATEGORY_NIPS = {
  SEKRETARIAT: "1109.0.86.00052", // Bu Sari
  FINANCE_OUTLET: "1512.0.94.01171", // Belly → outlet
  FINANCE_HO: "1906.0.96.05580", // Resi → Head Office categories
} as const;

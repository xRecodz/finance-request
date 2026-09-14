/** Master kategori pengajuan — dipakai seed & sync. */
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

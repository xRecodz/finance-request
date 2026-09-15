/**
 * Mapping unit/departemen pemohon → NIP manager.
 *
 * Resolve order (lihat resolveManagerForDepartment):
 * 1. Exact match User.department
 * 2. Keyword di User.position (untuk HO yang department-nya kode DV…)
 *
 * Marketing sengaja dikosongkan — isi nanti.
 */
export const MANAGER_NIPS = {
  /** Ega Hardianto — Finance */
  FINANCE: "1805.1.81.03499",
  /** Sari Kumala Dewi — GA + HRD (juga APPROVER Sekretariat) */
  GA_HRD: "1109.0.86.00052",
  /** Muhammad Handoyo — IT + Accounting + Audit */
  IT_ACC_AUDIT: "1511.1.77.00020",
} as const;

/** Exact match pada User.department (case-sensitive setelah trim). */
export const DEPARTMENT_MANAGER_MAP: Record<string, string> = {
  // Finance → Ega
  Finance: MANAGER_NIPS.FINANCE,
  FINANCE: MANAGER_NIPS.FINANCE,
  Keuangan: MANAGER_NIPS.FINANCE,
  "Akuntansi, Keuangan": MANAGER_NIPS.FINANCE,

  // GA + HRD → Sari
  GA: MANAGER_NIPS.GA_HRD,
  HRD: MANAGER_NIPS.GA_HRD,
  SDM: MANAGER_NIPS.GA_HRD,
  "General Affair": MANAGER_NIPS.GA_HRD,
  "General Affairs": MANAGER_NIPS.GA_HRD,
  Legal: MANAGER_NIPS.GA_HRD,

  // IT + Accounting + Audit → Handoyo
  IT: MANAGER_NIPS.IT_ACC_AUDIT,
  Accounting: MANAGER_NIPS.IT_ACC_AUDIT,
  Akuntansi: MANAGER_NIPS.IT_ACC_AUDIT,
  Audit: MANAGER_NIPS.IT_ACC_AUDIT,
  SPI: MANAGER_NIPS.IT_ACC_AUDIT,

  // Marketing — isi nanti
  // Marketing: "xxxx.x.xx.xxxxx",
};

/**
 * Fallback: cocokkan keyword di position (urutan = prioritas).
 * Dipakai jika department adalah kode DV… / tidak ada di map.
 */
export const POSITION_MANAGER_RULES: Array<{
  nip: string;
  /** Substring case-insensitive; cukup salah satu. */
  includes: string[];
  label: string;
}> = [
  {
    nip: MANAGER_NIPS.GA_HRD,
    includes: ["Legal, GA", "(GA, Lain)", "GA, Lain"],
    label: "GA/HRD",
  },
  {
    nip: MANAGER_NIPS.IT_ACC_AUDIT,
    includes: [
      "Standarisasi",
      "SPI/",
      "SPI,",
      "Auditor",
      "Auditor, IT",
      "(IT)",
      " IT)",
      " IT,",
    ],
    label: "IT/Audit",
  },
  {
    nip: MANAGER_NIPS.IT_ACC_AUDIT,
    includes: ["Akuntansi"],
    label: "Accounting",
  },
  {
    nip: MANAGER_NIPS.FINANCE,
    includes: ["Keuangan", "Finance", "Pajak"],
    label: "Finance",
  },
];

/** NIP unik dari semua manager di mapping (untuk sync role). */
export function managerNipsFromMap(): string[] {
  const fromDept = Object.values(DEPARTMENT_MANAGER_MAP);
  const fromPos = POSITION_MANAGER_RULES.map((r) => r.nip);
  return [...new Set([...fromDept, ...fromPos, ...Object.values(MANAGER_NIPS)].filter(Boolean))];
}

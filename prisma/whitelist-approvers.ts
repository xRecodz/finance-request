import { ApproverTrack, UserRole } from "@prisma/client";

/**
 * NIP yang boleh masuk portal Approval dan muncul di dropdown
 * "pengajuan kepada" pada form /pemohon/requests/new.
 */
export const APPROVER_WHITELIST: Array<{
  nip: string;
  nameHint: string;
  role: UserRole;
  approverTrack: ApproverTrack | null;
}> = [
  {
    nip: "1109.0.86.00052",
    nameHint: "Sari Kumala (Bu Sari)",
    role: UserRole.APPROVER,
    approverTrack: ApproverTrack.DIREKTUR,
  },
  {
    nip: "1512.0.94.01171",
    nameHint: "Belly Suci (Finance)",
    role: UserRole.APPROVER,
    approverTrack: ApproverTrack.FINANCE,
  },
];

/** NIP yang sebelumnya approval dan harus diturunkan ke Pemohon. */
export const DEMOTED_FROM_APPROVER_NIPS = [
  "2510.1.01.79957", // Farhan Nurrahman
  "1511.1.77.00020", // Muhammad Handoyo
] as const;

/** Akun uji lama yang harus dihapus. */
export const LEGACY_TEST_NIPS = ["DIR001", "FIN001", "ADMIN001"] as const;

import { ApproverTrack, UserRole } from "@prisma/client";

/**
 * NIP yang boleh masuk portal Approval / Admin.
 * Dipakai seed & sync role (bukan akun uji DIR001/FIN001/ADMIN001).
 */
export const APPROVER_WHITELIST: Array<{
  nip: string;
  nameHint: string;
  role: UserRole;
  approverTrack: ApproverTrack | null;
}> = [
  {
    nip: "1109.0.86.00052",
    nameHint: "Sari Kumala",
    role: UserRole.APPROVER,
    approverTrack: ApproverTrack.DIREKTUR,
  },
  {
    nip: "2510.1.01.79957",
    nameHint: "Farhan Nurrahman",
    role: UserRole.APPROVER,
    approverTrack: ApproverTrack.DIREKTUR,
  },
  {
    nip: "1512.0.94.01171",
    nameHint: "Belly Suci",
    role: UserRole.APPROVER,
    approverTrack: ApproverTrack.FINANCE,
  },
  {
    nip: "1511.1.77.00020",
    nameHint: "Handoyo",
    role: UserRole.APPROVER,
    approverTrack: ApproverTrack.FINANCE,
  },
];

/** Akun uji lama yang harus dihapus. */
export const LEGACY_TEST_NIPS = ["DIR001", "FIN001", "ADMIN001"] as const;

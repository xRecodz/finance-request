export type Portal = "PEMOHON" | "APPROVAL" | "IT";

export type UserRole = "PEMOHON" | "APPROVER" | "ADMIN" | "IT";
export type ApproverTrack = "DIREKTUR" | "FINANCE";

export function homePathForRole(role: UserRole): string {
  if (role === "IT" || role === "ADMIN") return "/it";
  if (role === "APPROVER") return "/approval";
  return "/pemohon";
}

/** Redirect setelah login sesuai pintu yang dipilih. */
export function pathForPortal(portal: Portal, role: UserRole): string {
  if (portal === "IT") return "/it";
  if (portal === "APPROVAL") return "/approval";
  if (role === "IT") return "/it";
  return "/pemohon";
}

export type ManagedUser = {
  id: string;
  nip: string;
  name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  department: string | null;
  role: UserRole;
  approverTrack: ApproverTrack | null;
  mustChangePassword: boolean;
  isActive: boolean;
  source: string;
  lastLoginAt: string | null;
  passwordChangedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthUser = {
  id: string;
  nip: string;
  name: string;
  role: UserRole;
  approverTrack: ApproverTrack | null;
  mustChangePassword: boolean;
  department?: string | null;
  position?: string | null;
};

export type RequestItem = {
  id?: string;
  name: string;
  spec?: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  subtotal?: number;
  note?: string | null;
};

export type RequestRow = {
  id: string;
  number: string;
  title: string;
  type: string;
  track: ApproverTrack;
  status: string;
  statusLabel: string;
  totalAmount: number;
  approvedAmount: number | null;
  neededDate?: string | null;
  submittedAt?: string | null;
  decidedAt?: string | null;
  disbursedAt?: string | null;
  lpjDueDate?: string | null;
  completedAt?: string | null;
  createdAt: string;
  requester: { id: string; nip: string; name: string; position?: string | null };
  approver: { id: string; nip: string; name: string; position?: string | null };
  category?: { id: string; code: string; name: string } | null;
  itemCount?: number;
  purpose?: string;
  items?: RequestItem[];
  decisionNote?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountHolder?: string | null;
  disbursementRef?: string | null;
  logs?: Array<{
    id: string;
    action: string;
    note?: string | null;
    createdAt: string;
    actor?: { name: string } | null;
    fromStatus?: string | null;
    toStatus?: string | null;
  }>;
  lpj?: {
    id: string;
    status: string;
    totalRealisasi: number;
    sisaDana: number;
    note?: string | null;
    submittedAt: string;
    verificationNote?: string | null;
    items?: Array<{
      id: string;
      description: string;
      transactionDate: string;
      amount: number;
      vendor?: string | null;
    }>;
    attachments?: Array<{
      id: string;
      originalFilename: string;
      mimeType?: string;
      kind?: string;
    }>;
  } | null;
  attachments?: Array<{
    id: string;
    kind: string;
    originalFilename: string;
    mimeType: string;
    fileSize?: number;
  }>;
};

export type DashboardSummary = {
  cards: {
    totalRequests: number;
    pending: number;
    disbursedCount: number;
    disbursedNominal: number;
  };
  statusChart: Array<{
    status: string;
    label: string;
    count: number;
    totalAmount: number;
  }>;
  monthlyChart: Array<{
    month: string;
    count: number;
    totalAmount: number;
    approvedAmount: number;
  }>;
  history: Array<{
    user: { id: string; nip: string; name: string };
    count: number;
    totalAmount: number;
  }>;
};

export type ApproverOption = {
  id: string;
  nip: string;
  name: string;
  position?: string | null;
  department?: string | null;
  approverTrack: ApproverTrack;
};

export type CategoryOption = {
  id: string;
  code: string;
  name: string;
  kind?: "STANDARD" | "OUTLET";
};

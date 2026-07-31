import { Prisma, RequestStatus } from "@prisma/client";
import { toNumber, toNumberOrNull } from "./serialize";

export const userBriefSelect = {
  id: true,
  nip: true,
  name: true,
  position: true,
  department: true,
  role: true,
  approverTrack: true,
} satisfies Prisma.UserSelect;

export const requestDetailInclude = {
  requester: { select: userBriefSelect },
  approver: { select: userBriefSelect },
  category: true,
  items: { orderBy: { sortOrder: "asc" } },
  attachments: {
    include: { uploadedBy: { select: userBriefSelect } },
    orderBy: { createdAt: "asc" },
  },
  logs: {
    include: { actor: { select: userBriefSelect } },
    orderBy: { createdAt: "asc" },
  },
  lpj: {
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      attachments: { orderBy: { createdAt: "asc" } },
      submittedBy: { select: userBriefSelect },
      verifiedBy: { select: userBriefSelect },
    },
  },
} satisfies Prisma.RequestInclude;

export const requestListInclude = {
  requester: { select: userBriefSelect },
  approver: { select: userBriefSelect },
  category: { select: { id: true, code: true, name: true } },
  lpj: { select: { id: true, status: true, submittedAt: true } },
  _count: { select: { items: true, attachments: true } },
} satisfies Prisma.RequestInclude;

type RequestDetail = Prisma.RequestGetPayload<{ include: typeof requestDetailInclude }>;
type RequestListRow = Prisma.RequestGetPayload<{ include: typeof requestListInclude }>;

export const STATUS_LABEL: Record<RequestStatus, string> = {
  DRAFT: "Draft",
  MENUNGGU_APPROVAL: "Menunggu Approval",
  REVISI: "Perlu Revisi",
  DITOLAK: "Ditolak",
  DISETUJUI: "Disetujui",
  DICAIRKAN: "Dana Dicairkan",
  LPJ_MENUNGGU: "LPJ Menunggu Verifikasi",
  LPJ_DITOLAK: "LPJ Ditolak",
  SELESAI: "Selesai",
  DIBATALKAN: "Dibatalkan",
};

/** Status yang masih menyita perhatian approver (dipakai untuk kartu "pendingan"). */
export const PENDING_APPROVAL_STATUSES: RequestStatus[] = [
  RequestStatus.MENUNGGU_APPROVAL,
  RequestStatus.DISETUJUI,
  RequestStatus.LPJ_MENUNGGU,
];

/** Status yang menandakan dana sudah keluar dari kas perusahaan. */
export const DISBURSED_STATUSES: RequestStatus[] = [
  RequestStatus.DICAIRKAN,
  RequestStatus.LPJ_MENUNGGU,
  RequestStatus.LPJ_DITOLAK,
  RequestStatus.SELESAI,
];

export function serializeRequestList(row: RequestListRow) {
  return {
    id: row.id,
    number: row.number,
    title: row.title,
    type: row.type,
    track: row.track,
    status: row.status,
    statusLabel: STATUS_LABEL[row.status],
    totalAmount: toNumber(row.totalAmount),
    approvedAmount: toNumberOrNull(row.approvedAmount),
    neededDate: row.neededDate,
    submittedAt: row.submittedAt,
    decidedAt: row.decidedAt,
    disbursedAt: row.disbursedAt,
    lpjDueDate: row.lpjDueDate,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    requester: row.requester,
    approver: row.approver,
    category: row.category,
    lpj: row.lpj,
    itemCount: row._count.items,
    attachmentCount: row._count.attachments,
  };
}

export function serializeRequestDetail(row: RequestDetail) {
  return {
    id: row.id,
    number: row.number,
    title: row.title,
    purpose: row.purpose,
    type: row.type,
    track: row.track,
    status: row.status,
    statusLabel: STATUS_LABEL[row.status],
    totalAmount: toNumber(row.totalAmount),
    approvedAmount: toNumberOrNull(row.approvedAmount),
    neededDate: row.neededDate,
    bankName: row.bankName,
    bankAccountNumber: row.bankAccountNumber,
    bankAccountHolder: row.bankAccountHolder,
    submittedAt: row.submittedAt,
    decidedAt: row.decidedAt,
    decisionNote: row.decisionNote,
    disbursedAt: row.disbursedAt,
    disbursementRef: row.disbursementRef,
    disbursementNote: row.disbursementNote,
    lpjDueDate: row.lpjDueDate,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    requester: row.requester,
    approver: row.approver,
    category: row.category,
    items: row.items.map((item) => ({
      id: item.id,
      name: item.name,
      spec: item.spec,
      quantity: toNumber(item.quantity),
      unit: item.unit,
      unitPrice: toNumber(item.unitPrice),
      subtotal: toNumber(item.subtotal),
      note: item.note,
    })),
    attachments: row.attachments.map((file) => ({
      id: file.id,
      kind: file.kind,
      originalFilename: file.originalFilename,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      createdAt: file.createdAt,
      uploadedBy: file.uploadedBy,
    })),
    logs: row.logs.map((log) => ({
      id: log.id,
      action: log.action,
      fromStatus: log.fromStatus,
      toStatus: log.toStatus,
      note: log.note,
      createdAt: log.createdAt,
      actor: log.actor,
    })),
    lpj: row.lpj
      ? {
          id: row.lpj.id,
          status: row.lpj.status,
          totalRealisasi: toNumber(row.lpj.totalRealisasi),
          sisaDana: toNumber(row.lpj.sisaDana),
          note: row.lpj.note,
          submittedAt: row.lpj.submittedAt,
          submittedBy: row.lpj.submittedBy,
          verifiedAt: row.lpj.verifiedAt,
          verifiedBy: row.lpj.verifiedBy,
          verificationNote: row.lpj.verificationNote,
          items: row.lpj.items.map((item) => ({
            id: item.id,
            description: item.description,
            transactionDate: item.transactionDate,
            amount: toNumber(item.amount),
            vendor: item.vendor,
          })),
          attachments: row.lpj.attachments.map((file) => ({
            id: file.id,
            kind: file.kind,
            originalFilename: file.originalFilename,
            mimeType: file.mimeType,
            fileSize: file.fileSize,
            createdAt: file.createdAt,
          })),
        }
      : null,
  };
}

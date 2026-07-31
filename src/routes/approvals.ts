import { Router } from "express";
import {
  AttachmentKind,
  Prisma,
  RequestStatus,
  UserRole,
} from "@prisma/client";
import { z } from "zod";
import { env } from "../config/env";
import { logActivity } from "../lib/activity";
import { formatRupiah, notify } from "../lib/notify";
import { prisma } from "../lib/prisma";
import { requestDetailInclude, serializeRequestDetail } from "../lib/requestView";
import { toNumber } from "../lib/serialize";
import { buildObjectKey, getBucketForKind, uploadToR2 } from "../lib/storage";
import { AuthedRequest, requireAuth, requirePasswordChanged, requireRoles } from "../middleware/auth";
import { HttpError, asyncHandler } from "../middleware/errorHandler";
import { upload } from "../middleware/upload";

export const approvalsRouter = Router();

approvalsRouter.use(
  requireAuth,
  requirePasswordChanged,
  requireRoles(UserRole.APPROVER, UserRole.ADMIN)
);

/** Approver hanya boleh menyentuh pengajuan yang memang ditujukan kepadanya. */
async function findAssignedRequest(id: string, user: AuthedRequest["user"]) {
  const request = await prisma.request.findUnique({
    where: { id },
    include: requestDetailInclude,
  });
  if (!request) throw new HttpError(404, "Pengajuan tidak ditemukan");
  if (user!.role !== UserRole.ADMIN && request.approverId !== user!.id) {
    throw new HttpError(403, "Pengajuan ini bukan ditujukan kepada Anda");
  }
  return request;
}

const decisionSchema = z.object({
  approvedAmount: z.coerce.number().min(0).optional(),
  note: z.string().trim().optional().nullable(),
});

approvalsRouter.post(
  "/:id/approve",
  asyncHandler<AuthedRequest>(async (req, res) => {
    const body = decisionSchema.parse(req.body);
    const request = await findAssignedRequest(req.params.id, req.user);

    if (request.status !== RequestStatus.MENUNGGU_APPROVAL) {
      throw new HttpError(409, "Pengajuan ini tidak sedang menunggu approval");
    }

    const requested = toNumber(request.totalAmount);
    const approvedAmount = body.approvedAmount ?? requested;
    if (approvedAmount > requested) {
      throw new HttpError(400, "Nominal disetujui tidak boleh melebihi nominal pengajuan");
    }

    const updated = await prisma.request.update({
      where: { id: request.id },
      data: {
        status: RequestStatus.DISETUJUI,
        approvedAmount: new Prisma.Decimal(approvedAmount),
        decidedAt: new Date(),
        decisionNote: body.note || null,
        logs: {
          create: {
            actorId: req.user!.id,
            action: "APPROVE",
            fromStatus: request.status,
            toStatus: RequestStatus.DISETUJUI,
            note:
              body.note ||
              (approvedAmount < requested
                ? `Disetujui sebagian: ${formatRupiah(approvedAmount)}`
                : "Pengajuan disetujui"),
          },
        },
      },
      include: requestDetailInclude,
    });

    notify({
      userId: updated.requesterId,
      title: "Pengajuan disetujui",
      body: `${updated.number} disetujui sebesar ${formatRupiah(approvedAmount)}. Menunggu pencairan dana.`,
      requestId: updated.id,
    });

    logActivity({
      actorId: req.user!.id,
      action: "APPROVE",
      entity: "Request",
      entityId: updated.id,
      detail: `${updated.number} — ${formatRupiah(approvedAmount)}`,
      ip: req.ip,
    });

    res.json({ data: serializeRequestDetail(updated) });
  })
);

const rejectSchema = z.object({
  note: z.string().trim().min(3, "Alasan penolakan wajib diisi"),
});

approvalsRouter.post(
  "/:id/reject",
  asyncHandler<AuthedRequest>(async (req, res) => {
    const body = rejectSchema.parse(req.body);
    const request = await findAssignedRequest(req.params.id, req.user);

    if (request.status !== RequestStatus.MENUNGGU_APPROVAL) {
      throw new HttpError(409, "Pengajuan ini tidak sedang menunggu approval");
    }

    const updated = await prisma.request.update({
      where: { id: request.id },
      data: {
        status: RequestStatus.DITOLAK,
        decidedAt: new Date(),
        decisionNote: body.note,
        logs: {
          create: {
            actorId: req.user!.id,
            action: "REJECT",
            fromStatus: request.status,
            toStatus: RequestStatus.DITOLAK,
            note: body.note,
          },
        },
      },
      include: requestDetailInclude,
    });

    notify({
      userId: updated.requesterId,
      title: "Pengajuan ditolak",
      body: `${updated.number} ditolak. Alasan: ${body.note}`,
      requestId: updated.id,
    });

    logActivity({
      actorId: req.user!.id,
      action: "REJECT",
      entity: "Request",
      entityId: updated.id,
      detail: updated.number,
      ip: req.ip,
    });

    res.json({ data: serializeRequestDetail(updated) });
  })
);

approvalsRouter.post(
  "/:id/revise",
  asyncHandler<AuthedRequest>(async (req, res) => {
    const body = rejectSchema.parse(req.body);
    const request = await findAssignedRequest(req.params.id, req.user);

    if (request.status !== RequestStatus.MENUNGGU_APPROVAL) {
      throw new HttpError(409, "Pengajuan ini tidak sedang menunggu approval");
    }

    const updated = await prisma.request.update({
      where: { id: request.id },
      data: {
        status: RequestStatus.REVISI,
        decisionNote: body.note,
        logs: {
          create: {
            actorId: req.user!.id,
            action: "REQUEST_REVISION",
            fromStatus: request.status,
            toStatus: RequestStatus.REVISI,
            note: body.note,
          },
        },
      },
      include: requestDetailInclude,
    });

    notify({
      userId: updated.requesterId,
      title: "Pengajuan perlu revisi",
      body: `${updated.number} dikembalikan untuk diperbaiki. Catatan: ${body.note}`,
      requestId: updated.id,
    });

    res.json({ data: serializeRequestDetail(updated) });
  })
);

const disburseSchema = z.object({
  disbursementRef: z.string().trim().optional().nullable(),
  disbursedAt: z.coerce.date().optional(),
  note: z.string().trim().optional().nullable(),
});

approvalsRouter.post(
  "/:id/disburse",
  upload.single("proof"),
  asyncHandler<AuthedRequest>(async (req, res) => {
    const body = disburseSchema.parse(req.body);
    const request = await findAssignedRequest(req.params.id, req.user);

    if (request.status !== RequestStatus.DISETUJUI) {
      throw new HttpError(409, "Dana hanya bisa dicairkan untuk pengajuan yang sudah disetujui");
    }

    const disbursedAt = body.disbursedAt ?? new Date();
    const lpjDueDate = new Date(disbursedAt);
    lpjDueDate.setDate(lpjDueDate.getDate() + env.LPJ_DUE_DAYS);

    const file = req.file;
    if (file) {
      const bucket = getBucketForKind(AttachmentKind.BUKTI_TRANSFER);
      const key = buildObjectKey({
        kind: AttachmentKind.BUKTI_TRANSFER,
        requestNumber: request.number,
        originalFilename: file.originalname,
      });
      await uploadToR2({ bucket, key, body: file.buffer, contentType: file.mimetype });
      await prisma.attachment.create({
        data: {
          kind: AttachmentKind.BUKTI_TRANSFER,
          requestId: request.id,
          uploadedById: req.user!.id,
          bucket,
          objectKey: key,
          originalFilename: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
        },
      });
    }

    const updated = await prisma.request.update({
      where: { id: request.id },
      data: {
        status: RequestStatus.DICAIRKAN,
        disbursedAt,
        disbursementRef: body.disbursementRef || null,
        disbursementNote: body.note || null,
        lpjDueDate,
        logs: {
          create: {
            actorId: req.user!.id,
            action: "DISBURSE",
            fromStatus: request.status,
            toStatus: RequestStatus.DICAIRKAN,
            note: body.note || `Dana ditransfer${body.disbursementRef ? ` — ref ${body.disbursementRef}` : ""}`,
          },
        },
      },
      include: requestDetailInclude,
    });

    notify({
      userId: updated.requesterId,
      title: "Dana telah ditransfer",
      body: `Dana untuk ${updated.number} sudah ditransfer. LPJ ditunggu paling lambat ${lpjDueDate.toLocaleDateString("id-ID")}.`,
      requestId: updated.id,
    });

    logActivity({
      actorId: req.user!.id,
      action: "DISBURSE",
      entity: "Request",
      entityId: updated.id,
      detail: updated.number,
      ip: req.ip,
    });

    res.json({ data: serializeRequestDetail(updated) });
  })
);

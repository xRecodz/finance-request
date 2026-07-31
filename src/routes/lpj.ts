import { Router } from "express";
import {
  AttachmentKind,
  LpjStatus,
  Prisma,
  RequestStatus,
  UserRole,
} from "@prisma/client";
import { z } from "zod";
import { logActivity } from "../lib/activity";
import { formatRupiah, notify } from "../lib/notify";
import { prisma } from "../lib/prisma";
import { requestDetailInclude, serializeRequestDetail } from "../lib/requestView";
import { roundMoney, toNumber } from "../lib/serialize";
import { buildObjectKey, getBucketForKind, uploadToR2 } from "../lib/storage";
import { AuthedRequest, requireAuth, requirePasswordChanged } from "../middleware/auth";
import { HttpError, asyncHandler } from "../middleware/errorHandler";
import { upload } from "../middleware/upload";

export const lpjRouter = Router();

lpjRouter.use(requireAuth, requirePasswordChanged);

const lpjItemSchema = z.object({
  description: z.string().trim().min(1, "Keterangan transaksi wajib diisi"),
  transactionDate: z.coerce.date(),
  amount: z.coerce.number().min(0, "Nominal tidak boleh negatif"),
  vendor: z.string().trim().optional().nullable(),
});

const lpjSchema = z.object({
  note: z.string().trim().optional().nullable(),
  items: z.array(lpjItemSchema).min(1, "Minimal satu rincian transaksi"),
});

const LPJ_ALLOWED_STATUSES: RequestStatus[] = [
  RequestStatus.DICAIRKAN,
  RequestStatus.LPJ_DITOLAK,
];

/**
 * Kirim / kirim ulang LPJ. LPJ yang ditolak ditimpa isinya agar pemohon
 * tidak perlu membuat laporan baru dari nol.
 */
lpjRouter.post(
  "/requests/:id/lpj",
  asyncHandler<AuthedRequest>(async (req, res) => {
    const body = lpjSchema.parse(req.body);
    const request = await prisma.request.findUnique({
      where: { id: req.params.id },
      include: { lpj: true },
    });
    if (!request) throw new HttpError(404, "Pengajuan tidak ditemukan");
    if (request.requesterId !== req.user!.id) {
      throw new HttpError(403, "Hanya pemohon yang bisa mengirim LPJ");
    }
    if (!LPJ_ALLOWED_STATUSES.includes(request.status)) {
      throw new HttpError(409, "LPJ hanya bisa dikirim setelah dana dicairkan");
    }

    const totalRealisasi = roundMoney(
      body.items.reduce((sum, item) => sum + item.amount, 0)
    );
    const diterima = toNumber(request.approvedAmount ?? request.totalAmount);
    const sisaDana = roundMoney(diterima - totalRealisasi);

    const items = body.items.map((item, index) => ({
      description: item.description,
      transactionDate: item.transactionDate,
      amount: new Prisma.Decimal(item.amount),
      vendor: item.vendor || null,
      sortOrder: index,
    }));

    const updated = await prisma.$transaction(async (tx) => {
      if (request.lpj) {
        await tx.lpjItem.deleteMany({ where: { lpjId: request.lpj.id } });
        await tx.lpj.update({
          where: { id: request.lpj.id },
          data: {
            totalRealisasi: new Prisma.Decimal(totalRealisasi),
            sisaDana: new Prisma.Decimal(sisaDana),
            note: body.note || null,
            status: LpjStatus.MENUNGGU,
            submittedAt: new Date(),
            verifiedById: null,
            verifiedAt: null,
            verificationNote: null,
            items: { create: items },
          },
        });
      } else {
        await tx.lpj.create({
          data: {
            requestId: request.id,
            submittedById: req.user!.id,
            totalRealisasi: new Prisma.Decimal(totalRealisasi),
            sisaDana: new Prisma.Decimal(sisaDana),
            note: body.note || null,
            items: { create: items },
          },
        });
      }

      return tx.request.update({
        where: { id: request.id },
        data: {
          status: RequestStatus.LPJ_MENUNGGU,
          logs: {
            create: {
              actorId: req.user!.id,
              action: request.lpj ? "RESUBMIT_LPJ" : "SUBMIT_LPJ",
              fromStatus: request.status,
              toStatus: RequestStatus.LPJ_MENUNGGU,
              note: `Realisasi ${formatRupiah(totalRealisasi)}, sisa ${formatRupiah(sisaDana)}`,
            },
          },
        },
        include: requestDetailInclude,
      });
    });

    notify({
      userId: updated.approverId,
      title: "LPJ menunggu verifikasi",
      body: `${updated.requester.name} mengirim LPJ untuk ${updated.number}.`,
      requestId: updated.id,
    });

    logActivity({
      actorId: req.user!.id,
      action: "SUBMIT_LPJ",
      entity: "Request",
      entityId: updated.id,
      detail: updated.number,
      ip: req.ip,
    });

    res.status(201).json({ data: serializeRequestDetail(updated) });
  })
);

lpjRouter.post(
  "/lpj/:id/attachments",
  upload.array("files", 20),
  asyncHandler<AuthedRequest>(async (req, res) => {
    const lpj = await prisma.lpj.findUnique({
      where: { id: req.params.id },
      include: { request: { select: { id: true, number: true, requesterId: true } } },
    });
    if (!lpj) throw new HttpError(404, "LPJ tidak ditemukan");
    if (lpj.request.requesterId !== req.user!.id) {
      throw new HttpError(403, "Hanya pemohon yang bisa mengunggah bukti LPJ");
    }
    if (lpj.status === LpjStatus.DISETUJUI) {
      throw new HttpError(409, "LPJ sudah disetujui dan terkunci");
    }

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) throw new HttpError(400, "Tidak ada file yang diunggah");

    const bucket = getBucketForKind(AttachmentKind.BUKTI_LPJ);
    const created = [];

    for (const file of files) {
      const key = buildObjectKey({
        kind: AttachmentKind.BUKTI_LPJ,
        requestNumber: lpj.request.number,
        originalFilename: file.originalname,
      });
      await uploadToR2({ bucket, key, body: file.buffer, contentType: file.mimetype });
      created.push(
        await prisma.attachment.create({
          data: {
            kind: AttachmentKind.BUKTI_LPJ,
            lpjId: lpj.id,
            uploadedById: req.user!.id,
            bucket,
            objectKey: key,
            originalFilename: file.originalname,
            mimeType: file.mimetype,
            fileSize: file.size,
          },
        })
      );
    }

    res.status(201).json({
      data: created.map((file) => ({ id: file.id, name: file.originalFilename })),
    });
  })
);

const verifySchema = z.object({
  approve: z.coerce.boolean(),
  note: z.string().trim().optional().nullable(),
});

lpjRouter.post(
  "/lpj/:id/verify",
  asyncHandler<AuthedRequest>(async (req, res) => {
    const body = verifySchema.parse(req.body);
    const lpj = await prisma.lpj.findUnique({
      where: { id: req.params.id },
      include: { request: true, attachments: true },
    });
    if (!lpj) throw new HttpError(404, "LPJ tidak ditemukan");

    const user = req.user!;
    if (user.role !== UserRole.ADMIN && lpj.request.approverId !== user.id) {
      throw new HttpError(403, "Anda bukan approver untuk pengajuan ini");
    }
    if (lpj.status !== LpjStatus.MENUNGGU) {
      throw new HttpError(409, "LPJ ini sudah diverifikasi");
    }
    if (!body.approve && !body.note) {
      throw new HttpError(400, "Alasan penolakan LPJ wajib diisi");
    }

    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      await tx.lpj.update({
        where: { id: lpj.id },
        data: {
          status: body.approve ? LpjStatus.DISETUJUI : LpjStatus.DITOLAK,
          verifiedById: user.id,
          verifiedAt: now,
          verificationNote: body.note || null,
        },
      });

      return tx.request.update({
        where: { id: lpj.requestId },
        data: {
          status: body.approve ? RequestStatus.SELESAI : RequestStatus.LPJ_DITOLAK,
          completedAt: body.approve ? now : null,
          logs: {
            create: {
              actorId: user.id,
              action: body.approve ? "APPROVE_LPJ" : "REJECT_LPJ",
              fromStatus: lpj.request.status,
              toStatus: body.approve ? RequestStatus.SELESAI : RequestStatus.LPJ_DITOLAK,
              note: body.note || (body.approve ? "LPJ disetujui, pengajuan selesai" : null),
            },
          },
        },
        include: requestDetailInclude,
      });
    });

    notify({
      userId: updated.requesterId,
      title: body.approve ? "LPJ disetujui" : "LPJ ditolak",
      body: body.approve
        ? `LPJ untuk ${updated.number} disetujui. Pengajuan selesai.`
        : `LPJ untuk ${updated.number} ditolak. Catatan: ${body.note}`,
      requestId: updated.id,
    });

    logActivity({
      actorId: user.id,
      action: body.approve ? "APPROVE_LPJ" : "REJECT_LPJ",
      entity: "Lpj",
      entityId: lpj.id,
      detail: updated.number,
      ip: req.ip,
    });

    res.json({ data: serializeRequestDetail(updated) });
  })
);

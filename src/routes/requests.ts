import { Router } from "express";
import {
  ApproverTrack,
  AttachmentKind,
  Prisma,
  RequestStatus,
  RequestType,
  UserRole,
} from "@prisma/client";
import { z } from "zod";
import { logActivity } from "../lib/activity";
import { formatRupiah, notify } from "../lib/notify";
import { generateRequestNumber } from "../lib/numbering";
import { prisma } from "../lib/prisma";
import {
  requestDetailInclude,
  requestListInclude,
  serializeRequestDetail,
  serializeRequestList,
} from "../lib/requestView";
import { roundMoney } from "../lib/serialize";
import { buildObjectKey, getBucketForKind, uploadToR2 } from "../lib/storage";
import { AuthedRequest, requireAuth, requirePasswordChanged } from "../middleware/auth";
import { HttpError, asyncHandler } from "../middleware/errorHandler";
import { upload } from "../middleware/upload";

export const requestsRouter = Router();

requestsRouter.use(requireAuth, requirePasswordChanged);

// ── Skema input ─────────────────────────────────────────────────────────────

const itemSchema = z.object({
  name: z.string().trim().min(1, "Nama item wajib diisi"),
  spec: z.string().trim().optional().nullable(),
  quantity: z.coerce.number().positive("Jumlah harus lebih dari 0"),
  unit: z.string().trim().min(1).default("pcs"),
  unitPrice: z.coerce.number().min(0, "Harga tidak boleh negatif"),
  note: z.string().trim().optional().nullable(),
});

const requestBodySchema = z.object({
  type: z.nativeEnum(RequestType).default(RequestType.DANA),
  track: z.nativeEnum(ApproverTrack),
  approverId: z.string().min(1, "Tujuan approval wajib dipilih"),
  categoryId: z.string().optional().nullable(),
  title: z.string().trim().min(3, "Judul minimal 3 karakter"),
  purpose: z.string().trim().min(5, "Keperluan wajib dijelaskan"),
  neededDate: z.coerce.date().optional().nullable(),
  bankName: z.string().trim().optional().nullable(),
  bankAccountNumber: z.string().trim().optional().nullable(),
  bankAccountHolder: z.string().trim().optional().nullable(),
  items: z.array(itemSchema).min(1, "Minimal satu item pengajuan"),
  submit: z.boolean().default(false),
});

const listQuerySchema = z.object({
  status: z.string().optional(),
  track: z.nativeEnum(ApproverTrack).optional(),
  type: z.nativeEnum(RequestType).optional(),
  requesterId: z.string().optional(),
  approverId: z.string().optional(),
  /** requester = pengajuan yang saya buat; approver = yang ditujukan ke saya */
  as: z.enum(["requester", "approver"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Helper ──────────────────────────────────────────────────────────────────

function computeItems(items: z.infer<typeof itemSchema>[]) {
  const prepared = items.map((item, index) => {
    const subtotal = roundMoney(item.quantity * item.unitPrice);
    return {
      name: item.name,
      spec: item.spec || null,
      quantity: new Prisma.Decimal(item.quantity),
      unit: item.unit,
      unitPrice: new Prisma.Decimal(item.unitPrice),
      subtotal: new Prisma.Decimal(subtotal),
      note: item.note || null,
      sortOrder: index,
    };
  });
  const total = roundMoney(
    prepared.reduce((sum, item) => sum + item.subtotal.toNumber(), 0)
  );
  return { prepared, total };
}

/**
 * Approver yang dipilih harus memang approver aktif dan jalurnya cocok
 * dengan pilihan "kepada siapa" di form.
 */
async function assertApproverValid(
  approverId: string,
  track: ApproverTrack,
  actorId: string
) {
  if (approverId === actorId) {
    throw new HttpError(400, "Tidak dapat mengajukan kepada diri sendiri");
  }
  const approver = await prisma.user.findUnique({ where: { id: approverId } });
  if (!approver || !approver.isActive || approver.role !== UserRole.APPROVER) {
    throw new HttpError(400, "Tujuan approval tidak valid");
  }
  if (approver.approverTrack !== track) {
    throw new HttpError(400, "Approver yang dipilih tidak sesuai dengan jalur pengajuan");
  }
  return approver;
}

async function findRequestOr404(id: string) {
  const request = await prisma.request.findUnique({
    where: { id },
    include: requestDetailInclude,
  });
  if (!request) throw new HttpError(404, "Pengajuan tidak ditemukan");
  return request;
}

function assertCanView(request: { requesterId: string; approverId: string }, user: AuthedRequest["user"]) {
  if (!user) throw new HttpError(401, "Unauthorized");
  if (user.role === UserRole.ADMIN) return;
  if (request.requesterId === user.id || request.approverId === user.id) return;
  throw new HttpError(403, "Anda tidak memiliki akses ke pengajuan ini");
}

function assertOwner(request: { requesterId: string }, user: AuthedRequest["user"]) {
  if (request.requesterId !== user!.id) {
    throw new HttpError(403, "Hanya pemohon yang bisa mengubah pengajuan ini");
  }
}

const EDITABLE_STATUSES: RequestStatus[] = [RequestStatus.DRAFT, RequestStatus.REVISI];

// ── Endpoint ────────────────────────────────────────────────────────────────

requestsRouter.get(
  "/",
  asyncHandler<AuthedRequest>(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const user = req.user!;

    const where: Prisma.RequestWhereInput = {};

    // Portal pemohon mengirim as=requester (termasuk jika user role-nya APPROVER).
    if (query.as === "requester" || user.role === UserRole.PEMOHON) {
      where.requesterId = user.id;
    } else if (user.role === UserRole.APPROVER) {
      where.approverId = user.id;
    } else {
      if (query.requesterId) where.requesterId = query.requesterId;
      if (query.approverId) where.approverId = query.approverId;
    }

    if (query.status) {
      const statuses = query.status
        .split(",")
        .map((value) => value.trim())
        .filter((value): value is RequestStatus => value in RequestStatus);
      if (statuses.length) where.status = { in: statuses };
    }
    if (query.track) where.track = query.track;
    if (query.type) where.type = query.type;

    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lte: endOfDay(query.to) } : {}),
      };
    }

    if (query.q) {
      where.OR = [
        { number: { contains: query.q } },
        { title: { contains: query.q } },
        { purpose: { contains: query.q } },
        { requester: { name: { contains: query.q } } },
        { requester: { nip: { contains: query.q } } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.request.count({ where }),
      prisma.request.findMany({
        where,
        include: requestListInclude,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    res.json({
      data: rows.map(serializeRequestList),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    });
  })
);

/** Ekspor CSV filter yang sama dengan list (max 5000 baris). */
requestsRouter.get(
  "/export.csv",
  asyncHandler<AuthedRequest>(async (req, res) => {
    const query = listQuerySchema.parse({ ...req.query, page: 1, pageSize: 5000 });
    const user = req.user!;
    const where: Prisma.RequestWhereInput = {};

    if (query.as === "requester" || user.role === UserRole.PEMOHON) {
      where.requesterId = user.id;
    } else if (user.role === UserRole.APPROVER) {
      where.approverId = user.id;
    } else {
      if (query.requesterId) where.requesterId = query.requesterId;
      if (query.approverId) where.approverId = query.approverId;
    }

    if (query.status) {
      const statuses = query.status
        .split(",")
        .map((value) => value.trim())
        .filter((value): value is RequestStatus => value in RequestStatus);
      if (statuses.length) where.status = { in: statuses };
    }
    if (query.track) where.track = query.track;
    if (query.type) where.type = query.type;
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lte: endOfDay(query.to) } : {}),
      };
    }
    if (query.q) {
      where.OR = [
        { number: { contains: query.q } },
        { title: { contains: query.q } },
        { purpose: { contains: query.q } },
        { requester: { name: { contains: query.q } } },
        { requester: { nip: { contains: query.q } } },
      ];
    }

    const rows = await prisma.request.findMany({
      where,
      include: requestListInclude,
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    const escape = (v: string | number | null | undefined) => {
      const s = v == null ? "" : String(v);
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const header = [
      "Nomor",
      "Judul",
      "Jenis",
      "Jalur",
      "Status",
      "Pemohon NIP",
      "Pemohon",
      "Approver",
      "Total",
      "Disetujui",
      "Tanggal",
    ];
    const lines = [header.join(",")];
    for (const row of rows) {
      const s = serializeRequestList(row);
      lines.push(
        [
          escape(s.number),
          escape(s.title),
          escape(s.type),
          escape(s.track),
          escape(s.statusLabel),
          escape(s.requester.nip),
          escape(s.requester.name),
          escape(s.approver.name),
          escape(s.totalAmount),
          escape(s.approvedAmount ?? ""),
          escape(s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt)),
        ].join(",")
      );
    }

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="pengajuan-${stamp}.csv"`);
    res.send("\uFEFF" + lines.join("\n"));
  })
);

requestsRouter.get(
  "/:id",
  asyncHandler<AuthedRequest>(async (req, res) => {
    const request = await findRequestOr404(req.params.id);
    assertCanView(request, req.user);
    res.json({ data: serializeRequestDetail(request) });
  })
);

requestsRouter.post(
  "/",
  asyncHandler<AuthedRequest>(async (req, res) => {
    const body = requestBodySchema.parse(req.body);
    const user = req.user!;

    await assertApproverValid(body.approverId, body.track, user.id);
    const { prepared, total } = computeItems(body.items);

    const created = await prisma.$transaction(async (tx) => {
      const number = await generateRequestNumber(tx);
      const submitting = body.submit;

      return tx.request.create({
        data: {
          number,
          requesterId: user.id,
          approverId: body.approverId,
          track: body.track,
          type: body.type,
          categoryId: body.categoryId || null,
          title: body.title,
          purpose: body.purpose,
          neededDate: body.neededDate ?? null,
          bankName: body.bankName || null,
          bankAccountNumber: body.bankAccountNumber || null,
          bankAccountHolder: body.bankAccountHolder || null,
          totalAmount: new Prisma.Decimal(total),
          status: submitting ? RequestStatus.MENUNGGU_APPROVAL : RequestStatus.DRAFT,
          submittedAt: submitting ? new Date() : null,
          items: { create: prepared },
          logs: {
            create: {
              actorId: user.id,
              action: submitting ? "SUBMIT" : "CREATE_DRAFT",
              toStatus: submitting ? RequestStatus.MENUNGGU_APPROVAL : RequestStatus.DRAFT,
              note: submitting ? "Pengajuan dikirim ke approver" : "Pengajuan disimpan sebagai draft",
            },
          },
        },
        include: requestDetailInclude,
      });
    });

    if (created.status === RequestStatus.MENUNGGU_APPROVAL) {
      notify({
        userId: created.approverId,
        title: "Pengajuan baru menunggu approval",
        body: `${created.requester.name} mengajukan ${created.number} sebesar ${formatRupiah(total)}.`,
        requestId: created.id,
      });
    }

    logActivity({
      actorId: user.id,
      action: created.status === RequestStatus.DRAFT ? "CREATE_DRAFT" : "SUBMIT_REQUEST",
      entity: "Request",
      entityId: created.id,
      detail: created.number,
      ip: req.ip,
    });

    res.status(201).json({ data: serializeRequestDetail(created) });
  })
);

requestsRouter.patch(
  "/:id",
  asyncHandler<AuthedRequest>(async (req, res) => {
    const body = requestBodySchema.parse(req.body);
    const existing = await findRequestOr404(req.params.id);
    assertOwner(existing, req.user);

    if (!EDITABLE_STATUSES.includes(existing.status)) {
      throw new HttpError(
        409,
        "Pengajuan yang sudah dikirim tidak bisa diubah. Minta approver mengembalikannya untuk revisi."
      );
    }

    await assertApproverValid(body.approverId, body.track, req.user!.id);
    const { prepared, total } = computeItems(body.items);
    const submitting = body.submit;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.requestItem.deleteMany({ where: { requestId: existing.id } });
      return tx.request.update({
        where: { id: existing.id },
        data: {
          approverId: body.approverId,
          track: body.track,
          type: body.type,
          categoryId: body.categoryId || null,
          title: body.title,
          purpose: body.purpose,
          neededDate: body.neededDate ?? null,
          bankName: body.bankName || null,
          bankAccountNumber: body.bankAccountNumber || null,
          bankAccountHolder: body.bankAccountHolder || null,
          totalAmount: new Prisma.Decimal(total),
          status: submitting ? RequestStatus.MENUNGGU_APPROVAL : existing.status,
          submittedAt: submitting ? new Date() : existing.submittedAt,
          items: { create: prepared },
          logs: {
            create: {
              actorId: req.user!.id,
              action: submitting ? "RESUBMIT" : "UPDATE",
              fromStatus: existing.status,
              toStatus: submitting ? RequestStatus.MENUNGGU_APPROVAL : existing.status,
              note: submitting ? "Pengajuan dikirim ulang setelah revisi" : "Pengajuan diperbarui",
            },
          },
        },
        include: requestDetailInclude,
      });
    });

    if (submitting) {
      notify({
        userId: updated.approverId,
        title: "Pengajuan diperbarui & dikirim ulang",
        body: `${updated.requester.name} mengirim ulang ${updated.number} sebesar ${formatRupiah(total)}.`,
        requestId: updated.id,
      });
    }

    logActivity({
      actorId: req.user!.id,
      action: "UPDATE_REQUEST",
      entity: "Request",
      entityId: updated.id,
      detail: updated.number,
      ip: req.ip,
    });

    res.json({ data: serializeRequestDetail(updated) });
  })
);

requestsRouter.post(
  "/:id/submit",
  asyncHandler<AuthedRequest>(async (req, res) => {
    const existing = await findRequestOr404(req.params.id);
    assertOwner(existing, req.user);

    if (!EDITABLE_STATUSES.includes(existing.status)) {
      throw new HttpError(409, "Pengajuan ini sudah dikirim sebelumnya");
    }
    if (existing.items.length === 0) {
      throw new HttpError(400, "Tambahkan minimal satu item sebelum mengirim");
    }

    const updated = await prisma.request.update({
      where: { id: existing.id },
      data: {
        status: RequestStatus.MENUNGGU_APPROVAL,
        submittedAt: new Date(),
        logs: {
          create: {
            actorId: req.user!.id,
            action: "SUBMIT",
            fromStatus: existing.status,
            toStatus: RequestStatus.MENUNGGU_APPROVAL,
            note: "Pengajuan dikirim ke approver",
          },
        },
      },
      include: requestDetailInclude,
    });

    notify({
      userId: updated.approverId,
      title: "Pengajuan baru menunggu approval",
      body: `${updated.requester.name} mengajukan ${updated.number}.`,
      requestId: updated.id,
    });

    res.json({ data: serializeRequestDetail(updated) });
  })
);

requestsRouter.post(
  "/:id/cancel",
  asyncHandler<AuthedRequest>(async (req, res) => {
    const existing = await findRequestOr404(req.params.id);
    assertOwner(existing, req.user);

    const cancellable: RequestStatus[] = [
      RequestStatus.DRAFT,
      RequestStatus.MENUNGGU_APPROVAL,
      RequestStatus.REVISI,
    ];
    if (!cancellable.includes(existing.status)) {
      throw new HttpError(409, "Pengajuan pada tahap ini tidak bisa dibatalkan");
    }

    const updated = await prisma.request.update({
      where: { id: existing.id },
      data: {
        status: RequestStatus.DIBATALKAN,
        logs: {
          create: {
            actorId: req.user!.id,
            action: "CANCEL",
            fromStatus: existing.status,
            toStatus: RequestStatus.DIBATALKAN,
            note: typeof req.body?.note === "string" ? req.body.note : null,
          },
        },
      },
      include: requestDetailInclude,
    });

    res.json({ data: serializeRequestDetail(updated) });
  })
);

requestsRouter.delete(
  "/:id",
  asyncHandler<AuthedRequest>(async (req, res) => {
    const existing = await findRequestOr404(req.params.id);
    assertOwner(existing, req.user);
    if (existing.status !== RequestStatus.DRAFT) {
      throw new HttpError(409, "Hanya draft yang bisa dihapus");
    }
    await prisma.request.delete({ where: { id: existing.id } });
    logActivity({
      actorId: req.user!.id,
      action: "DELETE_DRAFT",
      entity: "Request",
      entityId: existing.id,
      detail: existing.number,
      ip: req.ip,
    });
    res.json({ message: "Draft dihapus" });
  })
);

requestsRouter.post(
  "/:id/attachments",
  upload.array("files", 10),
  asyncHandler<AuthedRequest>(async (req, res) => {
    const existing = await findRequestOr404(req.params.id);
    assertOwner(existing, req.user);

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) throw new HttpError(400, "Tidak ada file yang diunggah");

    if (!EDITABLE_STATUSES.includes(existing.status)) {
      throw new HttpError(409, "Lampiran pendukung hanya bisa diunggah saat draft/revisi");
    }

    const bucket = getBucketForKind(AttachmentKind.PENDUKUNG);
    const created = [];

    for (const file of files) {
      const key = buildObjectKey({
        kind: AttachmentKind.PENDUKUNG,
        requestNumber: existing.number,
        originalFilename: file.originalname,
      });
      await uploadToR2({
        bucket,
        key,
        body: file.buffer,
        contentType: file.mimetype,
      });
      created.push(
        await prisma.attachment.create({
          data: {
            kind: AttachmentKind.PENDUKUNG,
            requestId: existing.id,
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

    res.status(201).json({ data: created.map((file) => ({ id: file.id, name: file.originalFilename })) });
  })
);

function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

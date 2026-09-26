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
import { resolveManagerForBusinessRole } from "../lib/manager";
import { resolveDisbursementOfficer, validateDestinationCategory, type Destination } from "../lib/routing";
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
import { AuthedRequest, requireAuth, requirePasswordChanged, requireOnboardingComplete } from "../middleware/auth";
import { HttpError, asyncHandler } from "../middleware/errorHandler";
import { upload } from "../middleware/upload";

export const requestsRouter = Router();

requestsRouter.use(requireAuth, requirePasswordChanged, requireOnboardingComplete);

// ── Skema input ─────────────────────────────────────────────────────────────

const itemSchema = z.object({
  name: z.string().trim(),
  spec: z.string().trim().optional().nullable(),
  quantity: z.coerce.number().min(0, "Jumlah tidak boleh negatif"),
  unit: z.string().trim().default("pcs"),
  unitPrice: z.coerce.number().min(0, "Harga tidak boleh negatif"),
  note: z.string().trim().optional().nullable(),
});

export const requestBodySchema = z.object({
  type: z.nativeEnum(RequestType).default(RequestType.DANA),
  track: z.nativeEnum(ApproverTrack),
  destination: z.enum(["HO", "OUTLET"]).optional(),
  approverId: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  title: z.string().trim(),
  purpose: z.string().trim(),
  neededDate: z.coerce.date().optional().nullable(),
  bankName: z.string().trim().optional().nullable(),
  bankAccountNumber: z.string().trim().optional().nullable(),
  bankAccountHolder: z.string().trim().optional().nullable(),
  items: z.array(itemSchema),
  submit: z.boolean().default(false),
}).superRefine((body, ctx) => {
  if (!body.submit) return;
  if (body.title.length < 3) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["title"], message: "Judul minimal 3 karakter" });
  if (body.purpose.length < 5) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["purpose"], message: "Keperluan minimal 5 karakter" });
  if (!body.categoryId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["categoryId"], message: "Kategori tujuan wajib dipilih" });
  if (body.items.length === 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["items"], message: "Minimal satu item pengajuan" });
  body.items.forEach((item, index) => {
    if (!item.name) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["items", index, "name"], message: `Nama item ${index + 1} wajib diisi` });
    if (item.quantity <= 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["items", index, "quantity"], message: `Jumlah item ${index + 1} harus lebih dari 0` });
    if (!item.unit) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["items", index, "unit"], message: `Satuan item ${index + 1} wajib diisi` });
  });
});

const listQuerySchema = z.object({
  status: z.string().optional(),
  track: z.nativeEnum(ApproverTrack).optional(),
  type: z.nativeEnum(RequestType).optional(),
  requesterId: z.string().optional(),
  approverId: z.string().optional(),
  managerId: z.string().optional(),
  /** requester = pengajuan yang saya buat; approver/manager = antrian saya */
  as: z.enum(["requester", "approver", "manager"]).optional(),
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

async function destinationFor(categoryId: string | null | undefined, preferred?: Destination, required = true): Promise<Destination> {
  if (!categoryId) {
    if (required) throw new HttpError(400, "Kategori tujuan wajib dipilih");
    return preferred ?? "HO";
  }
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  const destination: Destination = preferred ?? (category?.kind === "OUTLET" ? "OUTLET" : "HO");
  await validateDestinationCategory(destination, categoryId);
  return destination;
}

export function skipsManagerApproval(
  track: ApproverTrack,
  categoryCode?: string | null,
  requesterId?: string,
  managerId?: string
): boolean {
  return (
    track === ApproverTrack.DIREKTUR ||
    categoryCode === "OPEN" ||
    Boolean(requesterId && managerId && requesterId === managerId)
  );
}

/** Sekretariat dan Opening Outlet langsung ke petugas; pengajuan lain melalui manager. */
async function resolveSubmitAssignment(params: {
  track: ApproverTrack;
  destination: Destination;
  requesterId: string;
  categoryId?: string | null;
}) {
  const [category, officer] = await Promise.all([
    params.categoryId
      ? prisma.category.findUnique({ where: { id: params.categoryId }, select: { code: true } })
      : null,
    resolveDisbursementOfficer(params.track, params.destination),
  ]);

  if (skipsManagerApproval(params.track, category?.code)) {
    const isSecretariat = params.track === ApproverTrack.DIREKTUR;
    return {
      managerId: null,
      disbursementOfficerId: officer.id,
      status: RequestStatus.MENUNGGU_APPROVAL,
      notifyUserId: officer.id,
      submitNote: isSecretariat
        ? "Pengajuan dikirim langsung ke Sekretariat tanpa approval manager"
        : "Pengajuan Opening Outlet dikirim langsung ke Finance tanpa approval manager",
      notifyTitle: isSecretariat
        ? "Pengajuan baru menunggu approval Sekretariat"
        : "Pengajuan Opening Outlet menunggu approval Finance",
    };
  }

  const requester = await prisma.user.findUnique({
    where: { id: params.requesterId },
    select: { businessRole: true, homeOutletId: true },
  });
  const manager = await resolveManagerForBusinessRole(requester?.businessRole, requester?.homeOutletId);
  if (skipsManagerApproval(params.track, category?.code, params.requesterId, manager.id)) {
    return {
      managerId: null,
      disbursementOfficerId: officer.id,
      status: RequestStatus.MENUNGGU_APPROVAL,
      notifyUserId: officer.id,
      submitNote: "Pengajuan manager dikirim langsung ke Finance tanpa self approval",
      notifyTitle: "Pengajuan manager menunggu approval Finance",
    };
  }
  return {
    managerId: manager.id,
    disbursementOfficerId: officer.id,
    status: RequestStatus.MENUNGGU_MANAGER,
    notifyUserId: manager.id,
    submitNote: "Pengajuan dikirim ke manager departemen",
    notifyTitle: "Pengajuan baru menunggu approval manager",
  };
}

async function assertReimbursementProof(requestId: string, type: RequestType): Promise<void> {
  if (type !== RequestType.REIMBURSEMENT) return;
  const proofCount = await prisma.attachment.count({
    where: { requestId, kind: AttachmentKind.PENDUKUNG },
  });
  if (proofCount === 0) {
    throw new HttpError(400, "Bukti pembayaran wajib diunggah untuk pengajuan reimbursement");
  }
}

async function findRequestOr404(id: string) {
  const request = await prisma.request.findUnique({
    where: { id },
    include: requestDetailInclude,
  });
  if (!request) throw new HttpError(404, "Pengajuan tidak ditemukan");
  return request;
}

function assertCanView(
  request: { requesterId: string; approverId: string; managerId: string | null; disbursementOfficerId: string | null },
  user: AuthedRequest["user"]
) {
  if (!user) throw new HttpError(401, "Unauthorized");
  if (user.role === UserRole.ADMIN) return;
  if (
    request.requesterId === user.id ||
    request.approverId === user.id ||
    request.disbursementOfficerId === user.id ||
    request.managerId === user.id
  ) {
    return;
  }
  throw new HttpError(403, "Anda tidak memiliki akses ke pengajuan ini");
}

function assertOwner(request: { requesterId: string }, user: AuthedRequest["user"]) {
  if (request.requesterId !== user!.id) {
    throw new HttpError(403, "Hanya pemohon yang bisa mengubah pengajuan ini");
  }
}

function applyListScope(
  where: Prisma.RequestWhereInput,
  user: AuthedRequest["user"],
  query: z.infer<typeof listQuerySchema>
) {
  if (query.as === "manager" && user!.canApprove) {
    where.managerId = user!.id;
  } else if (query.as === "approver" && user!.canDisburse) {
    where.OR = [{ disbursementOfficerId: user!.id }, { approverId: user!.id }];
  } else if (query.as === "requester" || (user!.role === UserRole.PEMOHON && !user!.canApprove && !user!.canDisburse)) {
    where.requesterId = user!.id;
  } else if (user!.role === UserRole.MANAGER) {
    where.managerId = user!.id;
  } else if (user!.role === UserRole.APPROVER) {
    // Approver dual-role (mis. Sekretariat + manager GA): antrian approval + antrian manager.
    where.AND = [...(where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : []), {
      OR: [{ approverId: user!.id }, { managerId: user!.id }, { disbursementOfficerId: user!.id }],
    }];
  } else if (user!.role === UserRole.PEMOHON) {
    where.OR = [{ requesterId: user!.id }, { managerId: user!.id }];
  } else if (user!.role === UserRole.ADMIN) {
    if (query.requesterId) where.requesterId = query.requesterId;
    if (query.approverId) where.approverId = query.approverId;
    if (query.managerId) where.managerId = query.managerId;
  } else {
    where.requesterId = user!.id;
  }
}

function applySearchFilter(where: Prisma.RequestWhereInput, q?: string) {
  if (!q) return;
  const searchOr: Prisma.RequestWhereInput[] = [
    { number: { contains: q } },
    { title: { contains: q } },
    { purpose: { contains: q } },
    { requester: { name: { contains: q } } },
    { requester: { nip: { contains: q } } },
  ];
  where.AND = [
    ...(where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : []),
    { OR: searchOr },
  ];
}

const EDITABLE_STATUSES: RequestStatus[] = [RequestStatus.DRAFT, RequestStatus.REVISI];

// ── Endpoint ────────────────────────────────────────────────────────────────

requestsRouter.get(
  "/",
  asyncHandler<AuthedRequest>(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const user = req.user!;

    const where: Prisma.RequestWhereInput = {};
    applyListScope(where, user, query);

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

    applySearchFilter(where, query.q);

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
    const query = listQuerySchema.parse({ ...req.query, page: 1, pageSize: 100 });
    const user = req.user!;
    const where: Prisma.RequestWhereInput = {};
    applyListScope(where, user, query);

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
    applySearchFilter(where, query.q);

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
      "Manager",
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
          escape(s.manager?.name ?? ""),
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

    const { prepared, total } = computeItems(body.items);
    const submitting = body.submit;
    if (submitting && body.type === RequestType.REIMBURSEMENT) {
      throw new HttpError(400, "Simpan draft dan unggah bukti pembayaran sebelum mengirim reimbursement");
    }
    const destination = await destinationFor(body.categoryId, body.destination, submitting);
    const officer = await resolveDisbursementOfficer(body.track, destination);

    let managerId: string | null = null;
    let submitStatus: RequestStatus = RequestStatus.MENUNGGU_MANAGER;
    let notifyUserId: string | null = null;
    let submitNote = "Pengajuan dikirim ke approver";
    let notifyTitle = "Pengajuan baru menunggu approval";

    if (submitting) {
      const assignment = await resolveSubmitAssignment({
        track: body.track,
        destination,
        requesterId: user.id,
        categoryId: body.categoryId,
      });
      managerId = assignment.managerId;
      submitStatus = assignment.status;
      notifyUserId = assignment.notifyUserId;
      submitNote = assignment.submitNote;
      notifyTitle = assignment.notifyTitle;
    } else {
      try {
        managerId = (await resolveManagerForBusinessRole(user.businessRole, user.homeOutletId, user.id)).id;
      } catch { managerId = null; }
    }

    const created = await prisma.$transaction(async (tx) => {
      const number = await generateRequestNumber(tx);

      return tx.request.create({
        data: {
          number,
          requesterId: user.id,
          managerId,
          approverId: officer.id,
          disbursementOfficerId: officer.id,
          destination,
          businessRoleAtSubmit: user.businessRole,
          workflowVersion: 2,
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
          status: submitting ? submitStatus : RequestStatus.DRAFT,
          submittedAt: submitting ? new Date() : null,
          items: { create: prepared },
          logs: {
            create: {
              actorId: user.id,
              action: submitting ? "SUBMIT" : "CREATE_DRAFT",
              toStatus: submitting ? submitStatus : RequestStatus.DRAFT,
              note: submitting ? submitNote : "Pengajuan disimpan sebagai draft",
            },
          },
        },
        include: requestDetailInclude,
      });
    });

    if (submitting && notifyUserId) {
      notify({
        userId: notifyUserId,
        title: notifyTitle,
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

    const { prepared, total } = computeItems(body.items);
    const submitting = body.submit;
    if (submitting) await assertReimbursementProof(existing.id, body.type);
    const destination = await destinationFor(body.categoryId, body.destination, submitting);
    const officer = await resolveDisbursementOfficer(body.track, destination);

    let managerId: string | null = null;
    let submitStatus: RequestStatus = RequestStatus.MENUNGGU_MANAGER;
    let notifyUserId: string | null = null;
    let submitNote = "Pengajuan dikirim ulang setelah revisi";
    let notifyTitle = "Pengajuan diperbarui & dikirim ulang";

    if (submitting) {
      const assignment = await resolveSubmitAssignment({
        track: body.track,
        destination,
        requesterId: req.user!.id,
        categoryId: body.categoryId,
      });
      managerId = assignment.managerId;
      submitStatus = assignment.status;
      notifyUserId = assignment.notifyUserId;
      submitNote = assignment.submitNote;
      notifyTitle =
        assignment.status === RequestStatus.MENUNGGU_MANAGER
          ? "Pengajuan dikirim ulang ke manager"
          : "Pengajuan diperbarui & dikirim ulang";
    } else {
      try {
        managerId = (await resolveManagerForBusinessRole(req.user!.businessRole, req.user!.homeOutletId, req.user!.id)).id;
      } catch { managerId = existing.managerId; }
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.requestItem.deleteMany({ where: { requestId: existing.id } });
      return tx.request.update({
        where: { id: existing.id },
        data: {
          managerId,
          approverId: officer.id,
          disbursementOfficerId: officer.id,
          destination,
          businessRoleAtSubmit: req.user!.businessRole,
          workflowVersion: 2,
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
          status: submitting ? submitStatus : existing.status,
          submittedAt: submitting ? new Date() : existing.submittedAt,
          decidedAt: submitting ? null : existing.decidedAt,
          decisionNote: submitting ? null : existing.decisionNote,
          approvedAmount: submitting ? null : existing.approvedAmount,
          items: { create: prepared },
          logs: {
            create: {
              actorId: req.user!.id,
              action: submitting ? "RESUBMIT" : "UPDATE",
              fromStatus: existing.status,
              toStatus: submitting ? submitStatus : existing.status,
              note: submitting ? submitNote : "Pengajuan diperbarui",
            },
          },
        },
        include: requestDetailInclude,
      });
    });

    if (submitting && notifyUserId) {
      notify({
        userId: notifyUserId,
        title: notifyTitle,
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
    requestBodySchema.parse({
      type: existing.type,
      track: existing.track,
      destination: existing.destination,
      categoryId: existing.categoryId,
      title: existing.title,
      purpose: existing.purpose,
      neededDate: existing.neededDate,
      bankName: existing.bankName,
      bankAccountNumber: existing.bankAccountNumber,
      bankAccountHolder: existing.bankAccountHolder,
      items: existing.items.map((item) => ({
        name: item.name,
        spec: item.spec,
        quantity: Number(item.quantity),
        unit: item.unit,
        unitPrice: Number(item.unitPrice),
        note: item.note,
      })),
      submit: true,
    });
    await assertReimbursementProof(existing.id, existing.type);

    const assignment = await resolveSubmitAssignment({
      track: existing.track,
      destination: await destinationFor(existing.categoryId, (existing.destination as Destination | null) ?? undefined),
      requesterId: req.user!.id,
      categoryId: existing.categoryId,
    });

    const updated = await prisma.request.update({
      where: { id: existing.id },
      data: {
        managerId: assignment.managerId,
        disbursementOfficerId: assignment.disbursementOfficerId,
        approverId: assignment.disbursementOfficerId,
        destination: existing.destination ?? (existing.category?.kind === "OUTLET" ? "OUTLET" : "HO"),
        businessRoleAtSubmit: req.user!.businessRole,
        workflowVersion: 2,
        status: assignment.status,
        submittedAt: new Date(),
        decidedAt: null,
        decisionNote: null,
        approvedAmount: null,
        logs: {
          create: {
            actorId: req.user!.id,
            action: "SUBMIT",
            fromStatus: existing.status,
            toStatus: assignment.status,
            note: assignment.submitNote,
          },
        },
      },
      include: requestDetailInclude,
    });

    notify({
      userId: assignment.notifyUserId,
      title: assignment.notifyTitle,
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
      RequestStatus.MENUNGGU_MANAGER,
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

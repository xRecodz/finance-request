import { Router } from "express";
import { RequestStatus, UserRole } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  PENDING_APPROVAL_STATUSES,
  PENDING_MANAGER_STATUSES,
  STATUS_LABEL,
} from "../lib/requestView";
import { prisma } from "../lib/prisma";
import { toNumber } from "../lib/serialize";
import {
  AuthedRequest,
  requireAuth,
  requirePasswordChanged,
} from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth, requirePasswordChanged);

const rangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  as: z.enum(["requester", "approver", "manager"]).optional(),
});

function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function scopeWhere(
  user: AuthedRequest["user"],
  from?: Date,
  to?: Date,
  as?: "requester" | "approver" | "manager"
): Prisma.RequestWhereInput {
  const where: Prisma.RequestWhereInput = {};
  if (as === "manager" && user!.canApprove) {
    where.managerId = user!.id;
  } else if (as === "approver" && user!.canDisburse) {
    where.OR = [{ disbursementOfficerId: user!.id }, { approverId: user!.id }];
  } else if (as === "requester" || (user!.role === UserRole.PEMOHON && !user!.canApprove)) {
    where.requesterId = user!.id;
  } else if (user!.role === UserRole.MANAGER) {
    where.managerId = user!.id;
  } else if (user!.role === UserRole.APPROVER) {
    where.OR = [{ approverId: user!.id }, { managerId: user!.id }, { disbursementOfficerId: user!.id }];
  } else if (user!.role === UserRole.PEMOHON) {
    where.OR = [{ requesterId: user!.id }, { managerId: user!.id }];
  } else if (user!.role === UserRole.IT) {
    where.requesterId = user!.id;
  }

  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: endOfDay(to) } : {}),
    };
  }
  return where;
}

dashboardRouter.get(
  "/summary",
  asyncHandler<AuthedRequest>(async (req, res) => {
    const { from, to, as } = rangeSchema.parse(req.query);
    const user = req.user!;
    const where = scopeWhere(user, from, to, as);
    const asRequester = as === "requester" || (user.role === UserRole.PEMOHON && !user.canApprove);
    const pendingStatuses =
      as === "manager" || (user.role === UserRole.MANAGER && as !== "approver")
        ? PENDING_MANAGER_STATUSES
        : [...PENDING_MANAGER_STATUSES, ...PENDING_APPROVAL_STATUSES];

    const [byStatus, amountAgg, pendingCount, historyPeers] = await Promise.all([
      prisma.request.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
        _sum: { totalAmount: true, approvedAmount: true },
      }),
      prisma.disbursement.aggregate({
        where: {
          status: "VALID",
          request: { is: { ...where, createdAt: undefined } },
          ...(from || to ? { disbursedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: endOfDay(to) } : {}) } } : {}),
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.request.count({
        where: {
          ...where,
          status: { in: pendingStatuses },
        },
      }),
      !asRequester &&
      (user.canApprove || user.canDisburse || user.role === UserRole.ADMIN)
        ? prisma.request.groupBy({
            by: ["requesterId"],
            where: {
              ...where,
              status: { not: RequestStatus.DRAFT },
            },
            _count: { _all: true },
            _sum: { totalAmount: true },
            orderBy: { _count: { requesterId: "desc" } },
            take: 12,
          })
        : prisma.request.groupBy({
            by: ["approverId"],
            where: {
              requesterId: user.id,
              status: { not: RequestStatus.DRAFT },
              ...(from || to
                ? {
                    createdAt: {
                      ...(from ? { gte: from } : {}),
                      ...(to ? { lte: endOfDay(to) } : {}),
                    },
                  }
                : {}),
            },
            _count: { _all: true },
            _sum: { totalAmount: true },
            orderBy: { _count: { approverId: "desc" } },
            take: 12,
          }),
    ]);

    const peerIds = historyPeers.map((row) =>
      "requesterId" in row ? (row as { requesterId: string }).requesterId : (row as { approverId: string }).approverId
    );

    const peers = peerIds.length
      ? await prisma.user.findMany({
          where: { id: { in: peerIds } },
          select: { id: true, nip: true, name: true, department: true, position: true },
        })
      : [];
    const peerMap = new Map(peers.map((p) => [p.id, p]));

    const statusChart = byStatus.map((row) => ({
      status: row.status,
      label: STATUS_LABEL[row.status],
      count: row._count._all,
      totalAmount: toNumber(row._sum.totalAmount ?? 0),
      approvedAmount: toNumber(row._sum.approvedAmount ?? 0),
    }));

    const recentForChart = await prisma.request.findMany({
      where,
      select: {
        createdAt: true,
        totalAmount: true,
        approvedAmount: true,
      },
      orderBy: { createdAt: "asc" },
      take: 5000,
    });

    const paymentsForChart = await prisma.disbursement.findMany({
      where: {
        status: "VALID",
        request: { is: { ...where, createdAt: undefined } },
        ...(from || to ? { disbursedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: endOfDay(to) } : {}) } } : {}),
      },
      select: { disbursedAt: true, amount: true },
      orderBy: { disbursedAt: "asc" },
      take: 5000,
    });

    const monthMap = new Map<string, { count: number; totalAmount: number; approvedAmount: number }>();
    for (const row of recentForChart) {
      const month = `${row.createdAt.getFullYear()}-${String(row.createdAt.getMonth() + 1).padStart(2, "0")}`;
      const bucket = monthMap.get(month) ?? { count: 0, totalAmount: 0, approvedAmount: 0 };
      bucket.count += 1;
      bucket.totalAmount += toNumber(row.totalAmount);
      monthMap.set(month, bucket);
    }
    for (const payment of paymentsForChart) {
      const month = `${payment.disbursedAt.getFullYear()}-${String(payment.disbursedAt.getMonth() + 1).padStart(2, "0")}`;
      const bucket = monthMap.get(month) ?? { count: 0, totalAmount: 0, approvedAmount: 0 };
      bucket.approvedAmount += toNumber(payment.amount);
      monthMap.set(month, bucket);
    }
    const monthlyChart = [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, value]) => ({ month, ...value }));

    const disbursedNominal = toNumber(amountAgg._sum.amount ?? 0);

    res.json({
      data: {
        cards: {
          totalRequests: byStatus.reduce((s, r) => s + r._count._all, 0),
          pending: pendingCount,
          disbursedCount: amountAgg._count._all,
          disbursedNominal,
        },
        statusChart,
        monthlyChart,
        history: historyPeers.map((row) => {
          const id =
            "requesterId" in row
              ? (row as { requesterId: string }).requesterId
              : (row as { approverId: string }).approverId;
          return {
            user: peerMap.get(id) ?? { id, nip: "-", name: "Tidak diketahui" },
            count: row._count._all,
            totalAmount: toNumber(row._sum.totalAmount ?? 0),
          };
        }),
      },
    });
  })
);

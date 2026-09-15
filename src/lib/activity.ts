import { prisma } from "./prisma";

/** Audit trail. Sengaja fire-and-forget agar kegagalan log tidak membatalkan aksi user. */
export function logActivity(params: {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  detail?: string | null;
  ip?: string | null;
}): void {
  prisma.activityLog
    .create({
      data: {
        actorId: params.actorId ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        detail: params.detail ?? null,
        ip: params.ip ?? null,
      },
    })
    .catch((error) => console.error("Gagal menulis activity log:", error));
}

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type AuditInput = {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  requestId?: string | null;
};

export async function writeAuditLog(input: AuditInput) {
  return prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      details: input.details,
      ipAddress: input.ipAddress,
      requestId: input.requestId,
    },
  });
}

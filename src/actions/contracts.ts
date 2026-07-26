"use server";

import { revalidatePath } from "next/cache";
import { ContractStatus, UserRole } from "@/generated/prisma/enums";
import { AppError, errorMessages } from "@/lib/api-error";
import { getCurrentUser } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

const manualStatuses = new Set<ContractStatus>([
  ContractStatus.OPENED,
  ContractStatus.COMPLETED,
  ContractStatus.PDF_EXPORTED,
  ContractStatus.SENT,
  ContractStatus.CANCELLED,
  ContractStatus.ARCHIVED,
]);

export async function updateContractStatusAction(formData: FormData) {
  const user = await getCurrentUser();
  const id = formData.get("id")?.toString();
  const status = formData.get("status")?.toString() as ContractStatus;
  if (!id || !manualStatuses.has(status)) {
    throw new AppError("VALIDATION_ERROR", errorMessages.VALIDATION_ERROR);
  }
  const contract = await prisma.generatedContract.findUnique({
    where: { id },
    include: { createdBy: { select: { managerId: true } } },
  });
  const allowed =
    contract &&
    (user.role === UserRole.ADMIN ||
      contract.createdById === user.id ||
      (user.role === UserRole.SUPERVISOR && contract.createdBy.managerId === user.id));
  if (!allowed) throw new AppError("FORBIDDEN", errorMessages.FORBIDDEN, 403);
  await prisma.$transaction([
    prisma.generatedContract.update({
      where: { id },
      data: {
        status,
        completedAt: status === ContractStatus.COMPLETED ? new Date() : contract.completedAt,
        archivedAt: status === ContractStatus.ARCHIVED ? new Date() : contract.archivedAt,
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CONTRACT_STATUS_CHANGED",
        entityType: "GeneratedContract",
        entityId: id,
        requestId: contract.requestId,
        details: { from: contract.status, to: status },
      },
    }),
  ]);
  revalidatePath("/contracts");
  revalidatePath("/dashboard");
}

import { NextResponse } from "next/server";
import { ContractStatus, UserRole } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  const { id } = await context.params;
  const contract = await prisma.generatedContract.findUnique({
    where: { id },
    include: { createdBy: { select: { managerId: true } } },
  });
  if (!contract?.copiedGoogleFileUrl) {
    return NextResponse.redirect(new URL("/contracts?error=not-openable", request.url));
  }
  const allowed =
    user.role === UserRole.ADMIN ||
    contract.createdById === user.id ||
    (user.role === UserRole.SUPERVISOR && contract.createdBy.managerId === user.id);
  if (!allowed) return new NextResponse("Forbidden", { status: 403 });

  await prisma.$transaction([
    prisma.generatedContract.update({
      where: { id: contract.id },
      data: {
        openedAt: contract.openedAt ?? new Date(),
        status:
          contract.status === ContractStatus.CREATED
            ? ContractStatus.OPENED
            : contract.status,
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CONTRACT_LINK_OPENED",
        entityType: "GeneratedContract",
        entityId: contract.id,
        requestId: contract.requestId,
        details: { referenceNumber: contract.referenceNumber },
      },
    }),
  ]);
  return NextResponse.redirect(contract.copiedGoogleFileUrl);
}

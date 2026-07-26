import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { AppError, userMessage } from "@/lib/api-error";
import { requireRole } from "@/lib/auth/permissions";
import { generateContractCopy } from "@/lib/contracts/copy-orchestrator";
import { getGoogleDriveService } from "@/lib/drive";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n-server";

export async function POST(request: Request) {
  const locale = await getLocale();
  try {
    const user = await requireRole([UserRole.ADMIN]);
    const { templateId } = (await request.json()) as { templateId?: string };
    if (!templateId || !user.googleFolderId) {
      throw new AppError("VALIDATION_ERROR", "القالب أو مجلد المسؤول غير مضبوط.", 422);
    }
    const template = await prisma.contractTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new AppError("TEMPLATE_NOT_FOUND", "القالب غير موجود.", 404);
    const file = await generateContractCopy(await getGoogleDriveService(), {
      templateFileId: template.googleFileId,
      employeeFolderId: user.googleFolderId,
      fileName: `TEST - ${template.templateCode} - ${new Date().toISOString().slice(0, 19)}`,
    });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "TEMPLATE_TEST_COPY_CREATED",
        entityType: "ContractTemplate",
        entityId: template.id,
        details: { copiedGoogleFileId: file.id },
      },
    });
    return NextResponse.json({ ok: true, url: file.webViewLink });
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json({ ok: false, message: userMessage(error, locale) }, { status });
  }
}

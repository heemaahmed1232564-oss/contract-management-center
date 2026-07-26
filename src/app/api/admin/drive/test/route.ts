import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { AppError, userMessage } from "@/lib/api-error";
import { requireRole } from "@/lib/auth/permissions";
import { getGoogleDriveService } from "@/lib/drive";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    await requireRole([UserRole.ADMIN, UserRole.SUPERVISOR]);
    const body = (await request.json()) as { type?: string; id?: string; templateId?: string };
    if (!body.id) throw new AppError("VALIDATION_ERROR", "أدخل File ID أو Folder ID أولًا.");
    const drive = await getGoogleDriveService();
    const result =
      body.type === "folder"
        ? await drive.validateFolderAccess(body.id)
        : await drive.validateTemplateAccess(drive.extractGoogleFileIdFromUrl(body.id));
    if (body.templateId && body.type !== "folder") {
      await prisma.contractTemplate.update({
        where: { id: body.templateId },
        data: {
          healthStatus: result.ok ? "HEALTHY" : "INACCESSIBLE",
          healthError: result.ok ? null : result.message,
          lastHealthCheckedAt: new Date(),
        },
      });
    }
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json({ ok: false, message: userMessage(error) }, { status });
  }
}

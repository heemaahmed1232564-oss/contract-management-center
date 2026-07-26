import { NextResponse } from "next/server";
import { AppError, userMessage } from "@/lib/api-error";
import { getCurrentUser } from "@/lib/auth/permissions";
import { certifyContract } from "@/lib/contracts/certification-service";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    const { id } = await context.params;
    const contract = await certifyContract(id, { id: user.id, role: user.role });
    return NextResponse.json({
      ok: true,
      message: "تم توثيق العقد وإنشاء نسخة PDF داخل مجلد الموظف.",
      url: contract.certifiedPdfFileUrl,
    });
  } catch (error) {
    const appError = error instanceof AppError ? error : null;
    logger.error({ err: error, code: appError?.code }, "Contract certification failed");
    return NextResponse.json(
      { ok: false, message: userMessage(error), code: appError?.code ?? "INTERNAL_ERROR" },
      { status: appError?.status ?? 500 },
    );
  }
}

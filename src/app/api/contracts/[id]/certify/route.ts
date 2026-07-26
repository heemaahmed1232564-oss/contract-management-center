import { NextResponse } from "next/server";
import { AppError, userMessage } from "@/lib/api-error";
import { getCurrentUser } from "@/lib/auth/permissions";
import { certifyContract } from "@/lib/contracts/certification-service";
import { logger } from "@/lib/logger";
import { tx } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export const runtime = "nodejs";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const locale = await getLocale();
  try {
    const user = await getCurrentUser();
    const { id } = await context.params;
    const contract = await certifyContract(id, { id: user.id, role: user.role });
    return NextResponse.json({
      ok: true,
      message: tx(locale, "تم توثيق العقد وإنشاء نسخة PDF داخل مجلد الموظف.", "The contract was certified and the PDF was saved in the employee folder."),
      url: contract.certifiedPdfFileUrl,
    });
  } catch (error) {
    const appError = error instanceof AppError ? error : null;
    logger.error({ err: error, code: appError?.code }, "Contract certification failed");
    return NextResponse.json(
      { ok: false, message: userMessage(error, locale), code: appError?.code ?? "INTERNAL_ERROR" },
      { status: appError?.status ?? 500 },
    );
  }
}

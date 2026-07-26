import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { AppError, userMessage } from "@/lib/api-error";
import { getCurrentUser } from "@/lib/auth/permissions";
import { createGeneratedContract } from "@/lib/contracts/generation-service";
import { logger } from "@/lib/logger";
import { generateContractSchema } from "@/lib/validation/contracts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const input = generateContractSchema.parse(await request.json());
    const requestHeaders = await headers();
    const ipAddress =
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      requestHeaders.get("x-real-ip");
    const result = await createGeneratedContract(input, {
      userId: user.id,
      userName: user.name,
      employeeFolderId: user.googleFolderId,
      ipAddress,
    });
    const contract = result.contract;
    if (result.idempotent && contract.status === "CREATING") {
      throw new AppError("DUPLICATE_IN_PROGRESS", "يوجد طلب مماثل قيد التنفيذ.", 409);
    }
    if (result.idempotent && contract.status === "FAILED") {
      throw new AppError(
        contract.errorCode ?? "COPY_FAILED",
        contract.errorMessage ?? "تعذر إنشاء النسخة في المحاولة السابقة.",
        422,
      );
    }
    return NextResponse.json({
      ok: true,
      idempotent: result.idempotent,
      contract: {
        id: contract.id,
        referenceNumber: contract.referenceNumber,
        originalTemplateName: contract.originalTemplateName,
        originalTemplateVersion: contract.originalTemplateVersion,
        copiedFileName: contract.copiedFileName,
        copiedGoogleFileUrl: contract.copiedGoogleFileUrl,
        agencyName: contract.agency.nameAr || contract.agency.name,
        packageName: contract.package.name,
        employeeName: contract.createdBy.name,
        status: contract.status,
        createdAt: contract.createdAt,
      },
    });
  } catch (error) {
    const appError = error instanceof AppError ? error : null;
    logger.error(
      {
        code: appError?.code,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Contract generation request failed",
    );
    return NextResponse.json(
      {
        ok: false,
        code: appError?.code ?? "INTERNAL_ERROR",
        message: userMessage(error),
        details: appError?.code === "DUPLICATE_WARNING" ? appError.details : undefined,
      },
      { status: appError?.status ?? 500 },
    );
  }
}

import { randomUUID } from "node:crypto";
import { ContractStatus, Prisma } from "@/generated/prisma/client";
import { AppError, errorMessages } from "@/lib/api-error";
import { generateContractCopy } from "@/lib/contracts/copy-orchestrator";
import { buildContractFileName } from "@/lib/contracts/naming";
import { resolveTemplate, type TemplateCandidate } from "@/lib/contracts/template-resolver";
import { getGoogleDriveService } from "@/lib/drive";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import type { GenerateContractInput } from "@/lib/validation/contracts";

type GenerateContext = {
  userId: string;
  userName: string;
  employeeFolderId: string | null;
  ipAddress?: string | null;
};

function toCandidate(template: {
  id: string;
  agencyId: string;
  packageId: string;
  contractType: string;
  duration: number | null;
  price: Prisma.Decimal | null;
  currency: string;
  offerCode: string | null;
  version: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  isActive: boolean;
}): TemplateCandidate {
  return { ...template, price: template.price ? Number(template.price) : null };
}

function safeGoogleError(error: unknown): Prisma.InputJsonValue {
  if (!error || typeof error !== "object") return { message: String(error) };
  const value = error as {
    message?: string;
    code?: string | number;
    response?: { status?: number; data?: { error?: { status?: string; errors?: unknown[] } } };
  };
  return {
    message: value.message ?? "Unknown Google Drive error",
    code: value.code ? String(value.code) : undefined,
    status: value.response?.status,
    googleStatus: value.response?.data?.error?.status,
  } as Prisma.InputJsonValue;
}

function ensureTemplateValidity(template: TemplateCandidate, now: Date) {
  if (!template.isActive) throw new AppError("TEMPLATE_INACTIVE", errorMessages.TEMPLATE_INACTIVE, 422);
  if (template.effectiveFrom > now || (template.effectiveTo && template.effectiveTo < now)) {
    throw new AppError("TEMPLATE_EXPIRED", errorMessages.TEMPLATE_EXPIRED, 422);
  }
}

async function markCopyAsCreated(contractId: string, fileId: string, url: string) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await prisma.generatedContract.update({
        where: { id: contractId },
        data: {
          status: ContractStatus.CREATED,
          copiedGoogleFileId: fileId,
          copiedGoogleFileUrl: url,
          errorCode: null,
          errorMessage: null,
        },
      });
    } catch (error) {
      lastError = error;
      logger.error({ error, contractId, fileId, attempt }, "Database update failed after Drive copy");
    }
  }
  throw new AppError(
    "DATABASE_AFTER_COPY_FAILED",
    errorMessages.DATABASE_AFTER_COPY_FAILED,
    500,
    safeGoogleError(lastError),
  );
}

export async function createGeneratedContract(
  input: GenerateContractInput,
  context: GenerateContext,
) {
  if (!context.employeeFolderId) {
    throw new AppError("EMPLOYEE_FOLDER_UNAVAILABLE", errorMessages.EMPLOYEE_FOLDER_UNAVAILABLE, 422);
  }

  const existing = await prisma.generatedContract.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    include: { agency: true, package: true, createdBy: true },
  });
  if (existing) return { contract: existing, idempotent: true };

  const now = new Date();
  const [agency, packageRecord, templateRecords] = await Promise.all([
    prisma.agency.findUnique({ where: { id: input.agencyId } }),
    prisma.package.findUnique({ where: { id: input.packageId } }),
    prisma.contractTemplate.findMany({
      where: input.templateId
        ? { id: input.templateId }
        : { agencyId: input.agencyId, packageId: input.packageId },
      include: { agency: true, package: true },
    }),
  ]);

  if (!agency?.isActive) throw new AppError("AGENCY_INACTIVE", errorMessages.AGENCY_INACTIVE, 422);
  if (!packageRecord?.isActive) throw new AppError("PACKAGE_INACTIVE", errorMessages.PACKAGE_INACTIVE, 422);

  const candidates = templateRecords.map(toCandidate);
  let selectedCandidate: TemplateCandidate;
  if (input.templateId) {
    const selected = candidates[0];
    if (!selected || selected.agencyId !== input.agencyId || selected.packageId !== input.packageId) {
      throw new AppError("TEMPLATE_NOT_FOUND", errorMessages.TEMPLATE_NOT_FOUND, 404);
    }
    ensureTemplateValidity(selected, now);
    const exactResolution = resolveTemplate([selected], {
      agencyId: input.agencyId,
      packageId: input.packageId,
      contractType: input.contractType,
      duration: input.duration,
      price: input.price,
      currency: input.currency,
      offerCode: input.offerCode,
      at: now,
    });
    if (exactResolution.kind !== "match") {
      throw new AppError("TEMPLATE_NOT_FOUND", errorMessages.TEMPLATE_NOT_FOUND, 404);
    }
    selectedCandidate = selected;
  } else {
    const resolution = resolveTemplate(candidates, {
      agencyId: input.agencyId,
      packageId: input.packageId,
      contractType: input.contractType,
      duration: input.duration,
      price: input.price,
      currency: input.currency,
      offerCode: input.offerCode,
      at: now,
    });
    if (resolution.kind === "none") {
      throw new AppError("TEMPLATE_NOT_FOUND", errorMessages.TEMPLATE_NOT_FOUND, 404);
    }
    if (resolution.kind === "ambiguous") {
      throw new AppError(
        "TEMPLATE_AMBIGUOUS",
        errorMessages.TEMPLATE_AMBIGUOUS,
        409,
        { templateIds: resolution.templates.map((item) => item.id) },
      );
    }
    selectedCandidate = resolution.template;
  }

  const selectedTemplate = templateRecords.find((item) => item.id === selectedCandidate.id);
  if (!selectedTemplate) throw new AppError("TEMPLATE_NOT_FOUND", errorMessages.TEMPLATE_NOT_FOUND, 404);

  const rateLimit = Number(process.env.CONTRACT_RATE_LIMIT_PER_MINUTE ?? 5);
  const oneMinuteAgo = new Date(Date.now() - 60_000);
  const recentAttempts = await prisma.generatedContract.count({
    where: { createdById: context.userId, createdAt: { gte: oneMinuteAgo } },
  });
  if (recentAttempts >= rateLimit) {
    throw new AppError("RATE_LIMITED", errorMessages.RATE_LIMITED, 429);
  }

  if (input.clientName && !input.allowDuplicate) {
    const duplicate = await prisma.generatedContract.findFirst({
      where: {
        agencyId: input.agencyId,
        packageId: input.packageId,
        clientName: { equals: input.clientName, mode: "insensitive" },
        createdAt: { gte: new Date(Date.now() - 15 * 60_000) },
        status: { notIn: [ContractStatus.FAILED, ContractStatus.CANCELLED] },
      },
      select: { referenceNumber: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    if (duplicate) {
      throw new AppError("DUPLICATE_WARNING", errorMessages.DUPLICATE_WARNING, 409, duplicate);
    }
  }

  const requestId = randomUUID();
  let reserved;
  try {
    reserved = await prisma.$transaction(async (tx) => {
    const setting = await tx.systemSetting.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    });
    const counter = await tx.referenceCounter.upsert({
      where: { year: now.getFullYear() },
      create: { year: now.getFullYear(), value: 1 },
      update: { value: { increment: 1 } },
    });
    const referenceNumber = `${setting.referencePrefix}-${now.getFullYear()}-${String(counter.value).padStart(6, "0")}`;
    const fileName = buildContractFileName(setting.namingPattern, {
      reference_number: referenceNumber,
      agency_code: agency.code,
      package_code: packageRecord.code,
      client_name: input.clientName,
      employee_name: context.userName,
      date: now.toISOString().slice(0, 10),
    });

    return tx.generatedContract.create({
      data: {
        referenceNumber,
        idempotencyKey: input.idempotencyKey,
        requestId,
        originalTemplateId: selectedTemplate.id,
        originalTemplateName: selectedTemplate.templateName,
        originalTemplateVersion: selectedTemplate.version,
        originalGoogleFileId: selectedTemplate.googleFileId,
        copiedFileName: fileName,
        agencyId: agency.id,
        packageId: packageRecord.id,
        contractType: selectedTemplate.contractType,
        duration: selectedTemplate.duration,
        price: selectedTemplate.price,
        currency: selectedTemplate.currency,
        offerCode: selectedTemplate.offerCode,
        clientName: input.clientName || null,
        clientPhone: input.clientPhone || null,
        clientEmail: input.clientEmail || null,
        notes: input.notes || null,
        createdById: context.userId,
        employeeFolderId: context.employeeFolderId!,
        status: ContractStatus.CREATING,
      },
    });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const collided = await prisma.generatedContract.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { agency: true, package: true, createdBy: true },
      });
      if (collided) return { contract: collided, idempotent: true };
    }
    throw error;
  }

  let copiedFileId: string | null = null;
  try {
    const copied = await generateContractCopy(await getGoogleDriveService(), {
      templateFileId: selectedTemplate.googleFileId,
      employeeFolderId: context.employeeFolderId,
      fileName: reserved.copiedFileName,
    });
    copiedFileId = copied.id;
    const contract = await markCopyAsCreated(reserved.id, copied.id, copied.webViewLink!);
    await prisma.auditLog.create({
      data: {
        userId: context.userId,
        action: "CONTRACT_CREATED",
        entityType: "GeneratedContract",
        entityId: contract.id,
        requestId,
        ipAddress: context.ipAddress,
        details: {
          referenceNumber: contract.referenceNumber,
          templateId: selectedTemplate.id,
          templateVersion: selectedTemplate.version,
          copiedGoogleFileId: copied.id,
        },
      },
    });
    return {
      contract: await prisma.generatedContract.findUniqueOrThrow({
        where: { id: contract.id },
        include: { agency: true, package: true, createdBy: true },
      }),
      idempotent: false,
    };
  } catch (error) {
    const appError =
      error instanceof AppError
        ? error
        : new AppError("COPY_FAILED", errorMessages.COPY_FAILED, 502, safeGoogleError(error));

    if (copiedFileId && appError.code === "DATABASE_AFTER_COPY_FAILED") {
      logger.fatal(
        { contractId: reserved.id, requestId, copiedFileId, error: appError },
        "Orphaned Drive copy requires reconciliation",
      );
      throw appError;
    }

    await prisma.$transaction([
      prisma.generatedContract.update({
        where: { id: reserved.id },
        data: {
          status: ContractStatus.FAILED,
          errorCode: appError.code,
          errorMessage: appError.message,
          googleErrorDetails: safeGoogleError(error),
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: context.userId,
          action: "CONTRACT_CREATION_FAILED",
          entityType: "GeneratedContract",
          entityId: reserved.id,
          requestId,
          ipAddress: context.ipAddress,
          details: { code: appError.code, message: appError.message, templateId: selectedTemplate.id },
        },
      }),
    ]);
    throw appError;
  }
}

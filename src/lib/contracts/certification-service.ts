import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { PDFDocument, rgb, type PDFImage, type PDFPage } from "pdf-lib";
import { ContractStatus, UserRole } from "@/generated/prisma/enums";
import { AppError, errorMessages } from "@/lib/api-error";
import { getGoogleDriveService } from "@/lib/drive";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

type CertificationAlignment = "RIGHT" | "CENTER" | "LEFT";
type CertificationLayout =
  | "SIGNATURE_RIGHT_STAMP_LEFT"
  | "STAMP_RIGHT_SIGNATURE_LEFT"
  | "SIGNATURE_ABOVE_STAMP"
  | "STAMP_ABOVE_SIGNATURE";

type CertificationSettings = {
  alignment: CertificationAlignment;
  layout: CertificationLayout;
  horizontalOffsetPt: number;
  itemGapPt: number;
  signatureWidthPt: number;
  stampWidthPt: number;
};

type PdfAnchor = {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

type ImagePlacement = {
  image: PDFImage;
  x: number;
  y: number;
  width: number;
  height: number;
};

function pdfJsAssetUrl(folder: "cmaps" | "standard_fonts" | "wasm") {
  const require = createRequire(import.meta.url);
  const packageRoot = dirname(require.resolve("pdfjs-dist/package.json"));
  return `${join(packageRoot, folder)}/`;
}

function imageSize(image: PDFImage, requestedWidth: number) {
  let width = requestedWidth;
  let height = width * (image.height / image.width);
  const maxHeight = 180;
  if (height > maxHeight) {
    const ratio = maxHeight / height;
    width *= ratio;
    height *= ratio;
  }
  return { width, height };
}

async function locateAnchor(pdfBytes: Buffer, anchorText: string): Promise<PdfAnchor> {
  try {
    const [pdfjs, pdfjsWorker] = await Promise.all([
      import("pdfjs-dist/legacy/build/pdf.mjs"),
      import("pdfjs-dist/legacy/build/pdf.worker.mjs"),
    ]);
    const runtime = globalThis as typeof globalThis & { pdfjsWorker?: typeof pdfjsWorker };
    runtime.pdfjsWorker = pdfjsWorker;
    const task = pdfjs.getDocument({
      data: new Uint8Array(pdfBytes),
      cMapUrl: pdfJsAssetUrl("cmaps"),
      cMapPacked: true,
      standardFontDataUrl: pdfJsAssetUrl("standard_fonts"),
      wasmUrl: pdfJsAssetUrl("wasm"),
    });
    const document = await task.promise;
    try {
      for (let pageIndex = 0; pageIndex < document.numPages; pageIndex += 1) {
        const page = await document.getPage(pageIndex + 1);
        const text = await page.getTextContent();
        for (const item of text.items) {
          if (!("str" in item) || !item.str.includes(anchorText)) continue;
          return {
            pageIndex,
            x: item.transform[4],
            y: item.transform[5],
            width: item.width,
            height: item.height,
          };
        }
      }
    } finally {
      await document.destroy();
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "PDF position analysis failed");
    throw new AppError(
      "PDF_POSITION_ANALYSIS_FAILED",
      "تعذر تشغيل محرك تحديد موضع الختم داخل PDF. حدّث التطبيق ثم أعد المحاولة.",
      500,
    );
  }
  throw new AppError(
    "CERTIFICATION_POSITION_NOT_FOUND",
    "تعذر تحديد موضع آخر جدول داخل نسخة PDF. تأكد أن القالب يحتوي على جدول ثم أعد المحاولة.",
    422,
  );
}

function horizontalStart(pageWidth: number, groupWidth: number, settings: CertificationSettings) {
  const inset = Math.max(12, settings.horizontalOffsetPt);
  if (settings.alignment === "LEFT") return inset;
  if (settings.alignment === "CENTER") return Math.max(12, (pageWidth - groupWidth) / 2);
  return Math.max(12, pageWidth - inset - groupWidth);
}

function scaleSizesToPage(
  pageWidth: number,
  signature: { width: number; height: number },
  stamp: { width: number; height: number },
  settings: CertificationSettings,
) {
  const horizontal = settings.layout === "SIGNATURE_RIGHT_STAMP_LEFT" || settings.layout === "STAMP_RIGHT_SIGNATURE_LEFT";
  const groupWidth = horizontal
    ? signature.width + settings.itemGapPt + stamp.width
    : Math.max(signature.width, stamp.width);
  const availableWidth = pageWidth - Math.max(24, settings.horizontalOffsetPt * 2);
  if (groupWidth <= availableWidth) return { signature, stamp };
  const ratio = availableWidth / groupWidth;
  return {
    signature: { width: signature.width * ratio, height: signature.height * ratio },
    stamp: { width: stamp.width * ratio, height: stamp.height * ratio },
  };
}

function createPlacements(
  page: PDFPage,
  topY: number,
  signatureImage: PDFImage,
  stampImage: PDFImage,
  settings: CertificationSettings,
) {
  const scaled = scaleSizesToPage(
    page.getWidth(),
    imageSize(signatureImage, settings.signatureWidthPt),
    imageSize(stampImage, settings.stampWidthPt),
    settings,
  );
  const signature = { image: signatureImage, ...scaled.signature };
  const stamp = { image: stampImage, ...scaled.stamp };
  const horizontal = settings.layout === "SIGNATURE_RIGHT_STAMP_LEFT" || settings.layout === "STAMP_RIGHT_SIGNATURE_LEFT";
  const groupWidth = horizontal
    ? signature.width + settings.itemGapPt + stamp.width
    : Math.max(signature.width, stamp.width);
  const groupHeight = horizontal
    ? Math.max(signature.height, stamp.height)
    : signature.height + settings.itemGapPt + stamp.height;
  const groupX = horizontalStart(page.getWidth(), groupWidth, settings);

  if (horizontal) {
    const left = settings.layout === "SIGNATURE_RIGHT_STAMP_LEFT" ? stamp : signature;
    const right = settings.layout === "SIGNATURE_RIGHT_STAMP_LEFT" ? signature : stamp;
    return {
      groupHeight,
      placements: [
        { ...left, x: groupX, y: topY - left.height },
        { ...right, x: groupX + left.width + settings.itemGapPt, y: topY - right.height },
      ] satisfies ImagePlacement[],
    };
  }

  const top = settings.layout === "SIGNATURE_ABOVE_STAMP" ? signature : stamp;
  const bottom = settings.layout === "SIGNATURE_ABOVE_STAMP" ? stamp : signature;
  const itemX = (width: number) => {
    if (settings.alignment === "RIGHT") return groupX + groupWidth - width;
    if (settings.alignment === "CENTER") return groupX + (groupWidth - width) / 2;
    return groupX;
  };
  return {
    groupHeight,
    placements: [
      { ...top, x: itemX(top.width), y: topY - top.height },
      { ...bottom, x: itemX(bottom.width), y: topY - top.height - settings.itemGapPt - bottom.height },
    ] satisfies ImagePlacement[],
  };
}

export async function addCertificationImages(
  pdfBytes: Buffer,
  anchorText: string,
  stampBytes: Uint8Array,
  signatureBytes: Uint8Array,
  settings: CertificationSettings,
) {
  const anchor = await locateAnchor(pdfBytes, anchorText);
  const pdf = await PDFDocument.load(pdfBytes);
  const pages = pdf.getPages();
  const anchorPage = pages[anchor.pageIndex];
  if (!anchorPage) throw new AppError("PDF_EMPTY", "ملف PDF لا يحتوي على صفحات.", 422);
  const stampImage = await pdf.embedPng(stampBytes);
  const signatureImage = await pdf.embedPng(signatureBytes);
  const markerPadding = 2;
  anchorPage.drawRectangle({
    x: Math.max(0, anchor.x - markerPadding),
    y: Math.max(0, anchor.y - markerPadding),
    width: Math.max(4, anchor.width + markerPadding * 2),
    height: Math.max(4, anchor.height + markerPadding * 2),
    color: rgb(1, 1, 1),
  });

  let targetPage = anchorPage;
  let topY = anchor.y - 3;
  let layout = createPlacements(targetPage, topY, signatureImage, stampImage, settings);
  let usedOverflowPage = false;
  if (topY - layout.groupHeight < 36) {
    targetPage = pdf.addPage([anchorPage.getWidth(), anchorPage.getHeight()]);
    topY = targetPage.getHeight() - 48;
    layout = createPlacements(targetPage, topY, signatureImage, stampImage, settings);
    usedOverflowPage = true;
  }
  for (const placement of layout.placements) targetPage.drawImage(placement.image, placement);

  return {
    pdf: Buffer.from(await pdf.save()),
    pageNumber: pdf.getPages().indexOf(targetPage) + 1,
    usedOverflowPage,
  };
}

export async function certifyContract(contractId: string, actor: { id: string; role: UserRole }) {
  const contract = await prisma.generatedContract.findUnique({
    where: { id: contractId },
    include: {
      createdBy: { select: { managerId: true } },
      agency: true,
    },
  });
  if (!contract) throw new AppError("CONTRACT_NOT_FOUND", "العقد غير موجود.", 404);
  const allowed =
    actor.role === UserRole.ADMIN ||
    contract.createdById === actor.id ||
    (actor.role === UserRole.SUPERVISOR && contract.createdBy.managerId === actor.id);
  if (!allowed) throw new AppError("FORBIDDEN", errorMessages.FORBIDDEN, 403);
  if (contract.certifiedPdfFileId && contract.certifiedPdfFileUrl) return contract;
  if (!contract.copiedGoogleFileId) {
    throw new AppError("CONTRACT_NOT_READY", "لا يمكن توثيق العقد قبل إنشاء نسخة Google Docs.", 422);
  }
  if (!contract.agency.stampImage || !contract.agency.signatureImage) {
    throw new AppError(
      "CERTIFICATION_IDENTITY_MISSING",
      `ارفع ختم وتوقيع شركة ${contract.agency.nameAr || contract.agency.name} من صفحة الشركات أولًا.`,
      422,
    );
  }

  const drive = await getGoogleDriveService();
  const anchorText = `CMC_ANCHOR_${randomUUID().replaceAll("-", "")}`;
  const temporary = await drive.copyContractTemplate({
    templateFileId: contract.copiedGoogleFileId,
    destinationFolderId: contract.employeeFolderId,
    newFileName: `.CMC certification ${contract.referenceNumber} ${randomUUID().slice(0, 8)}`,
  });
  let result: Awaited<ReturnType<typeof addCertificationImages>> | null = null;
  try {
    await drive.insertCertificationAnchor(
      temporary.id,
      anchorText,
      contract.agency.certificationGapAfterTablePt,
    );
    const sourcePdf = await drive.exportGoogleDocAsPdf(temporary.id);
    result = await addCertificationImages(
      sourcePdf,
      anchorText,
      new Uint8Array(contract.agency.stampImage),
      new Uint8Array(contract.agency.signatureImage),
      {
        alignment: contract.agency.certificationAlignment as CertificationAlignment,
        layout: contract.agency.certificationLayout as CertificationLayout,
        horizontalOffsetPt: contract.agency.certificationHorizontalOffsetPt,
        itemGapPt: contract.agency.certificationItemGapPt,
        signatureWidthPt: contract.agency.certificationSignatureWidthPt,
        stampWidthPt: contract.agency.certificationStampWidthPt,
      },
    );
  } finally {
    try {
      await drive.deleteFile(temporary.id);
    } catch (error) {
      logger.warn({ err: error, temporaryFileId: temporary.id }, "Could not delete temporary certification document");
    }
  }
  if (!result) throw new AppError("CERTIFICATION_FAILED", "تعذر إنشاء نسخة PDF الموثقة.", 500);

  const pdfName = `${contract.copiedFileName.replace(/\.pdf$/i, "")} - Certified.pdf`;
  const uploaded = await drive.uploadPdf({
    folderId: contract.employeeFolderId,
    fileName: pdfName,
    content: result.pdf,
  });
  const sha256 = createHash("sha256").update(result.pdf).digest("hex");
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const updated = await tx.generatedContract.update({
      where: { id: contract.id },
      data: {
        status: ContractStatus.CERTIFIED,
        certifiedPdfFileId: uploaded.id,
        certifiedPdfFileUrl: uploaded.webViewLink,
        certifiedPdfFileName: uploaded.name,
        certifiedPdfSha256: sha256,
        certifiedById: actor.id,
        certifiedAt: now,
        completedAt: contract.completedAt ?? now,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: "CONTRACT_CERTIFIED",
        entityType: "GeneratedContract",
        entityId: contract.id,
        requestId: contract.requestId,
        details: {
          referenceNumber: contract.referenceNumber,
          agencyId: contract.agencyId,
          certifiedPdfFileId: uploaded.id,
          certifiedPdfSha256: sha256,
          placementPage: result.pageNumber,
          usedOverflowPage: result.usedOverflowPage,
          certificationAlignment: contract.agency.certificationAlignment,
          certificationLayout: contract.agency.certificationLayout,
        },
      },
    });
    return updated;
  });
}

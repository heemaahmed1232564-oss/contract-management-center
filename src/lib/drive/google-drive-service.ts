import { google, docs_v1, drive_v3 } from "googleapis";
import { Readable } from "node:stream";
import { AppError, errorMessages } from "@/lib/api-error";
import { createDriveOAuthClient } from "@/lib/drive/oauth";
import type {
  CopyTemplateInput,
  DriveFileMetadata,
  DriveHealthResult,
  GoogleDriveService,
} from "@/lib/drive/types";

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

type ServiceAccountCredentials = {
  client_email: string;
  private_key: string;
  project_id?: string;
};

function parseServiceAccountCredentials(input: string): ServiceAccountCredentials {
  try {
    const raw = input.trim().startsWith("{")
      ? input
      : Buffer.from(input, "base64").toString("utf8");
    const parsed = JSON.parse(raw) as ServiceAccountCredentials;
    if (!parsed.client_email || !parsed.private_key) throw new Error("Invalid service account");
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    return parsed;
  } catch {
    throw new AppError(
      "DRIVE_CREDENTIALS_INVALID",
      "بيانات Service Account غير صحيحة.",
      503,
    );
  }
}

class GoogleDriveApiService implements GoogleDriveService {
  protected readonly drive: drive_v3.Drive;
  protected readonly docs: docs_v1.Docs;

  constructor(auth: NonNullable<drive_v3.Options["auth"]>) {
    this.drive = google.drive({ version: "v3", auth });
    this.docs = google.docs({ version: "v1", auth });
  }

  async getFileMetadata(fileId: string): Promise<DriveFileMetadata> {
    const response = await this.drive.files.get({
      fileId,
      supportsAllDrives: true,
      fields: "id,name,mimeType,webViewLink,driveId,parents,trashed,capabilities(canCopy,canAddChildren)",
    });
    const file = response.data;
    if (!file.id || !file.name) throw new Error("Google Drive returned incomplete metadata");
    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      webViewLink: file.webViewLink,
      driveId: file.driveId,
      parents: file.parents,
      trashed: file.trashed,
      canCopy: file.capabilities?.canCopy,
      canAddChildren: file.capabilities?.canAddChildren,
    };
  }

  async validateTemplateAccess(fileId: string): Promise<DriveHealthResult> {
    try {
      const metadata = await this.getFileMetadata(fileId);
      if (metadata.trashed) return { ok: false, metadata, message: "القالب موجود في سلة المهملات." };
      if (metadata.mimeType !== "application/vnd.google-apps.document") {
        return { ok: false, metadata, message: "الملف ليس Google Docs." };
      }
      if (metadata.canCopy === false) {
        return { ok: false, metadata, message: "لا توجد صلاحية لنسخ القالب." };
      }
      return { ok: true, metadata };
    } catch {
      return { ok: false, message: errorMessages.TEMPLATE_ACCESS_DENIED };
    }
  }

  async validateFolderAccess(folderId: string): Promise<DriveHealthResult> {
    try {
      const metadata = await this.getFileMetadata(folderId);
      if (metadata.trashed || metadata.mimeType !== FOLDER_MIME_TYPE) {
        return { ok: false, metadata, message: errorMessages.EMPLOYEE_FOLDER_UNAVAILABLE };
      }
      if (metadata.canAddChildren === false) {
        return { ok: false, metadata, message: "لا توجد صلاحية لإضافة ملفات داخل مجلد الموظف." };
      }
      return { ok: true, metadata };
    } catch {
      return { ok: false, message: errorMessages.EMPLOYEE_FOLDER_UNAVAILABLE };
    }
  }

  async copyContractTemplate(input: CopyTemplateInput): Promise<DriveFileMetadata> {
    const response = await this.drive.files.copy({
      fileId: input.templateFileId,
      supportsAllDrives: true,
      requestBody: {
        name: input.newFileName,
        parents: [input.destinationFolderId],
      },
      fields: "id,name,mimeType,webViewLink,driveId,parents,trashed",
    });
    const file = response.data;
    if (!file.id || !file.name) throw new Error("Google Drive copy did not return a file id");
    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      webViewLink: file.webViewLink,
      driveId: file.driveId,
      parents: file.parents,
      trashed: file.trashed,
    };
  }

  async moveFileToFolder(fileId: string, folderId: string) {
    const metadata = await this.getFileMetadata(fileId);
    const response = await this.drive.files.update({
      fileId,
      supportsAllDrives: true,
      addParents: folderId,
      removeParents: metadata.parents?.join(","),
      fields: "id,name,mimeType,webViewLink,driveId,parents,trashed",
    });
    if (!response.data.id) throw new Error("Could not move Google Drive file");
    return {
      id: response.data.id,
      name: response.data.name ?? metadata.name,
      mimeType: response.data.mimeType,
      webViewLink: response.data.webViewLink,
      driveId: response.data.driveId,
      parents: response.data.parents,
      trashed: response.data.trashed,
    };
  }

  async insertCertificationAnchor(fileId: string, anchorText: string, gapAfterTablePt: number) {
    try {
      const response = await this.docs.documents.get({ documentId: fileId });
      const content = response.data.body?.content ?? [];
      const tables = content.filter((element) => element.table && element.endIndex != null);
      const lastTable = tables.at(-1);
      if (!lastTable?.endIndex) {
        throw new AppError(
          "CONTRACT_TABLE_NOT_FOUND",
          "لم يتم العثور على جدول داخل العقد. يجب أن يحتوي القالب على جدول واحد على الأقل لتحديد موضع التوثيق.",
          422,
        );
      }
      const followingParagraph = content.find(
        (element) => element.paragraph && (element.startIndex ?? 0) >= lastTable.endIndex!,
      );
      const insertIndex = followingParagraph?.startIndex ?? lastTable.endIndex;
      const endIndex = insertIndex + anchorText.length;
      await this.docs.documents.batchUpdate({
        documentId: fileId,
        requestBody: {
          requests: [
            { insertText: { location: { index: insertIndex }, text: anchorText } },
            {
              updateTextStyle: {
                range: { startIndex: insertIndex, endIndex },
                textStyle: {
                  fontSize: { magnitude: 1, unit: "PT" },
                  foregroundColor: { color: { rgbColor: { red: 0.98, green: 0.98, blue: 0.98 } } },
                },
                fields: "fontSize,foregroundColor",
              },
            },
            {
              updateParagraphStyle: {
                range: { startIndex: insertIndex, endIndex },
                paragraphStyle: {
                  alignment: "START",
                  direction: "RIGHT_TO_LEFT",
                  spaceAbove: { magnitude: gapAfterTablePt, unit: "PT" },
                  spaceBelow: { magnitude: 0, unit: "PT" },
                },
                fields: "alignment,direction,spaceAbove,spaceBelow",
              },
            },
          ],
        },
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      const responseMessage = (error as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      const message = responseMessage || (error instanceof Error ? error.message : String(error));
      if (/docs.googleapis.com|Google Docs API|SERVICE_DISABLED/i.test(message)) {
        throw new AppError(
          "GOOGLE_DOCS_API_DISABLED",
          "فعّل Google Docs API داخل مشروع Google Cloud المستخدم في الربط، ثم أعد المحاولة.",
          503,
        );
      }
      throw new AppError(
        "GOOGLE_DOCS_POSITIONING_FAILED",
        `تعذر تجهيز موضع التوثيق بعد آخر جدول في Google Docs: ${message}`,
        502,
      );
    }
  }

  async exportGoogleDocAsPdf(fileId: string) {
    const response = await this.drive.files.export(
      { fileId, mimeType: "application/pdf" },
      { responseType: "arraybuffer" },
    );
    return Buffer.from(response.data as ArrayBuffer);
  }

  async deleteFile(fileId: string) {
    await this.drive.files.delete({ fileId, supportsAllDrives: true });
  }

  async uploadPdf(input: { folderId: string; fileName: string; content: Buffer }) {
    const response = await this.drive.files.create({
      supportsAllDrives: true,
      requestBody: { name: input.fileName, parents: [input.folderId] },
      media: { mimeType: "application/pdf", body: Readable.from(input.content) },
      fields: "id,name,mimeType,webViewLink,webContentLink,driveId,parents,trashed",
    });
    const file = response.data;
    if (!file.id || !file.name) throw new Error("Google Drive upload did not return a file id");
    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      webViewLink: file.webViewLink ?? file.webContentLink,
      driveId: file.driveId,
      parents: file.parents,
      trashed: file.trashed,
    };
  }

  buildGoogleDocsUrl(fileId: string) {
    return `https://docs.google.com/document/d/${encodeURIComponent(fileId)}/edit`;
  }

  extractGoogleFileIdFromUrl(value: string) {
    return extractGoogleFileIdFromUrl(value);
  }

  checkTemplateHealth(fileId: string) {
    return this.validateTemplateAccess(fileId);
  }
}

export class RealGoogleDriveService extends GoogleDriveApiService {
  constructor(credentialsInput = process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    if (!credentialsInput) {
      throw new AppError(
        "DRIVE_NOT_CONFIGURED",
        "لم تتم إضافة بيانات اتصال Google Drive بعد.",
        503,
      );
    }

    const credentials = parseServiceAccountCredentials(credentialsInput);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    super(auth);
  }
}

export class OAuthGoogleDriveService extends GoogleDriveApiService {
  constructor(refreshToken: string) {
    const client = createDriveOAuthClient();
    client.setCredentials({ refresh_token: refreshToken });
    super(client);
  }
}

export function extractGoogleFileIdFromUrl(value: string) {
  const trimmed = value.trim();
  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) ?? trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (!match?.[1]) {
    throw new AppError("INVALID_GOOGLE_FILE", "تعذر استخراج Google File ID من القيمة المدخلة.");
  }
  return match[1];
}

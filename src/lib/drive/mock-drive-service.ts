import { randomUUID } from "node:crypto";
import { PDFDocument, StandardFonts } from "pdf-lib";
import type {
  CopyTemplateInput,
  DriveFileMetadata,
  GoogleDriveService,
} from "@/lib/drive/types";
import { extractGoogleFileIdFromUrl } from "@/lib/drive/google-drive-service";

export class MockGoogleDriveService implements GoogleDriveService {
  private readonly certificationAnchors = new Map<string, string>();
  async getFileMetadata(fileId: string): Promise<DriveFileMetadata> {
    const isFolder = fileId.toLowerCase().includes("folder");
    return {
      id: fileId,
      name: isFolder ? "Development Employee Folder" : "Development Contract Template",
      mimeType: isFolder
        ? "application/vnd.google-apps.folder"
        : "application/vnd.google-apps.document",
      webViewLink: isFolder ? null : this.buildGoogleDocsUrl(fileId),
      parents: [],
      trashed: false,
      canCopy: true,
      canAddChildren: true,
    };
  }

  async validateTemplateAccess(fileId: string) {
    return { ok: true, metadata: await this.getFileMetadata(fileId) };
  }

  async validateFolderAccess(folderId: string) {
    const metadata = await this.getFileMetadata(`folder-${folderId}`);
    return { ok: true, metadata: { ...metadata, id: folderId } };
  }

  async copyContractTemplate(input: CopyTemplateInput) {
    const id = `mock-${randomUUID()}`;
    return {
      id,
      name: input.newFileName,
      mimeType: "application/vnd.google-apps.document",
      webViewLink: this.buildGoogleDocsUrl(id),
      parents: [input.destinationFolderId],
      trashed: false,
    };
  }

  async moveFileToFolder(fileId: string, folderId: string) {
    const metadata = await this.getFileMetadata(fileId);
    return { ...metadata, parents: [folderId] };
  }

  async insertCertificationAnchor(fileId: string, anchorText: string) {
    this.certificationAnchors.set(fileId, anchorText);
  }

  async exportGoogleDocAsPdf(fileId: string) {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    page.drawText("Development contract preview", { x: 52, y: 780, size: 18, font });
    page.drawRectangle({ x: 52, y: 590, width: 491, height: 120, borderWidth: 1 });
    const anchor = this.certificationAnchors.get(fileId);
    if (anchor) page.drawText(anchor, { x: 420, y: 570, size: 1, font });
    return Buffer.from(await pdf.save());
  }

  async deleteFile(fileId: string) {
    this.certificationAnchors.delete(fileId);
  }

  async uploadPdf(input: { folderId: string; fileName: string }) {
    const id = `mock-pdf-${randomUUID()}`;
    return {
      id,
      name: input.fileName,
      mimeType: "application/pdf",
      webViewLink: `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`,
      parents: [input.folderId],
      trashed: false,
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

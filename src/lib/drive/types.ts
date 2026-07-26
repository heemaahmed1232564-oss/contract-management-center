export type DriveFileMetadata = {
  id: string;
  name: string;
  mimeType?: string | null;
  webViewLink?: string | null;
  driveId?: string | null;
  parents?: string[] | null;
  trashed?: boolean | null;
  canCopy?: boolean;
  canAddChildren?: boolean;
};

export type CopyTemplateInput = {
  templateFileId: string;
  destinationFolderId: string;
  newFileName: string;
};

export type DriveHealthResult = {
  ok: boolean;
  metadata?: DriveFileMetadata;
  message?: string;
};

export interface GoogleDriveService {
  getFileMetadata(fileId: string): Promise<DriveFileMetadata>;
  validateTemplateAccess(fileId: string): Promise<DriveHealthResult>;
  validateFolderAccess(folderId: string): Promise<DriveHealthResult>;
  copyContractTemplate(input: CopyTemplateInput): Promise<DriveFileMetadata>;
  moveFileToFolder(fileId: string, folderId: string): Promise<DriveFileMetadata>;
  insertCertificationAnchor(fileId: string, anchorText: string, gapAfterTablePt: number): Promise<void>;
  exportGoogleDocAsPdf(fileId: string): Promise<Buffer>;
  deleteFile(fileId: string): Promise<void>;
  uploadPdf(input: { folderId: string; fileName: string; content: Buffer }): Promise<DriveFileMetadata>;
  buildGoogleDocsUrl(fileId: string): string;
  extractGoogleFileIdFromUrl(value: string): string;
  checkTemplateHealth(fileId: string): Promise<DriveHealthResult>;
}

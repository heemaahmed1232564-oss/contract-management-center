import { describe, expect, it, vi } from "vitest";
import { generateContractCopy } from "@/lib/contracts/copy-orchestrator";
import type { GoogleDriveService } from "@/lib/drive";

function driveMock(overrides: Partial<GoogleDriveService> = {}): GoogleDriveService {
  return {
    getFileMetadata: vi.fn(),
    validateTemplateAccess: vi.fn().mockResolvedValue({ ok: true }),
    validateFolderAccess: vi.fn().mockResolvedValue({ ok: true }),
    copyContractTemplate: vi.fn().mockResolvedValue({ id: "copy-123", name: "Contract", parents: ["folder-1"], webViewLink: "https://docs.google.com/document/d/copy-123/edit" }),
    moveFileToFolder: vi.fn(),
    insertCertificationAnchor: vi.fn(),
    exportGoogleDocAsPdf: vi.fn(),
    deleteFile: vi.fn(),
    uploadPdf: vi.fn(),
    buildGoogleDocsUrl: vi.fn((id: string) => `https://docs.google.com/document/d/${id}/edit`),
    extractGoogleFileIdFromUrl: vi.fn((value: string) => value),
    checkTemplateHealth: vi.fn(),
    ...overrides,
  };
}

describe("contract copy integration with a mocked Drive", () => {
  it("validates both sources and returns a different copied file", async () => {
    const drive = driveMock();
    const result = await generateContractCopy(drive, { templateFileId: "template-1", employeeFolderId: "folder-1", fileName: "CTR-1" });
    expect(result.id).toBe("copy-123");
    expect(drive.validateTemplateAccess).toHaveBeenCalledWith("template-1");
    expect(drive.validateFolderAccess).toHaveBeenCalledWith("folder-1");
    expect(drive.copyContractTemplate).toHaveBeenCalledOnce();
  });

  it("fails if Drive unexpectedly returns the original template id", async () => {
    const drive = driveMock({ copyContractTemplate: vi.fn().mockResolvedValue({ id: "template-1", name: "bad", parents: ["folder-1"] }) });
    await expect(generateContractCopy(drive, { templateFileId: "template-1", employeeFolderId: "folder-1", fileName: "CTR-1" })).rejects.toMatchObject({ code: "COPY_ID_INVALID" });
  });

  it("moves the copy when Drive does not return the requested parent", async () => {
    const move = vi.fn().mockResolvedValue({ id: "copy-123", name: "Contract", parents: ["folder-1"] });
    const drive = driveMock({ copyContractTemplate: vi.fn().mockResolvedValue({ id: "copy-123", name: "Contract", parents: ["wrong"] }), moveFileToFolder: move });
    await generateContractCopy(drive, { templateFileId: "template-1", employeeFolderId: "folder-1", fileName: "CTR-1" });
    expect(move).toHaveBeenCalledWith("copy-123", "folder-1");
  });

  it("stops before copying when the employee folder is unavailable", async () => {
    const copy = vi.fn();
    const drive = driveMock({ validateFolderAccess: vi.fn().mockResolvedValue({ ok: false, message: "missing" }), copyContractTemplate: copy });
    await expect(generateContractCopy(drive, { templateFileId: "template-1", employeeFolderId: "folder-1", fileName: "CTR-1" })).rejects.toMatchObject({ code: "EMPLOYEE_FOLDER_UNAVAILABLE" });
    expect(copy).not.toHaveBeenCalled();
  });
});

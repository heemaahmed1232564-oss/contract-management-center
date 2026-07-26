import { AppError, errorMessages } from "@/lib/api-error";
import type { GoogleDriveService } from "@/lib/drive";

export type ContractCopyInput = {
  templateFileId: string;
  employeeFolderId: string;
  fileName: string;
};

export async function generateContractCopy(
  drive: GoogleDriveService,
  input: ContractCopyInput,
) {
  const templateHealth = await drive.validateTemplateAccess(input.templateFileId);
  if (!templateHealth.ok) {
    throw new AppError(
      "TEMPLATE_ACCESS_DENIED",
      templateHealth.message ?? errorMessages.TEMPLATE_ACCESS_DENIED,
      422,
    );
  }

  const folderHealth = await drive.validateFolderAccess(input.employeeFolderId);
  if (!folderHealth.ok) {
    throw new AppError(
      "EMPLOYEE_FOLDER_UNAVAILABLE",
      folderHealth.message ?? errorMessages.EMPLOYEE_FOLDER_UNAVAILABLE,
      422,
    );
  }

  const copied = await drive.copyContractTemplate({
    templateFileId: input.templateFileId,
    destinationFolderId: input.employeeFolderId,
    newFileName: input.fileName,
  });

  if (!copied.id || copied.id === input.templateFileId) {
    throw new AppError("COPY_ID_INVALID", errorMessages.COPY_ID_INVALID, 502);
  }
  if (!copied.parents?.includes(input.employeeFolderId)) {
    const moved = await drive.moveFileToFolder(copied.id, input.employeeFolderId);
    if (!moved.parents?.includes(input.employeeFolderId)) {
      throw new AppError("COPY_FAILED", errorMessages.COPY_FAILED, 502);
    }
    return {
      ...moved,
      webViewLink: moved.webViewLink ?? drive.buildGoogleDocsUrl(moved.id),
    };
  }

  return {
    ...copied,
    webViewLink: copied.webViewLink ?? drive.buildGoogleDocsUrl(copied.id),
  };
}

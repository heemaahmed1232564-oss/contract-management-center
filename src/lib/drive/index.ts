import type { GoogleDriveService } from "@/lib/drive/types";
import { decryptSecret } from "@/lib/crypto/secrets";
import { MockGoogleDriveService } from "@/lib/drive/mock-drive-service";
import {
  OAuthGoogleDriveService,
  RealGoogleDriveService,
} from "@/lib/drive/google-drive-service";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

let staticDriveService: GoogleDriveService | undefined;

export async function getGoogleDriveService(): Promise<GoogleDriveService> {
  const mode = process.env.GOOGLE_DRIVE_MODE ?? "mock";
  if (mode === "oauth") {
    const setting = await prisma.systemSetting.findUnique({ where: { id: "default" } });
    if (!setting?.googleDriveOAuthRefreshTokenEncrypted) {
      throw new AppError(
        "DRIVE_NOT_CONNECTED",
        "اربط حساب Google Drive من لوحة الإدارة أولًا.",
        503,
      );
    }
    return new OAuthGoogleDriveService(
      decryptSecret(setting.googleDriveOAuthRefreshTokenEncrypted),
    );
  }

  if (staticDriveService) return staticDriveService;
  staticDriveService =
    mode === "service_account" ? new RealGoogleDriveService() : new MockGoogleDriveService();
  return staticDriveService;
}

export type { GoogleDriveService } from "@/lib/drive/types";

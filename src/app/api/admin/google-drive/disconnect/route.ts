import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { decryptSecret } from "@/lib/crypto/secrets";
import { requireRole } from "@/lib/auth/permissions";
import { createDriveOAuthClient } from "@/lib/drive/oauth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await requireRole([UserRole.ADMIN]);
  const setting = await prisma.systemSetting.findUnique({ where: { id: "default" } });
  if (setting?.googleDriveOAuthRefreshTokenEncrypted) {
    try {
      const token = decryptSecret(setting.googleDriveOAuthRefreshTokenEncrypted);
      await createDriveOAuthClient().revokeToken(token);
    } catch (error) {
      logger.warn({ error }, "Could not revoke Google Drive token; clearing local token");
    }
  }
  await prisma.$transaction([
    prisma.systemSetting.upsert({
      where: { id: "default" },
      update: {
        googleDriveOAuthRefreshTokenEncrypted: null,
        googleDriveOAuthEmail: null,
        googleDriveOAuthConnectedAt: null,
      },
      create: { id: "default" },
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "GOOGLE_DRIVE_DISCONNECTED",
        entityType: "SystemSetting",
        entityId: "default",
      },
    }),
  ]);
  return NextResponse.redirect(new URL("/admin?drive=disconnected", request.url), 303);
}

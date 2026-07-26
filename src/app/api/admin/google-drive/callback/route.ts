import { timingSafeEqual } from "node:crypto";
import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { encryptSecret } from "@/lib/crypto/secrets";
import { requireRole } from "@/lib/auth/permissions";
import { createDriveOAuthClient } from "@/lib/drive/oauth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const STATE_COOKIE = "contract_hub_drive_oauth_state";

function sameState(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function adminRedirect(request: NextRequest, result: "connected" | "error") {
  const response = NextResponse.redirect(new URL(`/admin?drive=${result}`, request.url));
  response.cookies.set(STATE_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole([UserRole.ADMIN]);
    const code = request.nextUrl.searchParams.get("code");
    const returnedState = request.nextUrl.searchParams.get("state");
    const storedState = request.cookies.get(STATE_COOKIE)?.value;
    if (!code || !returnedState || !storedState || !sameState(returnedState, storedState)) {
      return adminRedirect(request, "error");
    }

    const client = createDriveOAuthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) return adminRedirect(request, "error");
    client.setCredentials(tokens);

    const drive = google.drive({ version: "v3", auth: client });
    const about = await drive.about.get({ fields: "user(emailAddress,displayName)" });
    const email = about.data.user?.emailAddress ?? null;

    await prisma.$transaction([
      prisma.systemSetting.upsert({
        where: { id: "default" },
        update: {
          googleDriveOAuthRefreshTokenEncrypted: encryptSecret(tokens.refresh_token),
          googleDriveOAuthEmail: email,
          googleDriveOAuthConnectedAt: new Date(),
        },
        create: {
          id: "default",
          googleDriveOAuthRefreshTokenEncrypted: encryptSecret(tokens.refresh_token),
          googleDriveOAuthEmail: email,
          googleDriveOAuthConnectedAt: new Date(),
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "GOOGLE_DRIVE_CONNECTED",
          entityType: "SystemSetting",
          entityId: "default",
          details: { email },
        },
      }),
    ]);
    return adminRedirect(request, "connected");
  } catch (error) {
    logger.error({ error }, "Google Drive OAuth callback failed");
    return adminRedirect(request, "error");
  }
}

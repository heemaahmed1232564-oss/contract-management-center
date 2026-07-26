import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/auth/permissions";
import { createDriveOAuthClient, DRIVE_SCOPE } from "@/lib/drive/oauth";

const STATE_COOKIE = "contract_hub_drive_oauth_state";

export async function GET(request: Request) {
  await requireRole([UserRole.ADMIN]);
  const state = randomBytes(32).toString("base64url");
  const client = createDriveOAuthClient();
  const authorizationUrl = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: [DRIVE_SCOPE],
    state,
  });
  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    maxAge: 10 * 60,
    path: "/",
  });
  return response;
}

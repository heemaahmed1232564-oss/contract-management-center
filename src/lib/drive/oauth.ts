import { google } from "googleapis";
import { AppError } from "@/lib/api-error";

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

export function driveOAuthConfig() {
  const clientId = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_DRIVE_OAUTH_REDIRECT_URI ??
    `${process.env.AUTH_URL ?? "http://localhost:3000"}/api/admin/google-drive/callback`;

  if (!clientId || !clientSecret) {
    throw new AppError(
      "DRIVE_OAUTH_NOT_CONFIGURED",
      "أضف بيانات Google OAuth أولًا، ثم أعد المحاولة.",
      503,
    );
  }
  return { clientId, clientSecret, redirectUri };
}

export function createDriveOAuthClient() {
  const config = driveOAuthConfig();
  return new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
}

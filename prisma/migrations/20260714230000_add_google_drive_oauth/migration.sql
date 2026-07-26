ALTER TABLE "system_settings"
ADD COLUMN "google_drive_oauth_refresh_token_encrypted" TEXT,
ADD COLUMN "google_drive_oauth_email" TEXT,
ADD COLUMN "google_drive_oauth_connected_at" TIMESTAMP(3);

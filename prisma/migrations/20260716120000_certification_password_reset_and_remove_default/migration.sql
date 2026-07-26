ALTER TYPE "ContractStatus" ADD VALUE IF NOT EXISTS 'CERTIFIED';

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "session_version" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_expires_at_idx" ON "password_reset_tokens"("user_id", "expires_at");

ALTER TABLE "system_settings"
ADD COLUMN IF NOT EXISTS "stamp_image" BYTEA,
ADD COLUMN IF NOT EXISTS "stamp_image_mime" TEXT,
ADD COLUMN IF NOT EXISTS "signature_image" BYTEA,
ADD COLUMN IF NOT EXISTS "signature_image_mime" TEXT;

ALTER TABLE "generated_contracts"
ADD COLUMN IF NOT EXISTS "certified_pdf_file_id" TEXT,
ADD COLUMN IF NOT EXISTS "certified_pdf_file_url" TEXT,
ADD COLUMN IF NOT EXISTS "certified_pdf_file_name" TEXT,
ADD COLUMN IF NOT EXISTS "certified_pdf_sha256" TEXT,
ADD COLUMN IF NOT EXISTS "certified_by" TEXT,
ADD COLUMN IF NOT EXISTS "certified_at" TIMESTAMP(3);

ALTER TABLE "generated_contracts"
ADD CONSTRAINT "generated_contracts_certified_by_fkey" FOREIGN KEY ("certified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "generated_contracts_certified_by_certified_at_idx" ON "generated_contracts"("certified_by", "certified_at");

DROP INDEX IF EXISTS "contract_templates_one_active_default_idx";
ALTER TABLE "contract_templates" DROP COLUMN IF EXISTS "is_default";

ALTER TABLE "agencies"
ADD COLUMN IF NOT EXISTS "stamp_image" BYTEA,
ADD COLUMN IF NOT EXISTS "stamp_image_mime" TEXT,
ADD COLUMN IF NOT EXISTS "signature_image" BYTEA,
ADD COLUMN IF NOT EXISTS "signature_image_mime" TEXT,
ADD COLUMN IF NOT EXISTS "certification_alignment" TEXT NOT NULL DEFAULT 'RIGHT',
ADD COLUMN IF NOT EXISTS "certification_layout" TEXT NOT NULL DEFAULT 'SIGNATURE_RIGHT_STAMP_LEFT',
ADD COLUMN IF NOT EXISTS "certification_gap_after_table_pt" INTEGER NOT NULL DEFAULT 12,
ADD COLUMN IF NOT EXISTS "certification_horizontal_offset_pt" INTEGER NOT NULL DEFAULT 18,
ADD COLUMN IF NOT EXISTS "certification_item_gap_pt" INTEGER NOT NULL DEFAULT 12,
ADD COLUMN IF NOT EXISTS "certification_signature_width_pt" INTEGER NOT NULL DEFAULT 150,
ADD COLUMN IF NOT EXISTS "certification_stamp_width_pt" INTEGER NOT NULL DEFAULT 115;

-- Preserve an existing global identity by copying it to companies that do not
-- yet have their own identity. Future changes are saved per company only.
UPDATE "agencies" AS agency
SET
  "stamp_image" = COALESCE(agency."stamp_image", setting."stamp_image"),
  "stamp_image_mime" = COALESCE(agency."stamp_image_mime", setting."stamp_image_mime"),
  "signature_image" = COALESCE(agency."signature_image", setting."signature_image"),
  "signature_image_mime" = COALESCE(agency."signature_image_mime", setting."signature_image_mime")
FROM "system_settings" AS setting
WHERE setting."id" = 'default';

ALTER TABLE "system_settings"
DROP COLUMN IF EXISTS "stamp_image",
DROP COLUMN IF EXISTS "stamp_image_mime",
DROP COLUMN IF EXISTS "signature_image",
DROP COLUMN IF EXISTS "signature_image_mime";

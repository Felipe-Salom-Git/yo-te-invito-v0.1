-- Idempotent: safe if a previous attempt partially applied (e.g. enum already present).

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'RelationshipOrigin'
      AND e.enumlabel = 'REQUESTED_BY_REFERRER_LINK'
  ) THEN
    ALTER TYPE "RelationshipOrigin" ADD VALUE 'REQUESTED_BY_REFERRER_LINK';
  END IF;
END $$;

ALTER TABLE "ReferrerProfile" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "ReferrerProfile" ADD COLUMN IF NOT EXISTS "longBio" TEXT;
ALTER TABLE "ReferrerProfile" ADD COLUMN IF NOT EXISTS "coverImageUrl" TEXT;
ALTER TABLE "ReferrerProfile" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "ReferrerProfile" ADD COLUMN IF NOT EXISTS "region" TEXT;
ALTER TABLE "ReferrerProfile" ADD COLUMN IF NOT EXISTS "publicVisibility" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ReferrerProfile" ADD COLUMN IF NOT EXISTS "associationLinkToken" TEXT;

UPDATE "ReferrerProfile"
SET "associationLinkToken" = 'rt_' || replace(gen_random_uuid()::text, '-', '')
WHERE "associationLinkToken" IS NULL;

ALTER TABLE "ReferrerProfile" ALTER COLUMN "associationLinkToken" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "ReferrerProfile_associationLinkToken_key" ON "ReferrerProfile"("associationLinkToken");

CREATE UNIQUE INDEX IF NOT EXISTS "ReferrerProfile_tenantId_slug_key" ON "ReferrerProfile"("tenantId", "slug");

CREATE INDEX IF NOT EXISTS "ReferrerProfile_tenantId_publicVisibility_status_idx" ON "ReferrerProfile"("tenantId", "publicVisibility", "status");

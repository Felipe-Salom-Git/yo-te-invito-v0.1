-- Idempotent enum value
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'RelationshipOrigin' AND e.enumlabel = 'DISCOVERED_IN_FREELANCE_LIST'
  ) THEN
    ALTER TYPE "RelationshipOrigin" ADD VALUE 'DISCOVERED_IN_FREELANCE_LIST';
  END IF;
END $$;

-- Unique public handle per tenant (multiple NULL handles still allowed in PostgreSQL)
CREATE UNIQUE INDEX IF NOT EXISTS "ReferrerProfile_tenantId_publicHandle_key" ON "ReferrerProfile"("tenantId", "publicHandle");

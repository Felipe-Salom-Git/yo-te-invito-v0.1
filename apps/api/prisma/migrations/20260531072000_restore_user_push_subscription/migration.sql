-- Hotfix production drift: restore UserPushSubscription table expected by current API.
-- Safe / non-destructive: creates missing table, indexes and FKs if absent.
-- NotificationChannel already has PUSH in production DB; this migration only restores the missing table.

CREATE TABLE IF NOT EXISTS "UserPushSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "deviceName" TEXT,
    "platform" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserPushSubscription_endpoint_key"
ON "UserPushSubscription"("endpoint");

CREATE INDEX IF NOT EXISTS "UserPushSubscription_userId_idx"
ON "UserPushSubscription"("userId");

CREATE INDEX IF NOT EXISTS "UserPushSubscription_tenantId_userId_idx"
ON "UserPushSubscription"("tenantId", "userId");

CREATE INDEX IF NOT EXISTS "UserPushSubscription_isActive_idx"
ON "UserPushSubscription"("isActive");

DO $$
BEGIN
  ALTER TABLE "UserPushSubscription"
  ADD CONSTRAINT "UserPushSubscription_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "UserPushSubscription"
  ADD CONSTRAINT "UserPushSubscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

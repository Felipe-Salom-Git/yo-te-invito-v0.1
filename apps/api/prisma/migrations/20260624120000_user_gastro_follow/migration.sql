-- UserGastroFollow was in schema but missing from migrations (gastro follows feature).

CREATE TABLE IF NOT EXISTS "UserGastroFollow" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gastroProfileId" TEXT NOT NULL,
    "webNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserGastroFollow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserGastroFollow_tenantId_userId_gastroProfileId_key"
    ON "UserGastroFollow"("tenantId", "userId", "gastroProfileId");

CREATE INDEX IF NOT EXISTS "UserGastroFollow_tenantId_userId_idx"
    ON "UserGastroFollow"("tenantId", "userId");

CREATE INDEX IF NOT EXISTS "UserGastroFollow_tenantId_gastroProfileId_idx"
    ON "UserGastroFollow"("tenantId", "gastroProfileId");

DO $$ BEGIN
    ALTER TABLE "UserGastroFollow" ADD CONSTRAINT "UserGastroFollow_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "UserGastroFollow" ADD CONSTRAINT "UserGastroFollow_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "UserGastroFollow" ADD CONSTRAINT "UserGastroFollow_gastroProfileId_fkey"
        FOREIGN KEY ("gastroProfileId") REFERENCES "GastroProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

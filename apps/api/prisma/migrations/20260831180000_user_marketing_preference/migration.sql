-- V3.3 Etapa 8.1: consentimiento comercial por canal (default false; sin backfill opt-in).

CREATE TABLE "UserMarketingPreference" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailOptIn" BOOLEAN NOT NULL DEFAULT false,
    "emailOptInAt" TIMESTAMP(3),
    "emailOptOutAt" TIMESTAMP(3),
    "emailUnsubscribeToken" TEXT,
    "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false,
    "whatsappOptInAt" TIMESTAMP(3),
    "whatsappOptOutAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'ACCOUNT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMarketingPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserMarketingPreference_userId_key" ON "UserMarketingPreference"("userId");
CREATE UNIQUE INDEX "UserMarketingPreference_emailUnsubscribeToken_key" ON "UserMarketingPreference"("emailUnsubscribeToken");
CREATE INDEX "UserMarketingPreference_tenantId_emailOptIn_idx" ON "UserMarketingPreference"("tenantId", "emailOptIn");

ALTER TABLE "UserMarketingPreference"
  ADD CONSTRAINT "UserMarketingPreference_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserMarketingPreference"
  ADD CONSTRAINT "UserMarketingPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

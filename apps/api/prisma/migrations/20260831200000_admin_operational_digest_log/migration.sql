-- V3.3 Etapa 8.6: operational Admin expired-benefits digest log (not marketing).

CREATE TABLE "AdminOperationalDigestLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "digestKey" TEXT NOT NULL,
    "recipientUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminOperationalDigestLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminOperationalDigestLog_tenantId_kind_digestKey_recipientUserId_key" ON "AdminOperationalDigestLog"("tenantId", "kind", "digestKey", "recipientUserId");
CREATE INDEX "AdminOperationalDigestLog_tenantId_kind_digestKey_idx" ON "AdminOperationalDigestLog"("tenantId", "kind", "digestKey");

ALTER TABLE "AdminOperationalDigestLog" ADD CONSTRAINT "AdminOperationalDigestLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdminOperationalDigestLog" ADD CONSTRAINT "AdminOperationalDigestLog_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

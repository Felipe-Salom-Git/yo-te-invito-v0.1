-- V3.1 Etapa 5 Slice 5.1 — Scanner account ownership

CREATE TYPE "ScannerParentProfileType" AS ENUM (
  'PRODUCER',
  'GASTRO',
  'EXCURSION_OPERATOR',
  'RENTAL_LOCATION'
);

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SCANNER_ACCOUNT_LINKED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SCANNER_ACCOUNT_DEACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SCANNER_ACCOUNT_ACTIVATED';

CREATE TABLE "ScannerAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "scannerUserId" TEXT NOT NULL,
    "parentUserId" TEXT NOT NULL,
    "parentProfileType" "ScannerParentProfileType" NOT NULL,
    "parentProfileId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScannerAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScannerAccount_scannerUserId_key" ON "ScannerAccount"("scannerUserId");
CREATE INDEX "ScannerAccount_tenantId_idx" ON "ScannerAccount"("tenantId");
CREATE INDEX "ScannerAccount_tenantId_parentProfileType_parentProfileId_idx" ON "ScannerAccount"("tenantId", "parentProfileType", "parentProfileId");
CREATE INDEX "ScannerAccount_tenantId_parentUserId_idx" ON "ScannerAccount"("tenantId", "parentUserId");

ALTER TABLE "ScannerAccount" ADD CONSTRAINT "ScannerAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScannerAccount" ADD CONSTRAINT "ScannerAccount_scannerUserId_fkey" FOREIGN KEY ("scannerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScannerAccount" ADD CONSTRAINT "ScannerAccount_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

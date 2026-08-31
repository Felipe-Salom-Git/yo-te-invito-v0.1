-- CreateEnum
CREATE TYPE "CourtesyCreditLedgerEntryType" AS ENUM ('CREDIT_FROM_SETTLEMENT', 'DEBIT_COURTESY', 'ADJUSTMENT', 'REVERSAL');

-- CreateTable
CREATE TABLE "CourtesyCreditLedgerEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vertical" "BenefitVertical" NOT NULL,
    "gastroProfileId" TEXT,
    "excursionOperatorId" TEXT,
    "type" "CourtesyCreditLedgerEntryType" NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "sourceAllocationId" TEXT,
    "reversalOfEntryId" TEXT,
    "adjustmentReason" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourtesyCreditLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourtesyCreditLedgerEntry_tenantId_vertical_gastroProfileId_currency_idx" ON "CourtesyCreditLedgerEntry"("tenantId", "vertical", "gastroProfileId", "currency");

-- CreateIndex
CREATE INDEX "CourtesyCreditLedgerEntry_tenantId_vertical_excursionOperatorId_currency_idx" ON "CourtesyCreditLedgerEntry"("tenantId", "vertical", "excursionOperatorId", "currency");

-- CreateIndex
CREATE INDEX "CourtesyCreditLedgerEntry_tenantId_createdAt_idx" ON "CourtesyCreditLedgerEntry"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "CourtesyCreditLedgerEntry_sourceAllocationId_idx" ON "CourtesyCreditLedgerEntry"("sourceAllocationId");

-- CreateIndex
CREATE UNIQUE INDEX "CourtesyCreditLedgerEntry_sourceAllocationId_key" ON "CourtesyCreditLedgerEntry"("sourceAllocationId");

-- CreateIndex
CREATE UNIQUE INDEX "CourtesyCreditLedgerEntry_reversalOfEntryId_key" ON "CourtesyCreditLedgerEntry"("reversalOfEntryId");

-- AddForeignKey
ALTER TABLE "CourtesyCreditLedgerEntry" ADD CONSTRAINT "CourtesyCreditLedgerEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourtesyCreditLedgerEntry" ADD CONSTRAINT "CourtesyCreditLedgerEntry_gastroProfileId_fkey" FOREIGN KEY ("gastroProfileId") REFERENCES "GastroProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourtesyCreditLedgerEntry" ADD CONSTRAINT "CourtesyCreditLedgerEntry_excursionOperatorId_fkey" FOREIGN KEY ("excursionOperatorId") REFERENCES "ExcursionOperator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourtesyCreditLedgerEntry" ADD CONSTRAINT "CourtesyCreditLedgerEntry_sourceAllocationId_fkey" FOREIGN KEY ("sourceAllocationId") REFERENCES "BenefitSettlementUsageAllocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourtesyCreditLedgerEntry" ADD CONSTRAINT "CourtesyCreditLedgerEntry_reversalOfEntryId_fkey" FOREIGN KEY ("reversalOfEntryId") REFERENCES "CourtesyCreditLedgerEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourtesyCreditLedgerEntry" ADD CONSTRAINT "CourtesyCreditLedgerEntry_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AuditAction
ALTER TYPE "AuditAction" ADD VALUE 'BENEFIT_CREDIT_MATERIALIZED';
ALTER TYPE "AuditAction" ADD VALUE 'BENEFIT_CREDIT_ADJUSTED';
ALTER TYPE "AuditAction" ADD VALUE 'BENEFIT_CREDIT_REVERSED';

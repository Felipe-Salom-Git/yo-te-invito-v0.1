-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'BENEFIT_TRANSFER_REGISTERED';
ALTER TYPE "AuditAction" ADD VALUE 'BENEFIT_TRANSFER_REVERSED';

-- CreateTable
CREATE TABLE "BenefitSettlementTransfer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "transferredAt" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "proofUrl" TEXT,
    "registeredByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversedAt" TIMESTAMP(3),
    "reversedByUserId" TEXT,
    "reversalReason" TEXT,

    CONSTRAINT "BenefitSettlementTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BenefitSettlementTransfer_tenantId_settlementId_idx" ON "BenefitSettlementTransfer"("tenantId", "settlementId");

-- CreateIndex
CREATE INDEX "BenefitSettlementTransfer_settlementId_reversedAt_idx" ON "BenefitSettlementTransfer"("settlementId", "reversedAt");

-- AddForeignKey
ALTER TABLE "BenefitSettlementTransfer" ADD CONSTRAINT "BenefitSettlementTransfer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitSettlementTransfer" ADD CONSTRAINT "BenefitSettlementTransfer_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "BenefitSettlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitSettlementTransfer" ADD CONSTRAINT "BenefitSettlementTransfer_registeredByUserId_fkey" FOREIGN KEY ("registeredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitSettlementTransfer" ADD CONSTRAINT "BenefitSettlementTransfer_reversedByUserId_fkey" FOREIGN KEY ("reversedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "BenefitSettlementStatus" AS ENUM ('OPEN', 'PARTIALLY_ALLOCATED', 'ALLOCATED', 'CLOSED');
CREATE TYPE "BenefitValidationSource" AS ENUM ('GASTRO_DISCOUNT_VALIDATION', 'ACTIVITY_COUPON_VALIDATION');
CREATE TYPE "BenefitSettlementAllocationMode" AS ENUM ('CASH', 'BARTER');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'BENEFIT_SETTLEMENT_GENERATED';
ALTER TYPE "AuditAction" ADD VALUE 'BENEFIT_SETTLEMENT_REFRESHED';
ALTER TYPE "AuditAction" ADD VALUE 'BENEFIT_USAGE_ALLOCATED_CASH';
ALTER TYPE "AuditAction" ADD VALUE 'BENEFIT_USAGE_ALLOCATED_BARTER';
ALTER TYPE "AuditAction" ADD VALUE 'BENEFIT_SETTLEMENT_CLOSED';

-- CreateTable
CREATE TABLE "BenefitSettlement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vertical" "BenefitVertical" NOT NULL,
    "gastroProfileId" TEXT,
    "excursionOperatorId" TEXT,
    "periodKey" TEXT NOT NULL,
    "status" "BenefitSettlementStatus" NOT NULL DEFAULT 'OPEN',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "BenefitSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BenefitSettlementUsageAllocation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "validationSource" "BenefitValidationSource" NOT NULL,
    "validationId" TEXT NOT NULL,
    "mode" "BenefitSettlementAllocationMode" NOT NULL,
    "agreementId" TEXT NOT NULL,
    "unitPriceCents" BIGINT NOT NULL,
    "barterMultiplier" DECIMAL(8,4) NOT NULL,
    "baseAmountCents" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "allocatedByUserId" TEXT,

    CONSTRAINT "BenefitSettlementUsageAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BenefitSettlement_tenantId_vertical_gastroProfileId_periodKey_idx" ON "BenefitSettlement"("tenantId", "vertical", "gastroProfileId", "periodKey");

-- CreateIndex
CREATE INDEX "BenefitSettlement_tenantId_vertical_excursionOperatorId_periodKey_idx" ON "BenefitSettlement"("tenantId", "vertical", "excursionOperatorId", "periodKey");

-- CreateIndex
CREATE INDEX "BenefitSettlement_tenantId_status_idx" ON "BenefitSettlement"("tenantId", "status");

-- CreateIndex
CREATE INDEX "BenefitSettlement_tenantId_periodKey_idx" ON "BenefitSettlement"("tenantId", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "BenefitSettlement_tenant_gastro_period_key" ON "BenefitSettlement"("tenantId", "gastroProfileId", "periodKey") WHERE "vertical" = 'GASTRO' AND "gastroProfileId" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BenefitSettlement_tenant_activity_period_key" ON "BenefitSettlement"("tenantId", "excursionOperatorId", "periodKey") WHERE "vertical" = 'ACTIVITY' AND "excursionOperatorId" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BenefitSettlementUsageAllocation_validationSource_validationId_key" ON "BenefitSettlementUsageAllocation"("validationSource", "validationId");

-- CreateIndex
CREATE INDEX "BenefitSettlementUsageAllocation_tenantId_settlementId_idx" ON "BenefitSettlementUsageAllocation"("tenantId", "settlementId");

-- CreateIndex
CREATE INDEX "BenefitSettlementUsageAllocation_settlementId_mode_idx" ON "BenefitSettlementUsageAllocation"("settlementId", "mode");

-- AddForeignKey
ALTER TABLE "BenefitSettlement" ADD CONSTRAINT "BenefitSettlement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitSettlement" ADD CONSTRAINT "BenefitSettlement_gastroProfileId_fkey" FOREIGN KEY ("gastroProfileId") REFERENCES "GastroProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitSettlement" ADD CONSTRAINT "BenefitSettlement_excursionOperatorId_fkey" FOREIGN KEY ("excursionOperatorId") REFERENCES "ExcursionOperator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitSettlement" ADD CONSTRAINT "BenefitSettlement_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitSettlementUsageAllocation" ADD CONSTRAINT "BenefitSettlementUsageAllocation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitSettlementUsageAllocation" ADD CONSTRAINT "BenefitSettlementUsageAllocation_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "BenefitSettlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitSettlementUsageAllocation" ADD CONSTRAINT "BenefitSettlementUsageAllocation_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "BenefitCommercialAgreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitSettlementUsageAllocation" ADD CONSTRAINT "BenefitSettlementUsageAllocation_allocatedByUserId_fkey" FOREIGN KEY ("allocatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

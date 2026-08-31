-- CreateEnum
CREATE TYPE "BenefitVertical" AS ENUM ('GASTRO', 'ACTIVITY');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'BENEFIT_AGREEMENT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'BENEFIT_AGREEMENT_CLOSED';
ALTER TYPE "AuditAction" ADD VALUE 'BENEFIT_AGREEMENT_REPLACED';
ALTER TYPE "AuditAction" ADD VALUE 'BENEFIT_AGREEMENT_NOTES_UPDATED';

-- CreateTable
CREATE TABLE "BenefitCommercialAgreement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vertical" "BenefitVertical" NOT NULL,
    "gastroProfileId" TEXT,
    "excursionOperatorId" TEXT,
    "unitPriceCents" BIGINT NOT NULL,
    "barterMultiplier" DECIMAL(8,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "notes" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BenefitCommercialAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BenefitCommercialAgreement_tenantId_vertical_gastroProfileId_idx" ON "BenefitCommercialAgreement"("tenantId", "vertical", "gastroProfileId");

-- CreateIndex
CREATE INDEX "BenefitCommercialAgreement_tenantId_vertical_excursionOperatorId_idx" ON "BenefitCommercialAgreement"("tenantId", "vertical", "excursionOperatorId");

-- CreateIndex
CREATE INDEX "BenefitCommercialAgreement_tenantId_validFrom_validTo_idx" ON "BenefitCommercialAgreement"("tenantId", "validFrom", "validTo");

-- AddForeignKey
ALTER TABLE "BenefitCommercialAgreement" ADD CONSTRAINT "BenefitCommercialAgreement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitCommercialAgreement" ADD CONSTRAINT "BenefitCommercialAgreement_gastroProfileId_fkey" FOREIGN KEY ("gastroProfileId") REFERENCES "GastroProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitCommercialAgreement" ADD CONSTRAINT "BenefitCommercialAgreement_excursionOperatorId_fkey" FOREIGN KEY ("excursionOperatorId") REFERENCES "ExcursionOperator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitCommercialAgreement" ADD CONSTRAINT "BenefitCommercialAgreement_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

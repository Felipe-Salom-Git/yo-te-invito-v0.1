-- V3.3 G10.A1 — discount-scoped commercial agreements + optional discount attribution on transfers.
-- Additive only: nullable columns (no table rewrite), FKs, indexes, CHECK constraints.
-- No UPDATE / DELETE of existing rows. Backfill is a separate post-deploy script.

-- AlterTable
ALTER TABLE "BenefitCommercialAgreement" ADD COLUMN "gastroDiscountId" TEXT;
ALTER TABLE "BenefitCommercialAgreement" ADD COLUMN "derivedFromAgreementId" TEXT;

-- AlterTable
ALTER TABLE "BenefitSettlementTransfer" ADD COLUMN "gastroDiscountId" TEXT;

-- CreateIndex
CREATE INDEX "BenefitCommercialAgreement_tenantId_vertical_gastroDiscount_idx" ON "BenefitCommercialAgreement"("tenantId", "vertical", "gastroDiscountId");

-- CreateIndex
CREATE INDEX "BenefitCommercialAgreement_gastroDiscountId_validFrom_idx" ON "BenefitCommercialAgreement"("gastroDiscountId", "validFrom");

-- CreateIndex
CREATE INDEX "BenefitSettlementTransfer_settlementId_gastroDiscountId_idx" ON "BenefitSettlementTransfer"("settlementId", "gastroDiscountId");

-- CreateIndex
CREATE INDEX "BenefitSettlementTransfer_tenantId_gastroDiscountId_idx" ON "BenefitSettlementTransfer"("tenantId", "gastroDiscountId");

-- AddForeignKey
ALTER TABLE "BenefitCommercialAgreement" ADD CONSTRAINT "BenefitCommercialAgreement_gastroDiscountId_fkey" FOREIGN KEY ("gastroDiscountId") REFERENCES "GastroDiscount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitCommercialAgreement" ADD CONSTRAINT "BenefitCommercialAgreement_derivedFromAgreementId_fkey" FOREIGN KEY ("derivedFromAgreementId") REFERENCES "BenefitCommercialAgreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitSettlementTransfer" ADD CONSTRAINT "BenefitSettlementTransfer_gastroDiscountId_fkey" FOREIGN KEY ("gastroDiscountId") REFERENCES "GastroDiscount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECK (SQL only, not representable in schema.prisma):
-- a discount-scoped agreement is always GASTRO and always carries its profile;
-- ACTIVITY agreements can never be discount-scoped.
ALTER TABLE "BenefitCommercialAgreement" ADD CONSTRAINT "BenefitCommercialAgreement_discount_scope_check"
  CHECK ("gastroDiscountId" IS NULL OR ("vertical" = 'GASTRO' AND "gastroProfileId" IS NOT NULL));

ALTER TABLE "BenefitCommercialAgreement" ADD CONSTRAINT "BenefitCommercialAgreement_activity_scope_check"
  CHECK ("vertical" <> 'ACTIVITY' OR "gastroDiscountId" IS NULL);

-- Lineage only makes sense on discount-scoped copies.
ALTER TABLE "BenefitCommercialAgreement" ADD CONSTRAINT "BenefitCommercialAgreement_derived_scope_check"
  CHECK ("derivedFromAgreementId" IS NULL OR "gastroDiscountId" IS NOT NULL);

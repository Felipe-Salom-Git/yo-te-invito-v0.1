-- V3.3 G10.A1 — rollback of migration 20261102120000_benefit_agreement_discount_scope.
-- ONLY valid while no allocation / transfer references a discount-scoped agreement or an
-- attributed transfer exists (see V3_3_G10_A_DISCOUNT_AGREEMENTS_CLOSING.md § rollback).
-- Preconditions (must all return 0 before running):
--   SELECT COUNT(*) FROM "BenefitSettlementUsageAllocation" a
--     JOIN "BenefitCommercialAgreement" g ON g.id = a."agreementId" WHERE g."gastroDiscountId" IS NOT NULL;
--   SELECT COUNT(*) FROM "BenefitSettlementTransfer" WHERE "gastroDiscountId" IS NOT NULL;
-- Discount-scoped agreements (backfilled copies or new ones) are removed by this script.

BEGIN;

DELETE FROM "BenefitCommercialAgreement" WHERE "gastroDiscountId" IS NOT NULL;

ALTER TABLE "BenefitCommercialAgreement" DROP CONSTRAINT IF EXISTS "BenefitCommercialAgreement_discount_scope_check";
ALTER TABLE "BenefitCommercialAgreement" DROP CONSTRAINT IF EXISTS "BenefitCommercialAgreement_activity_scope_check";
ALTER TABLE "BenefitCommercialAgreement" DROP CONSTRAINT IF EXISTS "BenefitCommercialAgreement_derived_scope_check";

ALTER TABLE "BenefitSettlementTransfer" DROP COLUMN IF EXISTS "gastroDiscountId";
ALTER TABLE "BenefitCommercialAgreement" DROP COLUMN IF EXISTS "derivedFromAgreementId";
ALTER TABLE "BenefitCommercialAgreement" DROP COLUMN IF EXISTS "gastroDiscountId";

DELETE FROM "_prisma_migrations" WHERE migration_name = '20261102120000_benefit_agreement_discount_scope';

COMMIT;

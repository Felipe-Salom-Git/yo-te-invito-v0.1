-- V3.3 G10.E4 — post-backfill verification + rollback preconditions (READ ONLY). Never modifies data.
-- Usage on the VPS (after `benefit-agreements:backfill-discount-scope -- --confirm`):
--   sudo -u postgres psql -d yo_te_invito -X -f /opt/yoteinvito/scripts/ops/g10-e4-post-backfill-verify-readonly.sql
-- Expected right after the backfill (before any G10 operation): see docs/runbooks/V3_3_G10_PRODUCTION_DEPLOY.md § 17.
SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;
BEGIN READ ONLY;

\echo '== V1 migration G10 aplicada =='
SELECT migration_name, finished_at
FROM "_prisma_migrations"
WHERE migration_name = '20261102120000_benefit_agreement_discount_scope';

\echo '== V2 agreements GASTRO por alcance (legacy = gastroDiscountId NULL) =='
SELECT CASE WHEN "gastroDiscountId" IS NULL THEN 'PROFILE_LEGACY' ELSE 'DISCOUNT' END AS scope,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE "derivedFromAgreementId" IS NOT NULL) AS backfill_copies,
       COUNT(*) FILTER (WHERE "validTo" IS NULL) AS abiertos
FROM "BenefitCommercialAgreement"
WHERE vertical = 'GASTRO'
GROUP BY 1
ORDER BY 1;

\echo '== V3 copias con local distinto al del descuento (esperado: 0 filas) =='
SELECT a.id, a."gastroProfileId", d."gastroProfileId" AS discount_profile
FROM "BenefitCommercialAgreement" a
JOIN "GastroDiscount" d ON d.id = a."gastroDiscountId"
WHERE a."gastroProfileId" IS DISTINCT FROM d."gastroProfileId"
   OR a."tenantId" <> d."tenantId";

\echo '== V4 copias cuyo legacy de origen es de otro local o tiene otros términos (esperado: 0 filas) =='
SELECT c.id, c."derivedFromAgreementId"
FROM "BenefitCommercialAgreement" c
JOIN "BenefitCommercialAgreement" l ON l.id = c."derivedFromAgreementId"
WHERE l."gastroDiscountId" IS NOT NULL
   OR l."gastroProfileId" IS DISTINCT FROM c."gastroProfileId"
   OR l."unitPriceCents" <> c."unitPriceCents"
   OR l."barterMultiplier" <> c."barterMultiplier";

\echo '== V5 audits del backfill (esperado: = copias insertadas) =='
SELECT COUNT(*) AS backfill_audits
FROM "AuditLog"
WHERE "actorId" = 'system:g10-discount-agreement-backfill'
  AND action = 'BENEFIT_AGREEMENT_CREATED';

\echo '== V6 descuentos ACTIVE/APPROVED facturables sin contrato propio vigente hoy (sin cobertura) =='
SELECT d.id, d."gastroProfileId", d.status
FROM "GastroDiscount" d
WHERE d.status IN ('ACTIVE', 'APPROVED')
  AND NOT EXISTS (
    SELECT 1
    FROM "GastroCourtesyCampaign" c
    JOIN "CourtesyCreditLedgerEntry" e
      ON e."sourceCourtesyCampaignId" = c.id AND e.type = 'DEBIT_COURTESY'
    WHERE c."discountId" = d.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "BenefitCommercialAgreement" a
    WHERE a."gastroDiscountId" = d.id
      AND a."validFrom" <= now()
      AND (a."validTo" IS NULL OR a."validTo" >= date_trunc('day', now()))
  )
ORDER BY d."gastroProfileId", d.id;

\echo '== V7 operaciones G10 (precondición de rollback: ambas en 0) =='
SELECT
  (SELECT COUNT(*)
     FROM "BenefitSettlementUsageAllocation" u
     JOIN "BenefitCommercialAgreement" g ON g.id = u."agreementId"
    WHERE g."gastroDiscountId" IS NOT NULL) AS allocations_with_discount_agreement,
  (SELECT COUNT(*) FROM "BenefitSettlementTransfer" WHERE "gastroDiscountId" IS NOT NULL) AS attributed_transfers;

\echo '== V8 contratos por descuento creados fuera del backfill (precondición de rollback: 0) =='
SELECT COUNT(*) AS discount_agreements_not_from_backfill
FROM "BenefitCommercialAgreement"
WHERE "gastroDiscountId" IS NOT NULL
  AND "derivedFromAgreementId" IS NULL;

ROLLBACK;

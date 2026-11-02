-- V3.3 G10.A0 — production preflight (READ ONLY). Never modifies data.
-- Usage on the VPS: sudo -u postgres psql -d yo_te_invito -X -f g10-a0-preflight-readonly.sql
SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;
BEGIN READ ONLY;

\echo '== Q1 agreements GASTRO por local =='
SELECT "gastroProfileId",
       COUNT(*) total,
       COUNT(*) FILTER (WHERE "validTo" IS NULL) abiertos
FROM "BenefitCommercialAgreement"
WHERE vertical = 'GASTRO'
GROUP BY 1;

\echo '== Q2 descuentos por local =='
SELECT d."gastroProfileId",
       COUNT(*) descuentos,
       COUNT(*) FILTER (WHERE d.status IN ('ACTIVE','APPROVED')) activos,
       EXISTS (
         SELECT 1
         FROM "BenefitCommercialAgreement" a
         WHERE a.vertical='GASTRO'
           AND a."gastroProfileId" = d."gastroProfileId"
       ) con_agreement
FROM "GastroDiscount" d
GROUP BY 1;

\echo '== Q3 descuentos sin local =='
SELECT COUNT(*)
FROM "GastroDiscount"
WHERE "gastroProfileId" IS NULL;

\echo '== Q4 validaciones con claim sin allocation =='
SELECT v."discountId",
       COUNT(*) pendientes
FROM "GastroDiscountValidation" v
LEFT JOIN "BenefitSettlementUsageAllocation" a
  ON a."validationSource"='GASTRO_DISCOUNT_VALIDATION'
 AND a."validationId"=v.id
WHERE v."claimId" IS NOT NULL
  AND a.id IS NULL
GROUP BY 1;

\echo '== Q5 settlements GASTRO con multiples descuentos =='
SELECT s.id,
       s."periodKey",
       COUNT(DISTINCT v."discountId") descuentos,
       (
         SELECT COUNT(*)
         FROM "BenefitSettlementTransfer" t
         WHERE t."settlementId"=s.id
           AND t."reversedAt" IS NULL
       ) transfers_activas
FROM "BenefitSettlement" s
JOIN "BenefitSettlementUsageAllocation" a
  ON a."settlementId"=s.id
JOIN "GastroDiscountValidation" v
  ON v.id=a."validationId"
WHERE s.vertical='GASTRO'
GROUP BY s.id, s."periodKey";

\echo '== Q6 cortesias financiadas =='
SELECT COUNT(*)
FROM "CourtesyCreditLedgerEntry"
WHERE type='DEBIT_COURTESY';

ROLLBACK;

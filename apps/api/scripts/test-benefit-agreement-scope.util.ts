/**
 * G10.A2 — agreement scope helpers, Zod contracts and pure integrity checks (no DB).
 * Run: pnpm --filter api run test:benefit-agreement-scope
 */

import {
  benefitAgreementMatchesDiscountProfile,
  benefitCommercialAgreementPartnerHistoryQuerySchema,
  benefitCommercialAgreementResolveQuerySchema,
  checkAgreementScopeMismatch,
  checkAllocationAgreementDiscountMismatch,
  createBenefitCommercialAgreementBodySchema,
  groupMissingAgreementsByBenefit,
  isBenefitAgreementReadOnly,
  isBenefitAgreementScopeShapeValid,
  isDiscountScopedGastroAgreement,
  isLegacyGastroAgreement,
  isNewBenefitAgreementScopeValid,
  resolveBenefitAgreementScope,
  selectedValidationsMissingAgreement,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

const discountRow = { vertical: 'GASTRO' as const, gastroProfileId: 'gp1', gastroDiscountId: 'd1' };
const legacyRow = { vertical: 'GASTRO' as const, gastroProfileId: 'gp1', gastroDiscountId: null };
const operatorRow = { vertical: 'ACTIVITY' as const, excursionOperatorId: 'op1' };

// ── Scope derivation ──
assert(resolveBenefitAgreementScope(discountRow) === 'DISCOUNT', 'GASTRO + discount → DISCOUNT');
assert(resolveBenefitAgreementScope(legacyRow) === 'PROFILE_LEGACY', 'GASTRO without discount → PROFILE_LEGACY');
assert(resolveBenefitAgreementScope(operatorRow) === 'OPERATOR', 'ACTIVITY → OPERATOR (unchanged)');
assert(isDiscountScopedGastroAgreement(discountRow) && !isLegacyGastroAgreement(discountRow), 'discount row is not legacy');
assert(isLegacyGastroAgreement(legacyRow) && isBenefitAgreementReadOnly(legacyRow), 'legacy row is read-only');
assert(!isBenefitAgreementReadOnly(discountRow), 'discount row is editable (close/replace)');
assert(!isBenefitAgreementReadOnly(operatorRow), 'ACTIVITY row is editable (unchanged)');

// ── Shape (mirrors SQL CHECKs) ──
assert(isBenefitAgreementScopeShapeValid(legacyRow), 'legacy shape valid for reads');
assert(
  !isBenefitAgreementScopeShapeValid({ vertical: 'ACTIVITY', excursionOperatorId: 'op1', gastroDiscountId: 'd1' }),
  'ACTIVITY + gastroDiscountId invalid',
);
assert(!isNewBenefitAgreementScopeValid(legacyRow), 'new GASTRO without discount forbidden (D-G10-10)');
assert(isNewBenefitAgreementScopeValid(discountRow), 'new GASTRO with profile + discount allowed');
assert(
  !isNewBenefitAgreementScopeValid({ vertical: 'GASTRO', gastroDiscountId: 'd1' }),
  'new GASTRO with discount but no profile forbidden',
);
assert(isNewBenefitAgreementScopeValid(operatorRow), 'new ACTIVITY agreement unchanged');

// ── Cross-table coherence ──
assert(benefitAgreementMatchesDiscountProfile('gp1', 'gp1'), 'agreement profile == discount profile');
assert(!benefitAgreementMatchesDiscountProfile('gp2', 'gp1'), 'cross-profile rejected');
assert(!benefitAgreementMatchesDiscountProfile('gp1', null), 'discount without profile rejected');

// ── Zod: create ──
const base = { unitPriceCents: '500000', barterMultiplier: '2', validFrom: '2026-11-01' };
assert(
  createBenefitCommercialAgreementBodySchema.safeParse({ vertical: 'GASTRO', gastroProfileId: 'gp1', gastroDiscountId: 'd1', ...base }).success,
  'create GASTRO discount-scoped accepted',
);
assert(
  !createBenefitCommercialAgreementBodySchema.safeParse({ vertical: 'GASTRO', gastroProfileId: 'gp1', ...base }).success,
  'create GASTRO profile-scoped rejected',
);
assert(
  createBenefitCommercialAgreementBodySchema.safeParse({ vertical: 'ACTIVITY', excursionOperatorId: 'op1', ...base }).success,
  'create ACTIVITY accepted (unchanged)',
);
assert(
  !createBenefitCommercialAgreementBodySchema.safeParse({ vertical: 'ACTIVITY', excursionOperatorId: 'op1', gastroDiscountId: 'd1', ...base }).success,
  'create ACTIVITY with discount rejected',
);

// ── Zod: resolve / partner history ──
assert(
  benefitCommercialAgreementResolveQuerySchema.safeParse({ vertical: 'GASTRO', gastroDiscountId: 'd1' }).success,
  'resolve by discount accepted',
);
assert(
  benefitCommercialAgreementResolveQuerySchema.safeParse({ vertical: 'GASTRO', gastroProfileId: 'gp1' }).success,
  'resolve legacy by profile accepted (transitional approval gate)',
);
assert(
  !benefitCommercialAgreementResolveQuerySchema.safeParse({ vertical: 'ACTIVITY', excursionOperatorId: 'op1', gastroDiscountId: 'd1' }).success,
  'resolve ACTIVITY with discount rejected',
);
assert(
  !benefitCommercialAgreementPartnerHistoryQuerySchema.safeParse({ vertical: 'GASTRO', gastroProfileId: 'gp1', gastroDiscountId: 'd1' }).success,
  'partner-history does not accept a discount (use discount-history)',
);

// ── Integrity (pure) ──
assert(
  checkAgreementScopeMismatch({ agreementId: 'a', agreementGastroProfileId: 'gp1', gastroDiscountId: null, discountExists: false, discountGastroProfileId: null }) === null,
  'legacy agreement never flagged by scope check',
);
assert(
  checkAgreementScopeMismatch({ agreementId: 'a', agreementGastroProfileId: 'gp1', gastroDiscountId: 'd1', discountExists: true, discountGastroProfileId: 'gp1' }) === null,
  'coherent discount agreement OK',
);
assert(
  checkAgreementScopeMismatch({ agreementId: 'a', agreementGastroProfileId: 'gp2', gastroDiscountId: 'd1', discountExists: true, discountGastroProfileId: 'gp1' })?.code ===
    'AGREEMENT_SCOPE_MISMATCH',
  'profile mismatch → AGREEMENT_SCOPE_MISMATCH',
);
assert(
  checkAgreementScopeMismatch({ agreementId: 'a', agreementGastroProfileId: 'gp1', gastroDiscountId: 'd1', discountExists: false, discountGastroProfileId: null })?.code ===
    'AGREEMENT_SCOPE_MISMATCH',
  'discount-scoped agreement without discount → AGREEMENT_SCOPE_MISMATCH',
);
assert(
  checkAllocationAgreementDiscountMismatch({ allocationId: 'x', agreementGastroDiscountId: 'd1', validationDiscountId: 'd2' })?.code ===
    'ALLOCATION_AGREEMENT_DISCOUNT_MISMATCH',
  'allocation priced with another discount agreement flagged',
);
assert(
  checkAllocationAgreementDiscountMismatch({ allocationId: 'x', agreementGastroDiscountId: null, validationDiscountId: 'd2' }) === null,
  'historical allocation on legacy agreement not flagged',
);

// ── Missing agreements (D-G10-6) ──
const grouped = groupMissingAgreementsByBenefit([{ benefitId: 'dB' }, { benefitId: 'dB' }, { benefitId: 'dC' }]);
assert(
  grouped.length === 2 && grouped[0]!.benefitId === 'dB' && grouped[0]!.usageCount === 2,
  'missing agreements grouped by discount',
);
assert(
  selectedValidationsMissingAgreement(['v1', 'v2'], [{ validationId: 'v9' }]).length === 0,
  'selection of priced validations is not blocked by other discounts',
);
assert(
  selectedValidationsMissingAgreement(['v1', 'v9'], [{ validationId: 'v9' }]).join() === 'v9',
  'selection containing a missing-agreement validation is reported',
);

console.log('\nAll benefit agreement scope checks passed.');

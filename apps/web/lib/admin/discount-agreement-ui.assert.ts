/**
 * G10.B — web assertions for the discount contract UI (pure helpers, no React).
 * Run: pnpm --filter api run test:g10-discount-agreement-ui
 */
import type { BenefitCommercialAgreementDto } from '@yo-te-invito/shared';
import { adminBenefitAgreementsKeys } from '../query/keys';
import { BENEFIT_AGREEMENT_SCOPE_LABEL, benefitAgreementOriginLabel } from './benefit-agreement-labels';
import { buildDiscountAgreementTerms, pesosToCentsString } from './discount-agreement-form';
import {
  canCreateDiscountAgreement,
  isDiscountAgreementClosable,
  resolveDiscountAgreementState,
  shouldWarnMissingDiscountAgreement,
} from './discount-agreement-status';
import { isAgreementRowReadOnly, resolveGastroAgreementCreateTarget } from './benefit-agreement-list';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log('OK:', msg);
}

function agr(over: Partial<BenefitCommercialAgreementDto>): BenefitCommercialAgreementDto {
  return {
    id: 'a1',
    tenantId: 't',
    vertical: 'GASTRO',
    gastroProfileId: 'p1',
    gastroDiscountId: 'd1',
    excursionOperatorId: null,
    scope: 'DISCOUNT',
    derivedFromAgreementId: null,
    partnerDisplayName: 'Local',
    discountTitle: 'Desc',
    discountStatus: 'ACTIVE',
    unitPriceCents: '500000',
    barterMultiplier: '2',
    currency: 'ARS',
    validFrom: '2026-01-01',
    validTo: null,
    vigency: 'CURRENT',
    isOpen: true,
    notes: null,
    createdByUserId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

// ── Contract state of one discount ──
const current = agr({});
assert(resolveDiscountAgreementState({ billable: true, current, history: [current] }) === 'CURRENT', 'state: Vigente');
const future = agr({ id: 'f', vigency: 'FUTURE', validFrom: '2099-01-01' });
assert(resolveDiscountAgreementState({ billable: true, current: null, history: [future] }) === 'UPCOMING', 'state: Próximo');
const past = agr({ id: 'p', vigency: 'PAST', validTo: '2026-02-01', isOpen: false });
assert(resolveDiscountAgreementState({ billable: true, current: null, history: [past] }) === 'EXPIRED', 'state: Vencido');
assert(resolveDiscountAgreementState({ billable: true, current: null, history: [] }) === 'NONE', 'state: Sin contrato');
assert(resolveDiscountAgreementState({ billable: false, current: null, history: [] }) === 'NOT_BILLABLE', 'funded courtesy: no contract required');

// ── Alert: never hidden for ACTIVE/APPROVED billable discounts ──
assert(shouldWarnMissingDiscountAgreement({ billable: true, current: null, discountStatus: 'ACTIVE' }), 'ACTIVE without CURRENT → warning');
assert(shouldWarnMissingDiscountAgreement({ billable: true, current: null, discountStatus: 'APPROVED' }), 'APPROVED without CURRENT → warning');
assert(!shouldWarnMissingDiscountAgreement({ billable: true, current, discountStatus: 'ACTIVE' }), 'with CURRENT → no warning');
assert(!shouldWarnMissingDiscountAgreement({ billable: false, current: null, discountStatus: 'ACTIVE' }), 'funded courtesy → no warning');
assert(!shouldWarnMissingDiscountAgreement({ billable: true, current: null, discountStatus: 'PENDING_REVIEW' }), 'pending → gate copy instead of warning');

// ── Actions: create only when nothing is open; legacy never closable ──
assert(canCreateDiscountAgreement([]) && canCreateDiscountAgreement([past]), 'create allowed when no open contract');
assert(!canCreateDiscountAgreement([current]), 'create hidden while an open contract exists (use replace)');
assert(isDiscountAgreementClosable(current) && !isDiscountAgreementClosable(past), 'only open rows are closable');
const legacy = agr({ id: 'l', scope: 'PROFILE_LEGACY', gastroDiscountId: null });
assert(!isDiscountAgreementClosable(legacy), 'legacy row is never closable');
assert(isAgreementRowReadOnly(legacy) && !isAgreementRowReadOnly(current), 'legacy rows are read-only in the listing');
assert(BENEFIT_AGREEMENT_SCOPE_LABEL.PROFILE_LEGACY === 'Contrato del local (legacy)', 'legacy label');
assert(benefitAgreementOriginLabel(agr({ derivedFromAgreementId: 'l' })).includes('Copiado'), 'backfill origin label');

// ── Terms form ──
assert(pesosToCentsString('5.000') === '500000' && pesosToCentsString('0') === null, 'pesos → cents');
const okTerms = buildDiscountAgreementTerms({ unitPricePesos: '5000', barterMultiplier: '1.5', validFrom: '2026-11-01', validTo: '', notes: ' x ' });
assert(okTerms.ok && okTerms.terms.unitPriceCents === '500000' && okTerms.terms.currency === 'ARS' && okTerms.terms.notes === 'x' && !('validTo' in okTerms.terms), 'terms body (no validTo when empty)');
assert(!buildDiscountAgreementTerms({ unitPricePesos: '', barterMultiplier: '2', validFrom: '2026-11-01', validTo: '', notes: '' }).ok, 'value required');
assert(!buildDiscountAgreementTerms({ unitPricePesos: '1', barterMultiplier: 'x', validFrom: '2026-11-01', validTo: '', notes: '' }).ok, 'multiplier validated');
assert(!buildDiscountAgreementTerms({ unitPricePesos: '1', barterMultiplier: '2', validFrom: '2026-11-02', validTo: '2026-11-01', notes: '' }).ok, 'validTo ≥ validFrom');

// ── New agreement route: GASTRO requires local + discount; ACTIVITY unchanged ──
assert(resolveGastroAgreementCreateTarget('GASTRO', 'p1', '') === null, 'GASTRO without discount → cannot submit (no profile-scoped create)');
assert(
  JSON.stringify(resolveGastroAgreementCreateTarget('GASTRO', 'p1', 'd1')) === JSON.stringify({ gastroProfileId: 'p1', gastroDiscountId: 'd1' }),
  'GASTRO target = local + discount',
);
assert(
  JSON.stringify(resolveGastroAgreementCreateTarget('ACTIVITY', 'op1', '')) === JSON.stringify({ excursionOperatorId: 'op1' }),
  'ACTIVITY target = operator (unchanged)',
);

// ── Cache: one discount history never shared with another ──
assert(
  JSON.stringify(adminBenefitAgreementsKeys.discountHistory('d1')) !== JSON.stringify(adminBenefitAgreementsKeys.discountHistory('d2')),
  'discount history cache key A ≠ B',
);

console.log('\nAll G10.B discount contract UI checks passed.');

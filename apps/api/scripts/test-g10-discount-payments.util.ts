/**
 * G10.D — exact discount payments: pure helpers, contracts and source guards (no DB).
 * Run: pnpm --filter api run test:g10-discount-payments
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ErrorCode,
  allocateBenefitSettlementUsagesBodySchema,
  assertDiscountTransferWouldNotOverpay,
  gastroDiscountPendingValidationSchema,
  benefitSettlementTransferDtoSchema,
  checkDiscountCashOverpayment,
  checkTransferDiscountScopeMismatch,
  computeDiscountCashDueCents,
  computeDiscountCashPaidCents,
  mapBenefitSettlementErrorMessage,
  registerBenefitSettlementTransferBodySchema,
  resolveBenefitTransferAttribution,
  resolveBenefitTransferDiscountRequirement,
  resolveDiscountTransferMaxCents,
} from '@yo-te-invito/shared';

let failures = 0;
function check(cond: boolean, msg: string) {
  if (!cond) {
    failures += 1;
    console.error('FAIL:', msg);
    return;
  }
  console.log('OK:', msg);
}

const src = (rel: string) => readFileSync(join(__dirname, '..', rel), 'utf8');

// ── D1 — discount CASH due / paid ──
const allocations = [
  { mode: 'CASH', baseAmountCents: 500000n, validationId: 'a1' },
  { mode: 'CASH', baseAmountCents: 500000n, validationId: 'a2' },
  { mode: 'BARTER', baseAmountCents: 500000n, validationId: 'a3' },
  { mode: 'CASH', baseAmountCents: 700000n, validationId: 'b1' },
];
const ofA = new Set(['a1', 'a2', 'a3']);
check(computeDiscountCashDueCents(allocations, ofA) === 1000000n, 'due(A) = CASH allocations of A only (BARTER and B excluded)');
check(computeDiscountCashDueCents(allocations, new Set()) === 0n, 'due = 0 for a discount without CASH in the settlement');

const transfers = [
  { amountCents: 300000n, reversedAt: null, gastroDiscountId: 'A' },
  { amountCents: 200000n, reversedAt: new Date(), gastroDiscountId: 'A' },
  { amountCents: 400000n, reversedAt: null, gastroDiscountId: 'B' },
  { amountCents: 100000n, reversedAt: null, gastroDiscountId: null },
];
check(computeDiscountCashPaidCents(transfers, 'A') === 300000n, 'paid(A) = active attributed transfers only (reversed, B and legacy excluded)');
check(assertDiscountTransferWouldNotOverpay(1000000n, 300000n, 700000n), 'exact remaining accepted');
check(!assertDiscountTransferWouldNotOverpay(1000000n, 300000n, 700001n), 'remaining + 1 cent rejected');
check(
  resolveDiscountTransferMaxCents({ discountCashDueCents: 1000000n, discountCashPaidCents: 300000n, settlementCashOutstandingCents: 500000n }) === 500000n,
  'max = min(discount remaining, settlement outstanding)',
);
check(
  resolveDiscountTransferMaxCents({ discountCashDueCents: 1000000n, discountCashPaidCents: 1000000n, settlementCashOutstandingCents: 900000n }) === 0n,
  'max = 0 when the discount is fully paid',
);

// ── D-G10-7 — requirement per vertical + attribution ──
check(resolveBenefitTransferDiscountRequirement('GASTRO', undefined) === 'DISCOUNT_REQUIRED', 'GASTRO without discount → required');
check(resolveBenefitTransferDiscountRequirement('GASTRO', 'd1') === 'OK', 'GASTRO with discount → OK');
check(resolveBenefitTransferDiscountRequirement('ACTIVITY', undefined) === 'OK', 'ACTIVITY without discount → OK (unchanged)');
check(resolveBenefitTransferDiscountRequirement('ACTIVITY', 'd1') === 'DISCOUNT_NOT_ALLOWED', 'ACTIVITY with discount → rejected');
check(resolveBenefitTransferAttribution(null) === 'SETTLEMENT_LEVEL' && resolveBenefitTransferAttribution('d1') === 'EXACT', 'attribution EXACT / SETTLEMENT_LEVEL');

// ── Contract ──
const body = { amountCents: '100', currency: 'ARS', transferredAt: '2026-11-25T15:00:00.000Z' };
check(registerBenefitSettlementTransferBodySchema.safeParse({ ...body, gastroDiscountId: 'd1' }).success, 'body accepts gastroDiscountId');
check(registerBenefitSettlementTransferBodySchema.safeParse(body).success, 'body without gastroDiscountId still parses (ACTIVITY)');
check(!registerBenefitSettlementTransferBodySchema.safeParse({ ...body, gastroDiscountId: '  ' }).success, 'blank gastroDiscountId rejected');
check(
  benefitSettlementTransferDtoSchema.shape.attribution != null && benefitSettlementTransferDtoSchema.shape.gastroDiscountId != null,
  'transfer DTO exposes gastroDiscountId + attribution',
);
check(
  mapBenefitSettlementErrorMessage({ code: ErrorCode.BENEFIT_SETTLEMENT_DISCOUNT_CASH_OVERPAYMENT }).includes('descuento'),
  'overpayment error has discount-specific copy',
);

// ── Write path source guards (same transaction: Serializable + FOR UPDATE) ──
const service = src('src/modules/benefit-settlements/benefit-settlement-transfers.service.ts');
const registerBlock = service.slice(service.indexOf('async register('), service.indexOf('async reverse('));
check(registerBlock.includes('FOR UPDATE') && service.includes('TransactionIsolationLevel.Serializable'), 'register: Serializable + FOR UPDATE settlement');
check(
  registerBlock.indexOf('assertDiscountTransferAllowed') > registerBlock.indexOf('FOR UPDATE') &&
    registerBlock.indexOf('assertDiscountTransferAllowed') < registerBlock.indexOf('benefitSettlementTransfer.create'),
  'register: discount guard runs inside the locked transaction, before the insert',
);
check(registerBlock.includes('assertTransferWouldNotOverpay'), 'register: settlement-level guard kept');
check(!service.includes('.delete(') && !service.includes('deleteMany'), 'transfers are never deleted (reversal is append-only)');
check(/gastroDiscountId: updated\.gastroDiscountId/.test(service), 'reverse audit includes gastroDiscountId');

// ── D2 — allocation isolation contract + per-discount pending list ──
const alloc = { mode: 'CASH' as const, validationIds: ['v1'] };
check(allocateBenefitSettlementUsagesBodySchema.safeParse({ ...alloc, gastroDiscountId: 'd1' }).success, 'allocate accepts gastroDiscountId with explicit validationIds');
check(!allocateBenefitSettlementUsagesBodySchema.safeParse({ mode: 'CASH', count: 2, gastroDiscountId: 'd1' }).success, 'allocate rejects gastroDiscountId with count (explicit selection only)');
check(allocateBenefitSettlementUsagesBodySchema.safeParse({ mode: 'BARTER', count: 2 }).success, 'allocate by count still parses (settlement page)');
check(
  gastroDiscountPendingValidationSchema.shape.pricingStatus.options.join(',') === 'PRICED,MISSING_AGREEMENT,FUNDED_COURTESY',
  'pending list pricing statuses',
);
const adminController = src('src/modules/admin/admin.controller.ts');
check(adminController.includes("@Get('gastronomicos/:profileId/descuentos/:discountId/pending-validations')"), 'route: ADMIN GET discount pending-validations');
const pendingService = src('src/modules/benefit-settlements/gastro-discount-pending-validations.service.ts');
check(pendingService.includes('discoverEligibleValidations') && !pendingService.includes('resolveSettlementAgreementForValidation'), 'pending list reuses the allocate pricing engine (no re-implementation)');
const settlementsService = src('src/modules/benefit-settlements/benefit-settlements.service.ts');
const allocateBlock = settlementsService.slice(settlementsService.indexOf('async allocate('), settlementsService.indexOf('async close('));
check(allocateBlock.indexOf('assertValidationsBelongToDiscount') < allocateBlock.indexOf('$transaction'), 'allocate: discount isolation checked before any write');

// ── D5 — integrity (pure) ──
check(checkDiscountCashOverpayment({ settlementId: 's', gastroDiscountId: 'A', discountCashDueCents: 100n, discountCashPaidCents: 100n }) === null, 'integrity: paid = due → OK');
check(checkDiscountCashOverpayment({ settlementId: 's', gastroDiscountId: 'A', discountCashDueCents: 100n, discountCashPaidCents: 101n })?.code === 'DISCOUNT_CASH_OVERPAYMENT', 'integrity: paid > due → DISCOUNT_CASH_OVERPAYMENT');
const scope = { transferId: 't', settlementVertical: 'GASTRO' as const, settlementGastroProfileId: 'pA', gastroDiscountId: 'A', discountExists: true, discountGastroProfileId: 'pA' };
check(checkTransferDiscountScopeMismatch(scope) === null, 'integrity: discount of the settlement local → OK');
check(checkTransferDiscountScopeMismatch({ ...scope, gastroDiscountId: null }) === null, 'integrity: legacy transfer never flagged by scope check');
check(checkTransferDiscountScopeMismatch({ ...scope, discountGastroProfileId: 'pB' })?.code === 'TRANSFER_DISCOUNT_SCOPE_MISMATCH', 'integrity: discount of another local → TRANSFER_DISCOUNT_SCOPE_MISMATCH');
check(checkTransferDiscountScopeMismatch({ ...scope, discountExists: false })?.code === 'TRANSFER_DISCOUNT_SCOPE_MISMATCH', 'integrity: missing discount → TRANSFER_DISCOUNT_SCOPE_MISMATCH');
check(checkTransferDiscountScopeMismatch({ ...scope, settlementVertical: 'ACTIVITY' })?.code === 'TRANSFER_DISCOUNT_SCOPE_MISMATCH', 'integrity: ACTIVITY transfer with discount → mismatch');
const integrityService = src('src/modules/benefit-settlements/benefit-settlement-integrity.service.ts');
check(integrityService.includes('this.checkDiscountTransfers(tenantId, row)'), 'integrity service runs the discount transfer checks');

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nAll G10.D pure checks passed.');

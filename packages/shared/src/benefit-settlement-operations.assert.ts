import {
  formatBarterMultiplierLabel,
  groupPendingValidationsByBenefit,
  groupSettlementAllocationsByRate,
  previewAllocationSelection,
  selectPendingUsagesForAllocation,
  type SettlementAllocationLike,
} from './benefit-settlement-operations';
import { allocateBenefitSettlementUsagesBodySchema } from './schemas/benefit-settlements';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

const usage = (
  mode: 'CASH' | 'BARTER',
  agreementId = 'ag-1',
  unit = '500000',
  mult = '2.0000',
  materialized?: string,
): SettlementAllocationLike => ({
  mode,
  agreementId,
  unitPriceCents: unit,
  barterMultiplier: mult,
  baseAmountCents: unit,
  creditMaterializedCents: materialized,
});

// MIXED: 20 uses → 10 CASH + 10 BARTER at $5.000, ×2
const mixed = [
  ...Array.from({ length: 10 }, () => usage('CASH')),
  ...Array.from({ length: 10 }, () => usage('BARTER', 'ag-1', '500000', '2.0000', '1000000')),
];
const cash = groupSettlementAllocationsByRate(mixed, 'CASH');
assert(cash.length === 1 && cash[0]!.usageCount === 10, 'cash 10 uses');
assert(cash[0]!.baseAmountCents === '5000000', 'cash base $50.000');
assert(cash[0]!.creditExpectedCents === '0', 'cash has no credit');

const barter = groupSettlementAllocationsByRate(mixed, 'BARTER');
assert(barter.length === 1 && barter[0]!.usageCount === 10, 'barter 10 uses');
assert(barter[0]!.baseAmountCents === '5000000', 'barter base $50.000');
assert(barter[0]!.creditExpectedCents === '10000000', 'barter credit $100.000 (×2)');
assert(barter[0]!.creditMaterializedCents === '10000000', 'materialized matches ledger');

// Historical snapshots: new agreement after replacement → separate segment, old kept
const history = [
  usage('BARTER', 'ag-old', '500000', '2.0000'),
  usage('BARTER', 'ag-new', '700000', '1.5000'),
  usage('BARTER', 'ag-old', '500000', '2.0000'),
];
const segs = groupSettlementAllocationsByRate(history, 'BARTER');
assert(segs.length === 2, 'two snapshot segments');
const old = segs.find((s) => s.agreementId === 'ag-old')!;
assert(old.usageCount === 2 && old.unitPriceCents === '500000', 'old snapshot preserved');
assert(old.creditExpectedCents === '2000000', 'old credit uses old multiplier');
const neu = segs.find((s) => s.agreementId === 'ag-new')!;
assert(neu.creditExpectedCents === '1050000', 'new credit 7000 × 1.5');

assert(groupSettlementAllocationsByRate([], 'CASH').length === 0, 'empty');
assert(formatBarterMultiplierLabel('2.0000') === '×2', 'mult ×2');
assert(formatBarterMultiplierLabel('1.5000') === '×1.5', 'mult ×1.5');
assert(formatBarterMultiplierLabel('1.2500') === '×1.25', 'mult ×1.25');

// Pending validations grouped by discount (UX only)
const pending = [
  { validationId: 'v1', benefitId: 'disc-a', benefitTitle: 'A', unitPriceCents: '500000' },
  { validationId: 'v2', benefitId: 'disc-b', benefitTitle: 'B', unitPriceCents: '500000' },
  { validationId: 'v3', benefitId: 'disc-a', benefitTitle: 'A', unitPriceCents: '500000' },
];
const groups = groupPendingValidationsByBenefit(pending);
const groupA = groups.find((g) => g.benefitId === 'disc-a')!;
assert(groupA.items.length === 2 && groupA.baseAmountCents === '1000000', 'discount A group');
assert(!groupA.items.some((i) => i.validationId === 'v2'), 'discount A does not include validation of B');
const focused = groupPendingValidationsByBenefit(pending, 'disc-b');
assert(focused[0]!.benefitId === 'disc-b' && focused.length === 2, 'focus first, others kept');

// Allocation selection (G7.12.3)
const pendingA = [
  { validationId: 'a1', unitPriceCents: '500000', barterMultiplier: '2.0000' },
  { validationId: 'a2', unitPriceCents: '500000', barterMultiplier: '2.0000' },
  { validationId: 'a3', unitPriceCents: '500000', barterMultiplier: '2.0000' },
];
const oldest = selectPendingUsagesForAllocation(pendingA, { count: 2 });
assert(oldest.ok && oldest.selected.map((s) => s.validationId).join() === 'a1,a2', 'count oldest-first');
const tooMany = selectPendingUsagesForAllocation(pendingA, { count: 4 });
assert(!tooMany.ok && tooMany.reason === 'INSUFFICIENT', 'count > pending rejected');
const explicit = selectPendingUsagesForAllocation(pendingA, { validationIds: ['a3', 'a1'] });
assert(
  explicit.ok && explicit.selected.map((s) => s.validationId).join() === 'a1,a3',
  'explicit ids keep pending order',
);
const foreign = selectPendingUsagesForAllocation(pendingA, { validationIds: ['a1', 'partner-b-v1'] });
assert(
  !foreign.ok && foreign.reason === 'NOT_PENDING' && foreign.invalidIds.join() === 'partner-b-v1',
  'validation of partner B rejected for settlement A',
);
const dup = selectPendingUsagesForAllocation(pendingA, { validationIds: ['a2', 'a2'] });
assert(dup.ok && dup.selected.length === 1, 'duplicate ids allocate once');

const previewBarter = previewAllocationSelection(pendingA.slice(0, 2), 'BARTER');
assert(previewBarter.baseAmountCents === '1000000', 'preview base');
assert(previewBarter.creditExpectedCents === '2000000', 'preview credit ×2');
const previewCash = previewAllocationSelection(pendingA, 'CASH');
assert(previewCash.creditExpectedCents === '0' && previewCash.count === 3, 'cash preview no credit');

const okIds = allocateBenefitSettlementUsagesBodySchema.safeParse({ mode: 'CASH', validationIds: ['a1'] });
const okCount = allocateBenefitSettlementUsagesBodySchema.safeParse({ mode: 'BARTER', count: 2 });
const both = allocateBenefitSettlementUsagesBodySchema.safeParse({
  mode: 'CASH',
  count: 1,
  validationIds: ['a1'],
});
const neither = allocateBenefitSettlementUsagesBodySchema.safeParse({ mode: 'CASH' });
const extra = allocateBenefitSettlementUsagesBodySchema.safeParse({
  mode: 'CASH',
  count: 1,
  discountId: 'd',
});
assert(okIds.success && okCount.success, 'xor accepted');
assert(!both.success && !neither.success, 'count xor validationIds');
assert(!extra.success, 'no discountId in allocation body');

console.log('OK: settlement rate segments (CASH/BARTER/mixed/snapshots) + pending grouping + selection');

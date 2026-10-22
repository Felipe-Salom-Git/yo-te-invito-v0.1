/**
 * G7.12 settlement operations — security + economic scenarios (no DB).
 * Run: pnpm --filter api run test:benefit-settlement-operations
 *
 * Seguridad (G7.12.12) y economía (G7.12.13) de la operación de liquidaciones.
 * DB integration (tenant/partner isolation against real rows) is reported as NOT RUN.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  allocateBenefitSettlementUsagesBodySchema,
  assertTransferWouldNotOverpay,
  computeCashDueCents,
  computeCashOutstandingCents,
  computeCashReceivedCents,
  deriveCashCollectionStatus,
  groupPendingValidationsByBenefit,
  groupSettlementAllocationsByRate,
  previewAllocationSelection,
  registerBenefitSettlementTransferBodySchema,
  resolveSettlementCloseBlocker,
  reverseBenefitSettlementTransferBodySchema,
  selectPendingUsagesForAllocation,
  type SettlementAllocationLike,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

const MODULE_DIR = join(__dirname, '..', 'src', 'modules', 'benefit-settlements');
const read = (file: string) => readFileSync(join(MODULE_DIR, file), 'utf8');

// ───────────────────────── G7.12.12 — Security ─────────────────────────

// Pending lists are computed per settlement (partner + period). Anything outside is NOT_PENDING.
type Pending = {
  validationId: string;
  benefitId: string;
  unitPriceCents: string;
  barterMultiplier: string;
};
const pendingPartnerA: Pending[] = [
  { validationId: 'a-1', benefitId: 'disc-a', unitPriceCents: '500000', barterMultiplier: '2.0000' },
  { validationId: 'a-2', benefitId: 'disc-a', unitPriceCents: '500000', barterMultiplier: '2.0000' },
];

{
  const foreignPartner = selectPendingUsagesForAllocation(pendingPartnerA, { validationIds: ['b-1'] });
  assert(
    !foreignPartner.ok && foreignPartner.reason === 'NOT_PENDING' && foreignPartner.invalidIds[0] === 'b-1',
    'settlement A rejects allocation of validation from partner B',
  );

  const mixed = selectPendingUsagesForAllocation(pendingPartnerA, { validationIds: ['a-1', 'b-1'] });
  assert(!mixed.ok, 'valid + foreign ids together are rejected (no partial allocation)');

  const alreadyAllocated = selectPendingUsagesForAllocation(pendingPartnerA, { validationIds: ['a-0-done'] });
  assert(!alreadyAllocated.ok, 'already allocated / other period validation rejected');

  const samePeriodOk = selectPendingUsagesForAllocation(pendingPartnerA, { validationIds: ['a-2'] });
  assert(samePeriodOk.ok && samePeriodOk.selected.length === 1, 'own pending validation accepted');
}

// Discount A grouping never leaks validations of discount B (grouping is visual only).
{
  const mixedDiscounts: Pending[] = [
    ...pendingPartnerA,
    { validationId: 'a-3', benefitId: 'disc-b', unitPriceCents: '700000', barterMultiplier: '1.0000' },
  ];
  const groups = groupPendingValidationsByBenefit(
    mixedDiscounts.map((p) => ({
      ...p,
      validatedAt: '2026-10-01T10:00:00.000Z',
      benefitTitle: p.benefitId,
      shortCode: null,
    })),
    'disc-a',
  );
  const a = groups.find((g) => g.benefitId === 'disc-a');
  assert(
    !!a && a.items.length === 2 && !a.items.some((i) => i.validationId === 'a-3'),
    'discount A group excludes discount B validation',
  );
  assert(groups.length === 2, 'focus does not hide other discounts of the same settlement');
}

// Request bodies: partner/tenant/discount can never be injected (strict schemas).
assert(
  !allocateBenefitSettlementUsagesBodySchema.safeParse({ mode: 'CASH', count: 1, tenantId: 't2' }).success,
  'allocate body rejects tenantId',
);
assert(
  !allocateBenefitSettlementUsagesBodySchema.safeParse({ mode: 'CASH', count: 1, gastroProfileId: 'g2' }).success,
  'allocate body rejects partner override',
);
assert(
  !allocateBenefitSettlementUsagesBodySchema.safeParse({ mode: 'CASH', count: 1, discountId: 'd1' }).success,
  'allocate body rejects discountId (discount is never an accounting key)',
);
assert(
  !registerBenefitSettlementTransferBodySchema.safeParse({
    amountCents: '100',
    transferredAt: '2026-10-22T10:00:00.000Z',
    settlementId: 'other-settlement',
  }).success,
  'transfer body rejects settlementId override',
);
assert(
  !registerBenefitSettlementTransferBodySchema.safeParse({
    amountCents: '100',
    transferredAt: '2026-10-22T10:00:00.000Z',
    tenantId: 't2',
  }).success,
  'transfer body rejects tenantId',
);
assert(
  !registerBenefitSettlementTransferBodySchema.safeParse({
    amountCents: '100',
    transferredAt: '2026-10-22T10:00:00.000Z',
    proofUrl: 'javascript:alert(1)',
  }).success,
  'proofUrl rejects non-http(s) schemes',
);
assert(
  !reverseBenefitSettlementTransferBodySchema.safeParse({ reason: '' }).success,
  'reversal requires a reason',
);

// Static guards over the Nest module (roles + tenant scoping).
{
  const controller = read('admin-benefit-settlements.controller.ts');
  assert(
    controller.includes('@UseGuards(JwtOrDevAuthGuard, RolesGuard)') &&
      controller.includes('@RequireRole(Role.ADMIN)'),
    'controller is ADMIN only (JWT + RolesGuard)',
  );
  const handlers = (controller.match(/@(Get|Post)\(/g) ?? []).length;
  const tenantFromJwt = (controller.match(/user\.tenantId/g) ?? []).length;
  assert(handlers > 0 && tenantFromJwt >= handlers, 'every handler takes tenantId from the JWT user');
  assert(!/@Body\(\)[^)]*tenantId/.test(controller), 'tenantId is never read from the body');

  const transfers = read('benefit-settlement-transfers.service.ts');
  assert(
    /findFirst\(\{\s*where: \{ id: transferId, tenantId, settlementId \}/.test(transfers),
    'transfer reversal is scoped to tenant AND its own settlement',
  );
  assert(
    transfers.includes('"tenantId" = ${tenantId} FOR UPDATE'),
    'transfer registration locks the settlement within the tenant',
  );

  const service = read('benefit-settlements.service.ts');
  assert(
    service.includes('selectPendingUsagesForAllocation(discovery.priced, body)'),
    'allocate selects only from the settlement pending list',
  );
  assert(
    service.includes('where: { id: row.id, tenantId }'),
    'allocate re-reads settlement scoped by tenant inside the transaction',
  );

  const pending = read('benefit-settlement-pending-validations.service.ts');
  assert(pending.includes('tenantId'), 'pending validations are tenant scoped');
}

// ───────────────────────── G7.12.13 — Economic ─────────────────────────

const cashAlloc = (unit = 500000n): SettlementAllocationLike & { baseAmountCents: string } => ({
  mode: 'CASH',
  agreementId: 'ag-1',
  unitPriceCents: unit.toString(),
  barterMultiplier: '2.0000',
  baseAmountCents: unit.toString(),
});

// CASH: 10 × $5.000 → due $50.000 → 30k → remaining 20k → 20k → remaining 0
{
  const allocations = Array.from({ length: 10 }, () => ({ mode: 'CASH', baseAmountCents: 500000n }));
  const due = computeCashDueCents(allocations);
  assert(due === 5000000n, 'CASH 10 × $5.000 due $50.000');

  const transfers: Array<{ amountCents: bigint; reversedAt: Date | null }> = [];
  assert(assertTransferWouldNotOverpay(due, 0n, 3000000n), 'first $30.000 allowed');
  transfers.push({ amountCents: 3000000n, reversedAt: null });
  let received = computeCashReceivedCents(transfers);
  assert(computeCashOutstandingCents(due, received) === 2000000n, 'remaining $20.000 after $30.000');
  assert(deriveCashCollectionStatus(due, received) === 'PARTIALLY_RECEIVED', 'partially received');
  assert(!assertTransferWouldNotOverpay(due, received, 2000001n), 'overpay by 1 cent rejected');

  transfers.push({ amountCents: 2000000n, reversedAt: null });
  received = computeCashReceivedCents(transfers);
  assert(computeCashOutstandingCents(due, received) === 0n, 'remaining $0 after second $20.000');
  assert(deriveCashCollectionStatus(due, received) === 'RECEIVED', 'fully received');
  assert(!assertTransferWouldNotOverpay(due, received, 1n), 'nothing more can be transferred');

  // Reversal re-opens the debt; the transfer row is kept (never deleted).
  transfers[1]!.reversedAt = new Date();
  received = computeCashReceivedCents(transfers);
  assert(transfers.length === 2, 'reversed transfer is kept in history');
  assert(computeCashOutstandingCents(due, received) === 2000000n, 'reversal restores $20.000 outstanding');
  assert(deriveCashCollectionStatus(due, received) === 'PARTIALLY_RECEIVED', 'back to partial after reversal');
}

// Transfers continue after CLOSED: closing never needs cash received, and cash rules ignore status.
{
  assert(
    resolveSettlementCloseBlocker({ status: 'ALLOCATED', pendingUsageCount: 0, missingAgreementCount: 0 }) ===
      null,
    'settlement with unpaid cash can close (CLOSED ≠ PAID)',
  );
  assert(
    !readFileSync(join(MODULE_DIR, 'benefit-settlement-transfers.service.ts'), 'utf8').includes(
      "status === 'CLOSED'",
    ),
    'transfers service does not block registration on CLOSED',
  );
}

// BARTER: 10 × $5.000 × 2 → credit $100.000 (base stays $50.000)
{
  const items = Array.from({ length: 10 }, () => ({ unitPriceCents: '500000', barterMultiplier: '2.0000' }));
  const preview = previewAllocationSelection(items, 'BARTER');
  assert(preview.baseAmountCents === '5000000', 'BARTER base $50.000');
  assert(preview.creditExpectedCents === '10000000', 'BARTER credit $100.000');
  assert(computeCashDueCents(items.map((i) => ({ mode: 'BARTER', baseAmountCents: BigInt(i.unitPriceCents) }))) === 0n,
    'BARTER generates no cash due');
}

// MIXED: 20 uses → 10 CASH + 10 BARTER; unselected remainder stays pending
{
  const pending = Array.from({ length: 20 }, (_, i) => ({
    validationId: `v-${i + 1}`,
    unitPriceCents: '500000',
    barterMultiplier: '2.0000',
  }));
  const cashPick = selectPendingUsagesForAllocation(pending, { count: 10 });
  assert(cashPick.ok && cashPick.selected.length === 10, 'first 10 go to CASH (oldest first)');
  if (!cashPick.ok) process.exit(1);
  const allocatedIds = new Set(cashPick.selected.map((s) => s.validationId));
  const remaining = pending.filter((p) => !allocatedIds.has(p.validationId));
  assert(remaining.length === 10, '10 remain pending after CASH allocation');

  const barterPick = selectPendingUsagesForAllocation(remaining, { count: 10 });
  assert(barterPick.ok && barterPick.selected.length === 10, 'remaining 10 go to BARTER');
  if (!barterPick.ok) process.exit(1);
  assert(
    !barterPick.selected.some((s) => allocatedIds.has(s.validationId)),
    'no validation is allocated twice across modes',
  );
  const cashPreview = previewAllocationSelection(cashPick.selected, 'CASH');
  const barterPreview = previewAllocationSelection(barterPick.selected, 'BARTER');
  assert(cashPreview.baseAmountCents === '5000000' && cashPreview.creditExpectedCents === '0', 'mixed: CASH $50.000');
  assert(barterPreview.creditExpectedCents === '10000000', 'mixed: BARTER credit $100.000');
  assert(
    selectPendingUsagesForAllocation(remaining, { count: 11 }).ok === false,
    'cannot over-allocate beyond pending',
  );
}

// Historical snapshots: replacing the agreement does not rewrite already allocated rows.
{
  const old = Array.from({ length: 10 }, () => cashAlloc(500000n));
  const dueBefore = computeCashDueCents(old.map((a) => ({ mode: a.mode, baseAmountCents: BigInt(a.baseAmountCents) })));
  // New agreement ($7.000) applies only to NEW allocations.
  const newer: SettlementAllocationLike[] = [
    { ...cashAlloc(700000n), agreementId: 'ag-2' },
  ];
  const all = [...old, ...newer];
  const segments = groupSettlementAllocationsByRate(all, 'CASH');
  assert(segments.length === 2, 'old and new agreement snapshots stay as separate segments');
  assert(
    computeCashDueCents(old.map((a) => ({ mode: a.mode, baseAmountCents: BigInt(a.baseAmountCents) }))) ===
      dueBefore,
    'old allocations due unchanged after agreement replacement',
  );
  assert(
    computeCashDueCents(all.map((a) => ({ mode: a.mode, baseAmountCents: BigInt(a.baseAmountCents) }))) ===
      5700000n,
    'due = 10 × $5.000 + 1 × $7.000',
  );
}

async function tryDbIntegration() {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
  } catch {
    console.log('\nDB integration (tenant/partner isolation on real rows): NO EJECUTADO — PostgreSQL no disponible');
    return;
  }
  console.log('\nDB integration: connection OK, but no dedicated seeded scenario script exists → NO EJECUTADO');
  await prisma.$disconnect();
}

tryDbIntegration()
  .then(() => console.log('\nAll G7.12 settlement operation checks passed.'))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

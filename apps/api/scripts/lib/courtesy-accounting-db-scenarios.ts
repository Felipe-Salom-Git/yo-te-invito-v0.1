/**
 * G8.11.13 — economic scenarios A–H against real PostgreSQL with the real Nest services.
 * Isolated tenant; removed at the end (even on failure).
 */

import { ErrorCode } from '@yo-te-invito/shared';
import { PrismaService } from '../../src/prisma/prisma.service';
import { codeOf, errorOf } from './courtesy-fake-db';
import {
  buildServices,
  cleanupTenant,
  createAgreement,
  createRedeemedBenefit,
  seedTenant,
  type Seed,
} from './courtesy-accounting-db-seed';

type Check = (cond: boolean, msg: string) => void;

const FUNDED = ErrorCode.BENEFIT_SETTLEMENT_VALIDATION_FUNDED_COURTESY;

export async function runCourtesyAccountingDbScenarios(check: Check): Promise<'PASS' | 'NOT_RUN'> {
  const prisma = new PrismaService();
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    console.log('\nDB integration: NOT RUN — PostgreSQL no disponible');
    return 'NOT_RUN';
  }

  let seed: Seed | null = null;
  try {
    seed = await seedTenant(prisma);
    await runScenarios(prisma, seed, check);
    return 'PASS';
  } finally {
    if (seed) await cleanupTenant(prisma, seed.tenantId);
    await prisma.$disconnect();
  }
}

async function runScenarios(prisma: PrismaService, seed: Seed, check: Check) {
  const svc = buildServices(prisma);
  const actor = { id: seed.adminId, role: 'ADMIN' };
  const { tenantId, profileA, profileB } = seed;
  const A = { profileId: profileA, eventId: seed.eventA };
  const B = { profileId: profileB, eventId: seed.eventB };

  const agreementA = await createAgreement(prisma, seed, profileA, {
    unitPriceCents: 500000n,
    barterMultiplier: '2',
    validFrom: '2026-01-01T03:00:00.000Z',
  });
  await createAgreement(prisma, seed, profileB, {
    unitPriceCents: 500000n,
    barterMultiplier: '2',
    validFrom: '2026-01-01T03:00:00.000Z',
  });

  const balanceA = async () =>
    BigInt(
      (await svc.ledger.getPartnerBalance(tenantId, { vertical: 'GASTRO', gastroProfileId: profileA, currency: 'ARS' }))
        .balanceAvailableCents,
    );
  const countEntries = (type: 'CREDIT_FROM_SETTLEMENT' | 'DEBIT_COURTESY') =>
    prisma.courtesyCreditLedgerEntry.count({ where: { tenantId, type } });
  const generate = (gastroProfileId: string, periodKey: string) =>
    svc.settlements.generate(tenantId, actor, { vertical: 'GASTRO', gastroProfileId, periodKey });

  // ── Caso A — normal discount 10 × $5.000 → eligible → CASH ──
  const n1 = await createRedeemedBenefit(prisma, seed, { ...A, kind: 'DISCOUNT', uses: 10, validatedAt: '2026-06-10T15:00:00.000Z' });
  const s1 = await generate(profileA, '2026-06');
  check(s1.summary.pendingUsageCount === 10, 'A: normal discount 10 uses pending');
  const a1 = await svc.settlements.allocate(tenantId, actor, s1.id, { mode: 'CASH', count: 10 });
  check(a1.settlement.summary.cashDueCents === '5000000', 'A: CASH due $50.000');
  check(n1.validationIds.every((id) => a1.allocations.some((x) => x.validationId === id)), 'A: all normal uses allocated');

  // ── Caso B — non-funded courtesy 10 × $5.000 → CASH base $50.000 + snapshot ──
  const c1 = await createRedeemedBenefit(prisma, seed, { ...A, kind: 'COURTESY', uses: 10, validatedAt: '2026-07-10T15:00:00.000Z' });
  const s2 = await generate(profileA, '2026-07');
  check(s2.summary.pendingUsageCount === 10 && s2.summary.fundedCourtesyUsageCount === 0, 'B: non-funded courtesy is eligible');
  const a2 = await svc.settlements.allocate(tenantId, actor, s2.id, { mode: 'CASH', validationIds: c1.validationIds });
  check(a2.settlement.summary.cashBaseAmountCents === '5000000', 'B: courtesy CASH base $50.000');
  check(a2.settlement.summary.cashDueCents === '5000000', 'B: courtesy CASH due $50.000');
  const snapRows = await prisma.benefitSettlementUsageAllocation.findMany({ where: { settlementId: s2.id } });
  check(
    snapRows.length === 10 &&
      snapRows.every(
        (r) =>
          r.agreementId === agreementA.id &&
          r.unitPriceCents === 500000n &&
          r.barterMultiplier.toString() === agreementA.barterMultiplier.toString() &&
          r.baseAmountCents === 500000n &&
          r.currency === 'ARS',
      ),
    'G8.11.7: courtesy allocation snapshots agreementId/unitPrice/multiplier/base/currency',
  );

  // ── Caso C — non-funded courtesy BARTER 10 × $5.000 × 2 → credit $100.000 ──
  const c2 = await createRedeemedBenefit(prisma, seed, { ...A, kind: 'COURTESY', uses: 10, validatedAt: '2026-08-10T15:00:00.000Z' });
  const s3 = await generate(profileA, '2026-08');
  const a3 = await svc.settlements.allocate(tenantId, actor, s3.id, { mode: 'BARTER', count: 10 });
  check(a3.settlement.summary.barterBaseAmountCents === '5000000', 'C: BARTER base $50.000');
  check(a3.settlement.summary.barterCreditMaterializedCents === '10000000', 'C: credit $100.000 materialized');
  check((await balanceA()) === 10000000n, 'C: partner balance $100.000');
  check(c2.validationIds.length === 10, 'C: 10 courtesy validations');

  // ── Caso D — funded courtesy: $100.000 → fund $40.000 → $60.000; validated but NOT eligible ──
  const creditsBeforeFunding = await countEntries('CREDIT_FROM_SETTLEMENT');
  const f = await createRedeemedBenefit(prisma, seed, {
    ...A,
    kind: 'COURTESY',
    uses: 10,
    validatedAt: '2026-09-05T15:00:00.000Z',
    fundWith: { ledger: svc.ledger, imputedValueCents: 4000000n },
  });
  check((await balanceA()) === 6000000n, 'D: balance $60.000 after funding (validations did not debit again)');
  check((await countEntries('DEBIT_COURTESY')) === 1, 'G8.11.11: campaign funded once → one DEBIT_COURTESY');
  const refund = await prisma.$transaction((tx) =>
    svc.ledger.debitForGastroCourtesyCampaign(tx, {
      tenantId,
      gastroProfileId: profileA,
      campaignId: f.campaignId!,
      imputedValueCents: 4000000n,
      currency: 'ARS',
      actorId: seed.adminId,
    }),
  );
  check(!refund.created && (await balanceA()) === 6000000n, 'G8.11.11: repeated funding is idempotent (no second debit)');
  check(f.validationIds.length === 10, 'D: funded courtesy claims redeemed → validations exist');

  // ── Caso F — MIXED settlement: normal ✅ + non-funded courtesy ✅ + funded courtesy ❌ ──
  const n2 = await createRedeemedBenefit(prisma, seed, { ...A, kind: 'DISCOUNT', uses: 3, validatedAt: '2026-09-12T15:00:00.000Z' });
  const c3 = await createRedeemedBenefit(prisma, seed, { ...A, kind: 'COURTESY', uses: 2, validatedAt: '2026-09-15T15:00:00.000Z' });
  const s4 = await generate(profileA, '2026-09');
  check(s4.summary.pendingUsageCount === 5, 'F: 3 normal + 2 non-funded courtesy pending');
  check(s4.summary.eligibleUsageCount === 5, 'F: funded courtesy not counted as eligible usage');
  check(s4.summary.fundedCourtesyUsageCount === 10, 'F: 10 funded courtesy validations reported as non-billable');
  check(s4.summary.pendingBaseAmountCents === '2500000', 'F: pending base excludes funded courtesy ($25.000)');
  const pendingList = await svc.pending.list(tenantId, s4.id);
  const pendingIds = new Set(pendingList.data.map((p) => p.validationId));
  check(pendingList.data.length === 5 && pendingList.fundedCourtesyExcludedCount === 10, 'F: pending list hides funded courtesy (count exposed)');
  check(!f.validationIds.some((id) => pendingIds.has(id)), 'F: no funded validation is selectable');

  // ── Caso E — injection: funded validation → allocation rejected (CASH and BARTER) ──
  const e1 = await errorOf(() => svc.settlements.allocate(tenantId, actor, s4.id, { mode: 'CASH', validationIds: [f.validationIds[0]!] }));
  check(codeOf(e1) === FUNDED, 'E: direct CASH allocation of funded courtesy → FUNDED_COURTESY');
  const e2 = await errorOf(() =>
    svc.settlements.allocate(tenantId, actor, s4.id, { mode: 'BARTER', validationIds: [n2.validationIds[0]!, f.validationIds[1]!] }),
  );
  check(codeOf(e2) === FUNDED, 'E: mixed BARTER selection with funded courtesy → rejected as a whole');
  const e3 = await errorOf(() => svc.settlements.allocate(tenantId, actor, s4.id, { mode: 'CASH', count: 6 }));
  check(codeOf(e3) === ErrorCode.BENEFIT_SETTLEMENT_INSUFFICIENT_PENDING_USAGES, 'E: count cannot reach funded usages');
  check((await prisma.benefitSettlementUsageAllocation.count({ where: { settlementId: s4.id } })) === 0, 'E: nothing allocated after rejections');
  const e4 = await errorOf(() =>
    svc.eligibility.assertNoFundedCourtesyValidations(prisma, [n2.validationIds[0]!, f.validationIds[2]!]),
  );
  check(codeOf(e4) === FUNDED, 'G8.11.3: in-transaction re-check rejects funded validation ids');

  await svc.settlements.allocate(tenantId, actor, s4.id, { mode: 'CASH', validationIds: n2.validationIds });
  const a4 = await svc.settlements.allocate(tenantId, actor, s4.id, { mode: 'BARTER', count: 2 });
  check(a4.allocations.every((x) => c3.validationIds.includes(x.validationId)), 'F: BARTER count picks non-funded courtesy only');
  check(a4.settlement.summary.cashDueCents === '1500000', 'G8.11.4: funded courtesy adds $0 to cash due');
  check(a4.settlement.summary.barterCreditMaterializedCents === '2000000', 'F: BARTER credit only from non-funded ($20.000)');
  check(
    (await prisma.benefitSettlementUsageAllocation.count({ where: { validationId: { in: f.validationIds } } })) === 0,
    'G8.11.5: funded courtesy has no allocation',
  );
  check((await countEntries('CREDIT_FROM_SETTLEMENT')) === creditsBeforeFunding + 2, 'G8.11.5: no CREDIT_FROM_SETTLEMENT from funded courtesy');
  check((await balanceA()) === 8000000n, 'F: balance $60.000 + $20.000 = $80.000');

  // ── Close / retry: no debit, no credit ──
  const closed = await svc.settlements.close(tenantId, actor, s4.id);
  check(closed.status === 'CLOSED', 'F: settlement closes with funded courtesy validations left out');
  check((await balanceA()) === 8000000n && (await countEntries('DEBIT_COURTESY')) === 1, 'G8.11.10: close does not debit again');
  check(codeOf(await errorOf(() => generate(profileA, '2026-09'))) === ErrorCode.BENEFIT_SETTLEMENT_ALREADY_CLOSED, 'G8.11.11: retry on closed settlement rejected');
  const creditsBeforeRetry = await countEntries('CREDIT_FROM_SETTLEMENT');
  await generate(profileA, '2026-08');
  await svc.settlements.refresh(tenantId, actor, s3.id);
  check((await countEntries('CREDIT_FROM_SETTLEMENT')) === creditsBeforeRetry, 'G8.11.11: settlement retry/refresh generates no credit');

  // ── Last line: legacy BARTER allocation of a funded courtesy can never materialize credit ──
  const legacy = await prisma.benefitSettlementUsageAllocation.create({
    data: {
      tenantId,
      settlementId: s4.id,
      validationSource: 'GASTRO_DISCOUNT_VALIDATION',
      validationId: f.validationIds[9]!,
      mode: 'BARTER',
      agreementId: agreementA.id,
      unitPriceCents: 500000n,
      barterMultiplier: '2',
      baseAmountCents: 500000n,
    },
  });
  const e5 = await errorOf(() =>
    prisma.$transaction((tx) =>
      svc.ledger.materializeBarterCreditForAllocation(tx, {
        tenantId,
        settlement: { vertical: 'GASTRO', gastroProfileId: profileA, excursionOperatorId: null, currency: 'ARS' },
        allocation: legacy,
        actorId: seed.adminId,
      }),
    ),
  );
  check(codeOf(e5) === FUNDED && (await balanceA()) === 8000000n, 'G8.11.5: ledger refuses credit for funded courtesy allocation');

  // ── Caso G — agreement replaced: historical allocations unchanged; new usage uses new rate ──
  await prisma.benefitCommercialAgreement.update({ where: { id: agreementA.id }, data: { validTo: new Date('2026-10-01T02:59:59.000Z') } });
  await createAgreement(prisma, seed, profileA, { unitPriceCents: 700000n, barterMultiplier: '3', validFrom: '2026-10-01T03:00:00.000Z' });
  const historical = await prisma.benefitSettlementUsageAllocation.findMany({ where: { settlementId: s2.id } });
  check(
    historical.every((r) => r.agreementId === agreementA.id && r.unitPriceCents === 500000n && r.baseAmountCents === 500000n),
    'G: old courtesy allocations keep the old snapshot',
  );
  check((await svc.settlements.get(tenantId, s2.id)).summary.cashDueCents === '5000000', 'G: old settlement due unchanged');
  await createRedeemedBenefit(prisma, seed, { ...A, kind: 'COURTESY', uses: 1, validatedAt: '2026-10-10T15:00:00.000Z' });
  const s5 = await generate(profileA, '2026-10');
  check(s5.summary.pendingBaseAmountCents === '700000', 'G: new non-funded courtesy priced with the new agreement');

  // ── Caso H — cross profile: funding campaign on A never affects B ──
  const nb = await createRedeemedBenefit(prisma, seed, { ...B, kind: 'DISCOUNT', uses: 1, validatedAt: '2026-09-20T15:00:00.000Z' });
  const cb = await createRedeemedBenefit(prisma, seed, { ...B, kind: 'COURTESY', uses: 2, validatedAt: '2026-09-21T15:00:00.000Z' });
  const sb = await generate(profileB, '2026-09');
  check(sb.summary.pendingUsageCount === 3 && sb.summary.fundedCourtesyUsageCount === 0, 'H: B usage fully eligible');
  const eh = await errorOf(() => svc.settlements.allocate(tenantId, actor, sb.id, { mode: 'CASH', validationIds: [f.validationIds[0]!] }));
  check(codeOf(eh) === ErrorCode.BENEFIT_SETTLEMENT_VALIDATION_NOT_PENDING, 'H: A funded validation is NOT_PENDING for B (no leak)');
  const ab = await svc.settlements.allocate(tenantId, actor, sb.id, { mode: 'CASH', validationIds: [...nb.validationIds, ...cb.validationIds] });
  check(ab.settlement.summary.cashDueCents === '1500000', 'H: B normal + courtesy CASH due $15.000');
}

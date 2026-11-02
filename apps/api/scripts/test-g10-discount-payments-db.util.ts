/**
 * G10.D — exact CASH payments per discount against real PostgreSQL.
 * Run: pnpm --filter api run test:g10-discount-payments-db
 */

import { codeOf, errorOf } from './lib/courtesy-fake-db';
import { cleanupG10Tenant, seedG10Tenant, withG10Db } from './lib/g10-agreements-db-seed';
import {
  buildPaymentServices,
  cashBody,
  pricedDiscount,
  seedActivityCashSettlement,
} from './lib/g10-discount-payments-db-scenarios';

let failures = 0;
function check(cond: boolean, msg: string) {
  if (!cond) {
    failures += 1;
    console.error('FAIL:', msg);
    return;
  }
  console.log('OK:', msg);
}

const DISCOUNT_OVERPAY = 'BENEFIT_SETTLEMENT_DISCOUNT_CASH_OVERPAYMENT';
const SETTLEMENT_OVERPAY = 'BENEFIT_TRANSFER_OVERPAYMENT';
const SCOPE_INVALID = 'BENEFIT_TRANSFER_DISCOUNT_SCOPE_INVALID';

async function main() {
  const result = await withG10Db(async (prisma, seed) => {
    const svc = buildPaymentServices(prisma);
    const { tenantId, profileA, profileB } = seed;
    const actor = { id: seed.adminId, role: 'ADMIN' };
    const onA = { profileId: profileA, eventId: seed.eventA };
    const cash = (discountId: string) => svc.summary.getForAdmin(tenantId, profileA, discountId).then((s) => s.cash);

    const A = await pricedDiscount(prisma, seed, { ...onA, unitPriceCents: 500000n, uses: 10, validatedAt: '2026-11-02T15:00:00.000Z' });
    const B = await pricedDiscount(prisma, seed, { ...onA, unitPriceCents: 500000n, uses: 6, validatedAt: '2026-11-03T15:00:00.000Z' });
    const s = await svc.settlements.generate(tenantId, actor, { vertical: 'GASTRO', gastroProfileId: profileA, periodKey: '2026-11' });
    await svc.settlements.allocate(tenantId, actor, s.id, { mode: 'CASH', validationIds: A.validationIds });
    await svc.settlements.allocate(tenantId, actor, s.id, { mode: 'CASH', validationIds: B.validationIds });
    check((await prisma.benefitSettlementTransfer.count({ where: { tenantId } })) === 0, 'CASH allocation creates debt only (no transfer)');
    const register = (amount: string, discountId?: string, ref?: string) =>
      svc.transfers.register(tenantId, actor, s.id, cashBody(amount, discountId, ref));

    // ── Scenario 1 — CASH exacto ──
    const t30 = await register('3000000', A.discountId, 'A-30');
    let a = await cash(A.discountId);
    check(a.generatedCents === '5000000' && a.paidCents === '3000000' && a.remainingCents === '2000000' && a.remainingPrecision === 'EXACT', 'S1: generated 50.000 / paid 30.000 / remaining 20.000 EXACT');
    check(t30.gastroDiscountId === A.discountId && t30.attribution === 'EXACT', 'S1: transfer persisted with gastroDiscountId (EXACT)');
    const regAudit = svc.events.find((e) => e.action === 'BENEFIT_TRANSFER_REGISTERED' && e.entityId === t30.id);
    check(
      regAudit?.metadata?.settlementId === s.id && regAudit.metadata.gastroDiscountId === A.discountId && regAudit.metadata.amountCents === '3000000' && regAudit.metadata.currency === 'ARS',
      'S1: audit BENEFIT_TRANSFER_REGISTERED has settlementId, gastroDiscountId, amountCents, currency',
    );

    // ── Scenario 2 — segundo pago ──
    const t20 = await register('2000000', A.discountId, 'A-20');
    a = await cash(A.discountId);
    check(a.paidCents === '5000000' && a.remainingCents === '0', 'S2: paid 50.000 / remaining 0');

    // ── Scenario 3 — overpayment ──
    check(codeOf(await errorOf(() => register('100', A.discountId))) === DISCOUNT_OVERPAY, 'S3: +$1 over the discount due → DISCOUNT_CASH_OVERPAYMENT');

    // ── Scenario 4 — reversa ──
    const reversed = await svc.transfers.reverse(tenantId, actor, s.id, t20.id, { reason: 'monto duplicado' });
    a = await cash(A.discountId);
    check(a.paidCents === '3000000' && a.remainingCents === '2000000', 'S4: after reversal paid 30.000 / remaining 20.000');
    const row20 = await prisma.benefitSettlementTransfer.findUnique({ where: { id: t20.id } });
    check(row20 != null && row20.reversedAt != null && row20.gastroDiscountId === A.discountId && !reversed.isActive, 'S4: reversal is append-only (row kept, reversedAt set, discount kept)');
    const revAudit = svc.events.find((e) => e.action === 'BENEFIT_TRANSFER_REVERSED' && e.entityId === t20.id);
    check(revAudit?.metadata?.gastroDiscountId === A.discountId && revAudit.metadata.reason === 'monto duplicado', 'S4: audit BENEFIT_TRANSFER_REVERSED includes gastroDiscountId + reason');
    check(svc.events.filter((e) => e.action === 'BENEFIT_TRANSFER_REGISTERED').length === 2, 'S4: register audits intact (2)');
    check(codeOf(await errorOf(() => svc.transfers.reverse(tenantId, actor, s.id, t20.id, { reason: 'otra vez' }))) === 'BENEFIT_TRANSFER_ALREADY_REVERSED', 'S4: second reversal rejected');

    // ── Scenario 5 — A/B mismo settlement ──
    let b = await cash(B.discountId);
    check(b.generatedCents === '3000000' && b.paidCents === '0' && b.remainingCents === '3000000', 'S5: A transfer 30.000 never reduces B remaining (B = 30.000)');
    await register('1000000', B.discountId, 'B-10');
    b = await cash(B.discountId);
    a = await cash(A.discountId);
    check(b.paidCents === '1000000' && a.paidCents === '3000000', 'S5: B payment counted for B only');

    // ── Scenario 6 — cross-discount overpayment ──
    await register('2000000', A.discountId, 'A-20-bis');
    a = await cash(A.discountId);
    const settlementNow = await svc.settlements.get(tenantId, s.id);
    check(a.paidCents === '5000000' && settlementNow.summary.cashOutstandingCents === '2000000', 'S6: A fully paid while settlement still owes 20.000 (B)');
    check(codeOf(await errorOf(() => register('100', A.discountId))) === DISCOUNT_OVERPAY, 'S6: A cannot use B capacity → DISCOUNT_CASH_OVERPAYMENT');

    // ── Scenario 7 — wrong profile / tenant / missing discount ──
    const onB = await pricedDiscount(prisma, seed, { profileId: profileB, eventId: seed.eventB, unitPriceCents: 500000n, uses: 1, validatedAt: '2026-11-05T15:00:00.000Z' });
    check(codeOf(await errorOf(() => register('100', onB.discountId))) === SCOPE_INVALID, 'S7: settlement of local A + discount of local B → SCOPE_INVALID');
    check(codeOf(await errorOf(() => register('100', 'missing-discount'))) === SCOPE_INVALID, 'S7: unknown discount → SCOPE_INVALID');
    check(codeOf(await errorOf(() => register('100'))) === 'BENEFIT_TRANSFER_DISCOUNT_REQUIRED', 'S7: GASTRO transfer without discount → DISCOUNT_REQUIRED');
    const other = await seedG10Tenant(prisma);
    try {
      const foreign = await pricedDiscount(prisma, other, { profileId: other.profileA, eventId: other.eventA, unitPriceCents: 500000n, uses: 1, validatedAt: '2026-11-05T15:00:00.000Z' });
      check(codeOf(await errorOf(() => register('100', foreign.discountId))) === SCOPE_INVALID, 'S7: discount of another tenant → SCOPE_INVALID');
    } finally {
      await cleanupG10Tenant(prisma, other.tenantId);
    }

    // ── Concurrency — two requests for the last 20.000 of B ──
    const race = await Promise.allSettled([register('2000000', B.discountId, 'race-1'), register('2000000', B.discountId, 'race-2')]);
    const passed = race.filter((r) => r.status === 'fulfilled').length;
    const failedCodes = race.flatMap((r) => (r.status === 'rejected' ? [codeOf(r.reason as Error)] : []));
    check(passed === 1 && failedCodes.length === 1 && failedCodes[0] === DISCOUNT_OVERPAY, `concurrency: one PASS, one FAIL overpayment (got ${passed} pass, ${failedCodes.join(',')})`);
    b = await cash(B.discountId);
    const afterRace = await svc.settlements.get(tenantId, s.id);
    check(b.paidCents === '3000000' && afterRace.summary.cashReceivedCents === '8000000', 'concurrency: no double charge (B paid 30.000, settlement received 80.000)');

    // three concurrent requests on a fresh settlement (December)
    const C = await pricedDiscount(prisma, seed, { ...onA, unitPriceCents: 500000n, uses: 4, validatedAt: '2026-12-02T15:00:00.000Z' });
    const sDec = await svc.settlements.generate(tenantId, actor, { vertical: 'GASTRO', gastroProfileId: profileA, periodKey: '2026-12' });
    await svc.settlements.allocate(tenantId, actor, sDec.id, { mode: 'CASH', validationIds: C.validationIds });
    const race3 = await Promise.allSettled(
      [1, 2, 3].map((i) => svc.transfers.register(tenantId, actor, sDec.id, cashBody('2000000', C.discountId, `race3-${i}`))),
    );
    check(race3.filter((r) => r.status === 'fulfilled').length === 1, 'concurrency x3: exactly one PASS');
    check((await cash(C.discountId)).paidCents === '2000000', 'concurrency x3: C paid 20.000 (no double charge)');

    // ── Settlement-level guard (kept) — legacy unattributed transfer leaves less room than B ──
    const bRace = await prisma.benefitSettlementTransfer.findFirst({ where: { settlementId: s.id, gastroDiscountId: B.discountId, reversedAt: null, reference: { startsWith: 'race' } } });
    await svc.transfers.reverse(tenantId, actor, s.id, bRace!.id, { reason: 'reasignar' });
    const legacy = await prisma.benefitSettlementTransfer.create({
      data: { tenantId, settlementId: s.id, gastroDiscountId: null, amountCents: 1500000n, transferredAt: new Date('2026-11-20T15:00:00.000Z'), reference: 'LEGACY', registeredByUserId: seed.adminId },
    });
    b = await cash(B.discountId);
    check(b.remainingCents === '2000000' && b.remainingPrecision === 'SETTLEMENT_LEVEL', 'legacy: B remaining 20.000 (not prorated), precision SETTLEMENT_LEVEL');
    check(codeOf(await errorOf(() => register('1000000', B.discountId))) === SETTLEMENT_OVERPAY, 'settlement guard: discount has room (20.000) but settlement only 5.000 → TRANSFER_OVERPAYMENT');
    await register('500000', B.discountId, 'B-5');
    check((await svc.settlements.get(tenantId, s.id)).summary.cashOutstandingCents === '0', 'settlement guard: exactly the settlement outstanding is accepted');

    // ── Scenario 12 — legacy transfer stays SETTLEMENT_LEVEL ──
    const listed = await svc.transfers.list(tenantId, s.id);
    const legacyDto = listed.data.find((t) => t.id === legacy.id);
    check(legacyDto?.gastroDiscountId === null && legacyDto.attribution === 'SETTLEMENT_LEVEL', 'S12: legacy transfer listed as SETTLEMENT_LEVEL (gastroDiscountId null)');
    const legacyAfter = await prisma.benefitSettlementTransfer.findUnique({ where: { id: legacy.id } });
    check(legacyAfter?.gastroDiscountId === null && legacyAfter.amountCents === 1500000n && legacyAfter.reversedAt === null, 'S12: legacy row never attributed nor modified');
    check(listed.data.filter((t) => t.attribution === 'EXACT').every((t) => t.gastroDiscountId != null), 'S12: every new GASTRO transfer is EXACT');

    // ── D5 — settlement view: attribution + per-discount CASH ──
    const exactDto = listed.data.find((t) => t.id === t30.id);
    check(Boolean(exactDto?.discountTitle) && Boolean(exactDto?.discountLocalName), 'D5: EXACT transfer listed with discount title + local');
    check(legacyDto?.discountTitle === null, 'D5: legacy transfer listed without discount (no inference)');
    const lineA = listed.discountCash?.find((l) => l.gastroDiscountId === A.discountId);
    const lineB = listed.discountCash?.find((l) => l.gastroDiscountId === B.discountId);
    check(lineA?.cashDueCents === '5000000' && lineA.cashPaidCents === '5000000' && lineA.cashRemainingCents === '0', 'D5: discount CASH line A due 50.000 / paid 50.000');
    check(lineB?.cashDueCents === '3000000' && lineB.cashPaidCents === '1500000' && lineB.cashRemainingCents === '1500000', 'D5: discount CASH line B due 30.000 / paid 15.000 (legacy never counted)');

    // ── D5 — integrity ──
    const clean = await svc.integrity.evaluateSettlement(tenantId, s.id);
    check(!clean.issues.some((i) => i.code === 'DISCOUNT_CASH_OVERPAYMENT' || i.code === 'TRANSFER_DISCOUNT_SCOPE_MISMATCH'), 'integrity: guarded writes leave no discount issues');
    const forced = await prisma.benefitSettlementTransfer.create({
      data: { tenantId, settlementId: s.id, gastroDiscountId: A.discountId, amountCents: 100n, transferredAt: new Date('2026-11-26T15:00:00.000Z'), reference: 'FORCED' },
    });
    const crossLocal = await prisma.benefitSettlementTransfer.create({
      data: { tenantId, settlementId: s.id, gastroDiscountId: onB.discountId, amountCents: 100n, transferredAt: new Date('2026-11-26T15:00:00.000Z'), reference: 'CROSS' },
    });
    const dirty = await svc.integrity.evaluateSettlement(tenantId, s.id);
    check(dirty.issues.some((i) => i.code === 'DISCOUNT_CASH_OVERPAYMENT' && i.entityId === s.id && i.message.includes(A.discountId)), 'integrity: DISCOUNT_CASH_OVERPAYMENT when attributed transfers(S,A) > due(S,A)');
    check(dirty.issues.some((i) => i.code === 'TRANSFER_DISCOUNT_SCOPE_MISMATCH' && i.entityId === crossLocal.id), 'integrity: TRANSFER_DISCOUNT_SCOPE_MISMATCH for a discount of another local');
    check(dirty.status === 'ERROR', 'integrity: status ERROR');
    await prisma.benefitSettlementTransfer.deleteMany({ where: { id: { in: [forced.id, crossLocal.id] } } });

    // ── Scenario 13 — ACTIVITY keeps its behavior ──
    const sAct = await seedActivityCashSettlement(prisma, svc, seed);
    const tAct = await svc.transfers.register(tenantId, actor, sAct, cashBody('150000'));
    check(tAct.gastroDiscountId === null && tAct.attribution === 'SETTLEMENT_LEVEL', 'S13: ACTIVITY transfer without gastroDiscountId PASS');
    check(codeOf(await errorOf(() => svc.transfers.register(tenantId, actor, sAct, cashBody('100', A.discountId)))) === SCOPE_INVALID, 'S13: ACTIVITY rejects gastroDiscountId');
    check(codeOf(await errorOf(() => svc.transfers.register(tenantId, actor, sAct, cashBody('50001')))) === SETTLEMENT_OVERPAY, 'S13: ACTIVITY settlement overpayment guard unchanged');
    const actAudit = svc.events.find((e) => e.action === 'BENEFIT_TRANSFER_REGISTERED' && e.entityId === tAct.id);
    check(actAudit?.metadata?.gastroDiscountId === null, 'S13: ACTIVITY audit gastroDiscountId null');
  });

  console.log(`\nDB integration: ${result}`);
  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll G10.D payment DB checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

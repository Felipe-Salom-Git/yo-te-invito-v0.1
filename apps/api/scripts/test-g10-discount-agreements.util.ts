/**
 * G10.A3 — discount-scoped agreement service against real PostgreSQL.
 * Run: pnpm --filter api run test:g10-discount-agreements
 */

import { ErrorCode } from '@yo-te-invito/shared';
import { codeOf, errorOf } from './lib/courtesy-fake-db';
import { buildG10Services, createG10Discount, insertG10Agreement, withG10Db } from './lib/g10-agreements-db-seed';

let failures = 0;
function check(cond: boolean, msg: string) {
  if (!cond) {
    failures += 1;
    console.error('FAIL:', msg);
    return;
  }
  console.log('OK:', msg);
}

async function main() {
  const result = await withG10Db(async (prisma, seed) => {
    const svc = buildG10Services(prisma);
    const actor = { id: seed.adminId, role: 'ADMIN' };
    const { tenantId, profileA, profileB } = seed;
    const A = await createG10Discount(prisma, seed, { profileId: profileA, eventId: seed.eventA });
    const B = await createG10Discount(prisma, seed, { profileId: profileA, eventId: seed.eventA });
    const C = await createG10Discount(prisma, seed, { profileId: profileB, eventId: seed.eventB });
    const create = (discountId: string, profileId: string, unit: string, validFrom: string) =>
      svc.agreements.create(tenantId, actor, {
        vertical: 'GASTRO',
        gastroProfileId: profileId,
        gastroDiscountId: discountId,
        unitPriceCents: unit,
        barterMultiplier: '2',
        currency: 'ARS',
        validFrom,
      });
    const resolve = (discountId: string, onDate?: string) =>
      svc.agreements.resolveApplicable(tenantId, { vertical: 'GASTRO', gastroDiscountId: discountId, onDate });

    // ── Scope: A agreement resolves A only ──
    const a1 = await create(A.discountId, profileA, '500000', '2026-01-01');
    check(a1.scope === 'DISCOUNT' && a1.gastroDiscountId === A.discountId, 'create → DISCOUNT scope on A');
    check((await resolve(A.discountId)).agreement?.id === a1.id, 'Discount A resolves agreement A');
    check((await resolve(B.discountId)).agreement === null, 'Discount B (same profile) does NOT resolve A');

    // ── History: A1 old, A2 current; B sees neither ──
    const replaced = await svc.agreements.replace(tenantId, actor, a1.id, {
      effectiveFrom: '2026-06-01',
      unitPriceCents: '600000',
      barterMultiplier: '3',
      currency: 'ARS',
    });
    const a2 = replaced.created;
    check(replaced.closed.validTo === '2026-05-31' && a2.gastroDiscountId === A.discountId, 'replace keeps discount scope');
    check((await resolve(A.discountId)).agreement?.id === a2.id, 'A resolves A2 today');
    check((await resolve(A.discountId, '2026-03-10')).agreement?.id === a1.id, 'A resolves A1 on a past date');
    check((await resolve(B.discountId)).agreement === null, 'B sees neither A1 nor A2');
    const histA = await svc.discountHistory.discountHistory(tenantId, A.discountId);
    check(histA.current?.id === a2.id && histA.history.length === 2, 'discount history: current A2 + 2 rows');
    const histB = await svc.discountHistory.discountHistory(tenantId, B.discountId);
    check(histB.current === null && histB.history.length === 0, 'discount history B empty');

    // ── Legacy: readable, never used for new resolution, read-only ──
    const legacy = await insertG10Agreement(prisma, seed, { gastroProfileId: profileA }, { unitPriceCents: 900000n, validFrom: '2025-01-01T03:00:00.000Z' });
    check((await resolve(B.discountId)).agreement === null, 'legacy profile agreement NOT used for discount resolution');
    const legacyHistory = await svc.agreements.partnerHistory(tenantId, { vertical: 'GASTRO', gastroProfileId: profileA });
    check(
      legacyHistory.history.length === 1 && legacyHistory.history[0]!.scope === 'PROFILE_LEGACY' && legacyHistory.current?.id === legacy.id,
      'partner history exposes legacy row only (scope PROFILE_LEGACY)',
    );
    check(
      (await svc.agreements.resolveApplicable(tenantId, { vertical: 'GASTRO', gastroProfileId: profileA })).agreement?.scope === 'PROFILE_LEGACY',
      'legacy profile resolution still readable (transitional approval gate)',
    );
    const READ_ONLY = ErrorCode.BENEFIT_AGREEMENT_LEGACY_READ_ONLY;
    check(codeOf(await errorOf(() => svc.agreements.close(tenantId, actor, legacy.id, { validTo: '2026-12-31' }))) === READ_ONLY, 'legacy close blocked');
    check(
      codeOf(
        await errorOf(() =>
          svc.agreements.replace(tenantId, actor, legacy.id, { effectiveFrom: '2026-12-01', unitPriceCents: '1', barterMultiplier: '2', currency: 'ARS' }),
        ),
      ) === READ_ONLY,
      'legacy replace blocked',
    );
    check(codeOf(await errorOf(() => svc.agreements.updateNotes(tenantId, actor, legacy.id, { notes: 'x' }))) === READ_ONLY, 'legacy edit blocked');
    const listDiscount = await svc.agreements.list(tenantId, { scope: 'DISCOUNT', vigency: 'ALL', page: 1, pageSize: 50 });
    check(listDiscount.data.every((r) => r.scope === 'DISCOUNT') && listDiscount.total === 2, 'list scope=DISCOUNT never mixes legacy');

    // ── Cross-profile: discount A with profile B → blocked ──
    check(
      codeOf(await errorOf(() => create(B.discountId, profileB, '500000', '2026-01-01'))) === ErrorCode.BENEFIT_AGREEMENT_PARTNER_INVALID,
      'cross-profile create blocked (discount of A with profile B)',
    );
    check(
      codeOf(await errorOf(() => svc.agreements.resolveApplicable(tenantId, { vertical: 'GASTRO', gastroProfileId: profileB, gastroDiscountId: A.discountId }))) ===
        ErrorCode.BENEFIT_AGREEMENT_PARTNER_INVALID,
      'cross-profile resolve blocked',
    );

    // ── Overlap (in-transaction, scope-locked) ──
    check(
      codeOf(await errorOf(() => create(A.discountId, profileA, '700000', '2026-07-01'))) === ErrorCode.BENEFIT_AGREEMENT_OVERLAP,
      'overlap inside discount scope rejected',
    );
    const concurrent = await Promise.allSettled([
      create(C.discountId, profileB, '500000', '2026-01-01'),
      create(C.discountId, profileB, '510000', '2026-02-01'),
      create(C.discountId, profileB, '520000', '2026-03-01'),
    ]);
    const okCount = concurrent.filter((r) => r.status === 'fulfilled').length;
    const cRows = await prisma.benefitCommercialAgreement.count({ where: { gastroDiscountId: C.discountId } });
    check(okCount === 1 && cRows === 1, 'concurrent creates on one discount → exactly one agreement (race closed)');

    // ── DB CHECKs / FKs ──
    const rawErr = (fn: () => Promise<unknown>) => errorOf(fn).then((e) => e !== null);
    check(
      await rawErr(() =>
        prisma.benefitCommercialAgreement.create({
          data: { tenantId, vertical: 'ACTIVITY', excursionOperatorId: seed.operatorId, gastroDiscountId: A.discountId, unitPriceCents: 1n, barterMultiplier: '1', validFrom: new Date() },
        }),
      ),
      'CHECK: ACTIVITY with gastroDiscountId rejected by PostgreSQL',
    );
    check(
      await rawErr(() =>
        prisma.benefitCommercialAgreement.create({
          data: { tenantId, vertical: 'GASTRO', gastroDiscountId: B.discountId, unitPriceCents: 1n, barterMultiplier: '1', validFrom: new Date() },
        }),
      ),
      'CHECK: discount-scoped agreement without gastroProfileId rejected',
    );
    check(
      await rawErr(() =>
        prisma.benefitCommercialAgreement.create({
          data: { tenantId, vertical: 'GASTRO', gastroProfileId: profileA, derivedFromAgreementId: legacy.id, unitPriceCents: 1n, barterMultiplier: '1', validFrom: new Date() },
        }),
      ),
      'CHECK: lineage only on discount-scoped rows',
    );
    check(await rawErr(() => prisma.gastroDiscount.delete({ where: { id: A.discountId } })), 'FK RESTRICT: discount with agreements cannot be deleted');

    // ── ACTIVITY unchanged ──
    const op = await svc.agreements.create(tenantId, actor, {
      vertical: 'ACTIVITY',
      excursionOperatorId: seed.operatorId,
      unitPriceCents: '300000',
      barterMultiplier: '2',
      currency: 'ARS',
      validFrom: '2026-01-01',
    });
    check(op.scope === 'OPERATOR' && op.gastroDiscountId === null, 'ACTIVITY create → OPERATOR scope');
    const opResolved = await svc.agreements.resolveApplicable(tenantId, { vertical: 'ACTIVITY', excursionOperatorId: seed.operatorId });
    check(opResolved.agreement?.id === op.id, 'ACTIVITY resolve unchanged');
    const opReplaced = await svc.agreements.replace(tenantId, actor, op.id, {
      effectiveFrom: '2026-09-01',
      unitPriceCents: '350000',
      barterMultiplier: '2',
      currency: 'ARS',
    });
    check(opReplaced.created.scope === 'OPERATOR' && opReplaced.closed.validTo === '2026-08-31', 'ACTIVITY replace unchanged');
    const opHistory = await svc.agreements.partnerHistory(tenantId, { vertical: 'ACTIVITY', excursionOperatorId: seed.operatorId });
    check(opHistory.history.length === 2 && opHistory.current?.id === opReplaced.created.id, 'ACTIVITY partner history unchanged');
  });

  console.log(`\nDB integration: ${result}`);
  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll G10 discount agreement checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

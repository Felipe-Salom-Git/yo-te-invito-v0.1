/**
 * G10.B — activation gates by discount against real PostgreSQL.
 * Run: pnpm --filter api run test:g10-discount-approval
 *
 * B1: approve / approveCourtesy resolve `discount → CURRENT agreement of the discount`
 *     (same-local isolation, legacy row never used, cross-discount/profile blocked, audit metadata,
 *     funded courtesy without lookup).
 */

import {
  ErrorCode,
  GASTRO_COURTESY_AGREEMENT_REQUIRED_MESSAGE,
  GASTRO_DISCOUNT_AGREEMENT_REQUIRED_MESSAGE,
} from '@yo-te-invito/shared';
import { codeOf, errorOf } from './lib/courtesy-fake-db';
import {
  createG10Discount,
  fundG10Courtesy,
  insertG10Agreement,
  withG10Db,
} from './lib/g10-agreements-db-seed';
import {
  buildG10ApprovalServices,
  createPendingG10Discount,
  linkG10PublicEvents,
} from './lib/g10-approval-db-services';

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
    await linkG10PublicEvents(prisma, seed);
    const svc = buildG10ApprovalServices(prisma);
    const actor = { id: seed.adminId, role: 'ADMIN' };
    const { tenantId, profileA, profileB } = seed;
    const createAgreement = (discountId: string, profileId: string, unit = '500000') =>
      svc.agreements.create(tenantId, actor, {
        vertical: 'GASTRO',
        gastroProfileId: profileId,
        gastroDiscountId: discountId,
        unitPriceCents: unit,
        barterMultiplier: '2',
        currency: 'ARS',
        validFrom: '2026-01-01',
      });
    const approve = (profileId: string, discountId: string) =>
      svc.admin.approve(tenantId, seed.adminId, 'ADMIN', profileId, discountId);
    const statusOf = async (id: string) =>
      (await prisma.gastroDiscount.findUniqueOrThrow({ where: { id } })).status;

    console.log('\n=== B1 approve: discount-scoped gate (same local) ===\n');
    const A = await createPendingG10Discount(prisma, seed, { profileId: profileA, eventId: seed.eventA });
    const B = await createPendingG10Discount(prisma, seed, { profileId: profileA, eventId: seed.eventA });
    // Legacy profile row of the same local: must never unlock anything.
    await insertG10Agreement(prisma, seed, { gastroProfileId: profileA }, { unitPriceCents: 900000n, validFrom: '2026-01-01' });
    const agrA = await createAgreement(A.discountId, profileA);

    await approve(profileA, A.discountId);
    check((await statusOf(A.discountId)) === 'ACTIVE', 'A (own CURRENT contract) → approve PASS');
    const auditA = await prisma.auditLog.findFirst({
      where: { tenantId, entityId: A.discountId, action: 'GASTRO_DISCOUNT_APPROVED' },
    });
    const metaA = auditA?.metadata as { discountId?: string; agreementId?: string; agreementScope?: string } | null;
    check(
      metaA?.discountId === A.discountId && metaA?.agreementId === agrA.id && metaA?.agreementScope === 'DISCOUNT',
      'audit metadata: discountId + agreementId + agreementScope=DISCOUNT',
    );
    check(
      svc.approvedNotifications.some((n) => n.discountId === A.discountId && n.agreementId === agrA.id),
      'approval email receives the agreement of THIS discount',
    );
    const discountRowA = await prisma.gastroDiscount.findUniqueOrThrow({ where: { id: A.discountId } });
    check(!('agreementId' in discountRowA), 'no extra agreement link persisted on GastroDiscount');

    const errB = await errorOf(() => approve(profileA, B.discountId));
    check(codeOf(errB) === ErrorCode.BENEFIT_AGREEMENT_NOT_FOUND, 'B (no contract) → 400 BENEFIT_AGREEMENT_NOT_FOUND');
    check(errB?.message === GASTRO_DISCOUNT_AGREEMENT_REQUIRED_MESSAGE, `copy: "${GASTRO_DISCOUNT_AGREEMENT_REQUIRED_MESSAGE}"`);
    check((await statusOf(B.discountId)) === 'PENDING_REVIEW', 'B stays PENDING_REVIEW');
    check(
      (await svc.gate.resolve(tenantId, B.discountId)).agreement === null,
      'agreement A (and the legacy local row) never resolve for B',
    );

    console.log('\n=== B1 cross-discount / cross-profile ===\n');
    const C = await createPendingG10Discount(prisma, seed, { profileId: profileB, eventId: seed.eventB });
    await createAgreement(C.discountId, profileB);
    check(codeOf(await errorOf(() => approve(profileA, B.discountId))) === ErrorCode.BENEFIT_AGREEMENT_NOT_FOUND, "another local's discount contract does not unlock B");
    const crossCreate = await errorOf(() => createAgreement(B.discountId, profileB));
    check(codeOf(crossCreate) === ErrorCode.BENEFIT_AGREEMENT_PARTNER_INVALID, 'agreement for B under another profile → PARTNER_INVALID');
    const crossResolve = await errorOf(() =>
      svc.agreements.resolveApplicable(tenantId, { vertical: 'GASTRO', gastroProfileId: profileB, gastroDiscountId: A.discountId }),
    );
    check(codeOf(crossResolve) === ErrorCode.BENEFIT_AGREEMENT_PARTNER_INVALID, 'agreement A resolved through another profile → PARTNER_INVALID');
    await createAgreement(B.discountId, profileA, '750000');
    await approve(profileA, B.discountId);
    check((await statusOf(B.discountId)) === 'ACTIVE', 'B approves once it has its own contract');

    console.log('\n=== B1 approveCourtesy ===\n');
    const NF = await createPendingG10Discount(prisma, seed, { profileId: profileA, eventId: seed.eventA, courtesy: true });
    const errNF = await errorOf(() => approve(profileA, NF.discountId));
    check(
      codeOf(errNF) === ErrorCode.BENEFIT_AGREEMENT_NOT_FOUND && errNF?.message === GASTRO_COURTESY_AGREEMENT_REQUIRED_MESSAGE,
      'non-funded courtesy without own contract → blocked (courtesy copy)',
    );
    const agrNF = await createAgreement(NF.discountId, profileA, '100000');
    await approve(profileA, NF.discountId);
    check((await statusOf(NF.discountId)) === 'ACTIVE', 'non-funded courtesy with own contract → approve PASS');
    const auditNF = await prisma.auditLog.findFirst({
      where: { tenantId, entityId: NF.discountId, action: 'GASTRO_DISCOUNT_APPROVED' },
    });
    check(
      (auditNF?.metadata as { agreementId?: string } | null)?.agreementId === agrNF.id,
      'courtesy approval audit records its own agreementId',
    );

    const F = await createG10Discount(prisma, seed, { profileId: profileA, eventId: seed.eventA, courtesy: true });
    await fundG10Courtesy(prisma, svc.ledger, seed, { profileId: profileA, campaignId: F.campaignId!, imputedValueCents: 100000n });
    const gateF = await svc.gate.assertActivatable(tenantId, F.discountId);
    check(!gateF.billable && gateF.agreement === null, 'funded courtesy → no agreement lookup, gate passes (D1 / D-G10-3)');

    console.log('\n=== B3 discount contract API (create / replace / close / history) ===\n');
    const U = await createPendingG10Discount(prisma, seed, { profileId: profileA, eventId: seed.eventA });
    const bounded = await svc.agreements.create(tenantId, actor, {
      vertical: 'GASTRO', gastroProfileId: profileA, gastroDiscountId: U.discountId,
      unitPriceCents: '300000', barterMultiplier: '1.5', currency: 'ARS', validFrom: '2026-01-01', validTo: '2026-06-30',
    });
    check(bounded.validTo === '2026-06-30' && !bounded.isOpen && bounded.vigency === 'PAST', 'create with optional "hasta" persists validTo');
    const overlapping = await errorOf(() => svc.agreements.create(tenantId, actor, {
      vertical: 'GASTRO', gastroProfileId: profileA, gastroDiscountId: U.discountId,
      unitPriceCents: '300000', barterMultiplier: '2', currency: 'ARS', validFrom: '2026-06-15',
    }));
    check(codeOf(overlapping) === ErrorCode.BENEFIT_AGREEMENT_OVERLAP, 'bounded range still blocks overlapping rows');
    const next = await svc.agreements.create(tenantId, actor, {
      vertical: 'GASTRO', gastroProfileId: profileA, gastroDiscountId: U.discountId,
      unitPriceCents: '350000', barterMultiplier: '2', currency: 'ARS', validFrom: '2026-07-01',
    });
    const replaced = await svc.agreements.replace(tenantId, actor, next.id, {
      effectiveFrom: '2026-10-01', unitPriceCents: '400000', barterMultiplier: '2', currency: 'ARS',
    });
    check(replaced.closed.validTo === '2026-09-30' && replaced.created.gastroDiscountId === U.discountId, 'replace closes + opens a row of the SAME discount');
    const hist = await svc.discountHistory.discountHistory(tenantId, U.discountId);
    check(hist.billable && hist.discountStatus === 'PENDING_REVIEW', 'discount-history exposes billable + discountStatus');
    check(hist.current?.id === replaced.created.id && hist.history.length === 3, 'history: 3 rows of this discount, current = replacement');
    const closed = await svc.agreements.close(tenantId, actor, replaced.created.id, { validTo: '2026-12-31' });
    check(closed.validTo === '2026-12-31' && (await svc.discountHistory.discountHistory(tenantId, U.discountId)).history.length === 3, 'close keeps history (no delete)');
    const histF = await svc.discountHistory.discountHistory(tenantId, F.discountId);
    check(!histF.billable && histF.current === null, 'funded courtesy history: billable=false (no contract required)');
    const legacyRow = await prisma.benefitCommercialAgreement.findFirstOrThrow({ where: { tenantId, gastroProfileId: profileA, gastroDiscountId: null } });
    const legacyErrs = await Promise.all([
      errorOf(() => svc.agreements.close(tenantId, actor, legacyRow.id, { validTo: '2026-12-31' })),
      errorOf(() => svc.agreements.replace(tenantId, actor, legacyRow.id, { effectiveFrom: '2026-12-01', unitPriceCents: '1', barterMultiplier: '2', currency: 'ARS' })),
      errorOf(() => svc.agreements.updateNotes(tenantId, actor, legacyRow.id, { notes: 'x' })),
      errorOf(() => svc.agreements.create(tenantId, actor, { vertical: 'GASTRO', gastroProfileId: profileA, unitPriceCents: '1', barterMultiplier: '2', currency: 'ARS', validFrom: '2026-12-01' } as never)),
    ]);
    check(
      legacyErrs.slice(0, 3).every((e) => codeOf(e) === ErrorCode.BENEFIT_AGREEMENT_LEGACY_READ_ONLY),
      'legacy local row: close / replace / notes → LEGACY_READ_ONLY',
    );
    check(
      codeOf(legacyErrs[3]) === ErrorCode.BENEFIT_AGREEMENT_PARTNER_INVALID &&
        (await prisma.benefitCommercialAgreement.count({ where: { tenantId, gastroDiscountId: null } })) === 1,
      'GASTRO create without discount (profile-scoped) → rejected by the service, no new legacy row',
    );
    const listed = await svc.agreements.list(tenantId, { scope: 'PROFILE_LEGACY', vigency: 'ALL', page: 1, pageSize: 50 });
    check(listed.data.some((a) => a.id === legacyRow.id && a.scope === 'PROFILE_LEGACY'), 'legacy row stays visible in the listing');

    console.log('\n=== B4 agreements listing by discount ===\n');
    const byDiscount = await svc.agreements.list(tenantId, { vertical: 'GASTRO', gastroProfileId: profileA, gastroDiscountId: A.discountId, vigency: 'ALL', page: 1, pageSize: 50 });
    check(
      byDiscount.data.length === 1 && byDiscount.data[0]!.id === agrA.id && byDiscount.data[0]!.discountStatus === 'ACTIVE' && Boolean(byDiscount.data[0]!.discountTitle !== undefined),
      'filter Local + Descuento → only that discount (with discount status)',
    );
    const discountScope = await svc.agreements.list(tenantId, { vertical: 'GASTRO', gastroProfileId: profileA, scope: 'DISCOUNT', vigency: 'CURRENT', page: 1, pageSize: 50 });
    check(
      discountScope.data.length > 0 && discountScope.data.every((a) => a.scope === 'DISCOUNT' && a.gastroProfileId === profileA && a.vigency === 'CURRENT'),
      'scope DISCOUNT + CURRENT never returns legacy rows nor other locals',
    );
    const legacyOnly = await svc.agreements.list(tenantId, { scope: 'PROFILE_LEGACY', vigency: 'ALL', page: 1, pageSize: 50 });
    check(legacyOnly.data.every((a) => a.scope === 'PROFILE_LEGACY' && a.discountStatus === null), 'legacy rows carry no discount status');
  });

  if (result === 'NOT_RUN') {
    console.log('\nG10.B discount approval: DB integration NOT RUN');
    return;
  }
  if (failures > 0) {
    console.error(`\n${failures} G10.B check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll G10.B discount approval checks passed (PostgreSQL).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

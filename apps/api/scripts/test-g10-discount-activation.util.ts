/**
 * G10.B2 — every path that leaves a discount ACTIVE, against real PostgreSQL.
 * Run: pnpm --filter api run test:g10-discount-activation
 *
 * createDiscountOnBehalf atomic (forced agreement failure rolls everything back), ADMIN courtesy
 * funded (no contract) / non-funded (own contract, atomic), reactivation and legacy sendQrEmail
 * gated by the discount's own CURRENT contract.
 */

import type { Prisma } from '@prisma/client';
import { ErrorCode, GASTRO_DISCOUNT_AGREEMENT_REQUIRED_MESSAGE } from '@yo-te-invito/shared';
import { GastroDiscountAgreementGateService, type InitialDiscountAgreementInput } from '../src/modules/benefit-agreements/gastro-discount-agreement-gate.service';
import { GastroCourtesyDiscountsService } from '../src/modules/gastro/gastro-courtesy-discounts.service';
import { GastroDiscountMetricsService } from '../src/modules/gastro/gastro-discount-metrics.service';
import { codeOf, errorOf } from './lib/courtesy-fake-db';
import { createG10Discount, fundG10Courtesy, insertG10Agreement, withG10Db, type G10Seed } from './lib/g10-agreements-db-seed';
import { buildG10ApprovalServices, linkG10PublicEvents } from './lib/g10-approval-db-services';
import type { PrismaService } from '../src/prisma/prisma.service';

let failures = 0;
function check(cond: boolean, msg: string) {
  if (!cond) {
    failures += 1;
    console.error('FAIL:', msg);
    return;
  }
  console.log('OK:', msg);
}

const TERMS = { unitPriceCents: '500000', barterMultiplier: '2', currency: 'ARS' as const, validFrom: '2026-01-01' };

function onBehalfBody(title: string, agreement: Record<string, unknown> = TERMS) {
  return {
    title,
    summary: 'Resumen G10',
    detail: 'Detalle G10',
    imageUrls: ['https://example.com/g10.jpg'],
    validityMode: 'DATE_RANGE' as const,
    validFrom: '2026-01-01',
    validTo: '2027-12-31',
    commissionCoordinationAccepted: true as const,
    agreement,
  } as never;
}

class FailingAgreementGate extends GastroDiscountAgreementGateService {
  override async createInitialInTx(tx: Prisma.TransactionClient, input: InitialDiscountAgreementInput) {
    await super.createInitialInTx(tx, input);
    throw new Error('forced agreement failure');
  }
}

function courtesyService(prisma: PrismaService, svc: ReturnType<typeof buildG10ApprovalServices>) {
  return new GastroCourtesyDiscountsService(
    prisma,
    { hasGastroAccess: async () => true } as never,
    svc.audit,
    { isConfigured: () => false } as never,
    svc.ledger,
    svc.gate,
    { deliverCampaign: async () => ({ attempted: 0, sent: 0, failed: 0, skippedAlreadySent: 0, emailConfigured: false, failures: [] }) } as never,
    { notifyDiscountPending: () => undefined, notifyDiscountApproved: () => undefined } as never,
  );
}

async function counts(prisma: PrismaService, seed: G10Seed) {
  const [discounts, agreements] = await Promise.all([
    prisma.gastroDiscount.count({ where: { tenantId: seed.tenantId } }),
    prisma.benefitCommercialAgreement.count({ where: { tenantId: seed.tenantId } }),
  ]);
  return { discounts, agreements };
}

async function main() {
  const result = await withG10Db(async (prisma, seed) => {
    await linkG10PublicEvents(prisma, seed);
    await prisma.gastroProfile.update({ where: { id: seed.profileA }, data: { contactEmail: 'local-a@g10.test' } });
    const svc = buildG10ApprovalServices(prisma);
    const { tenantId, profileA, adminId } = seed;

    console.log('\n=== B2 createDiscountOnBehalf: discount + contract + ACTIVE (atomic) ===\n');
    const detail = (await svc.admin.createDiscountOnBehalf(tenantId, adminId, 'ADMIN', profileA, onBehalfBody('On behalf'))) as { id: string };
    const created = await prisma.gastroDiscount.findUniqueOrThrow({ where: { id: detail.id } });
    const gate = await svc.gate.resolve(tenantId, detail.id);
    check(created.status === 'ACTIVE' && created.createdByOrigin === 'ADMIN', 'on-behalf discount born ACTIVE');
    check(gate.agreement?.gastroDiscountId === detail.id && gate.agreement.scope === 'DISCOUNT', 'its own CURRENT contract exists (DISCOUNT scope)');
    check(gate.agreement?.unitPriceCents === '500000' && gate.agreement.barterMultiplier.startsWith('2'), 'contract terms come from the body');
    const auditCreate = await prisma.auditLog.findFirst({ where: { tenantId, entityId: detail.id, action: 'ADMIN_GASTRO_DISCOUNT_CREATED' } });
    check((auditCreate?.metadata as { agreementId?: string } | null)?.agreementId === gate.agreement?.id, 'create audit links agreementId');

    const before = await counts(prisma, seed);
    const failing = buildG10ApprovalServices(prisma, {
      gate: new FailingAgreementGate(prisma, svc.audit, svc.agreements),
    });
    const forced = await errorOf(() => failing.admin.createDiscountOnBehalf(tenantId, adminId, 'ADMIN', profileA, onBehalfBody('Forced')));
    const afterForced = await counts(prisma, seed);
    check(forced?.message === 'forced agreement failure', 'forced agreement failure surfaces');
    check(
      afterForced.discounts === before.discounts && afterForced.agreements === before.agreements,
      'forced failure → no discount (ACTIVE or not) and no contract left behind',
    );
    const future = await errorOf(() =>
      svc.admin.createDiscountOnBehalf(tenantId, adminId, 'ADMIN', profileA, onBehalfBody('Future', { ...TERMS, validFrom: '2099-01-01' })),
    );
    check(codeOf(future) === ErrorCode.BENEFIT_AGREEMENT_INVALID_EFFECTIVE_DATE, 'contract not CURRENT today → 400');
    check((await counts(prisma, seed)).discounts === before.discounts, 'nothing created with a non-CURRENT contract');

    console.log('\n=== B2 ADMIN courtesy: funded vs non-funded ===\n');
    const courtesy = courtesyService(prisma, svc);
    const courtesyBody = (over: Record<string, unknown>) =>
      ({
        gastroProfileId: profileA,
        title: 'Cortesía ADMIN',
        discountLabel: '2x1',
        validTo: '2027-06-30T23:59:59.000Z',
        manualEmails: [`g10-${Date.now()}@g10.test`],
        sendToFollowers: false,
        ...over,
      }) as never;
    const nf = await courtesy.sendCourtesy(tenantId, adminId, 'ADMIN', courtesyBody({ agreement: TERMS }));
    const nfGate = await svc.gate.resolve(tenantId, nf.discountId);
    check(nf.discountStatus === 'ACTIVE' && nfGate.billable && nfGate.agreement?.gastroDiscountId === nf.discountId, 'non-funded ADMIN courtesy → ACTIVE + its own contract');
    const nfMissing = await errorOf(() => courtesy.sendCourtesy(tenantId, adminId, 'ADMIN', courtesyBody({})));
    check(codeOf(nfMissing) === ErrorCode.BENEFIT_AGREEMENT_NOT_FOUND, 'non-funded ADMIN courtesy without terms → blocked');

    await prisma.courtesyCreditLedgerEntry.create({
      data: { tenantId, vertical: 'GASTRO', gastroProfileId: profileA, type: 'ADJUSTMENT', amountCents: 500000n, adjustmentReason: 'G10.B seed', createdByUserId: adminId },
    });
    const agreementsBeforeFunded = (await counts(prisma, seed)).agreements;
    const funded = await courtesy.sendCourtesy(
      tenantId,
      adminId,
      'ADMIN',
      courtesyBody({ funding: { source: 'COURTESY_CREDIT', imputedValueCents: '100000' } }),
    );
    const fundedGate = await svc.gate.resolve(tenantId, funded.discountId);
    check(funded.fundedFromCourtesyCredit === true && funded.discountStatus === 'ACTIVE', 'funded ADMIN courtesy → ACTIVE');
    check(!fundedGate.billable && (await counts(prisma, seed)).agreements === agreementsBeforeFunded, 'funded courtesy → no contract required nor created');

    console.log('\n=== B2 reactivation (updateDiscountStatus) ===\n');
    const metrics = new GastroDiscountMetricsService(prisma, svc.audit, svc.gate);
    const R = await createG10Discount(prisma, seed, { profileId: profileA, eventId: seed.eventA, status: 'CANCELLED' });
    await prisma.gastroDiscount.update({
      where: { id: R.discountId },
      data: { displayTitle: 'Reactivable', validTo: new Date('2027-12-31T23:59:59.000Z') },
    });
    await insertG10Agreement(prisma, seed, { gastroProfileId: profileA }, { unitPriceCents: 900000n, validFrom: '2026-01-01' });
    const react = (owner: boolean) =>
      metrics.updateDiscountStatus(tenantId, R.discountId, { status: 'ACTIVE' }, { id: adminId, role: owner ? 'GASTRO_OWNER' : 'ADMIN' }, { profileId: profileA });
    const blocked = await errorOf(() => react(false));
    check(
      codeOf(blocked) === ErrorCode.BENEFIT_AGREEMENT_NOT_FOUND && blocked?.message === GASTRO_DISCOUNT_AGREEMENT_REQUIRED_MESSAGE,
      'CANCELLED → ACTIVE without own CURRENT (legacy local row present) → blocked',
    );
    check(codeOf(await errorOf(() => react(true))) === ErrorCode.BENEFIT_AGREEMENT_NOT_FOUND, 'owner reactivation blocked too');
    check((await prisma.gastroDiscount.findUniqueOrThrow({ where: { id: R.discountId } })).status === 'CANCELLED', 'stays CANCELLED');
    await svc.agreements.create(tenantId, { id: adminId, role: 'ADMIN' }, {
      vertical: 'GASTRO', gastroProfileId: profileA, gastroDiscountId: R.discountId, unitPriceCents: '600000', barterMultiplier: '2', currency: 'ARS', validFrom: '2026-01-01',
    });
    await react(false);
    check((await prisma.gastroDiscount.findUniqueOrThrow({ where: { id: R.discountId } })).status === 'ACTIVE', 'with its own CURRENT contract → reactivated');

    const FC = await createG10Discount(prisma, seed, { profileId: profileA, eventId: seed.eventA, courtesy: true, status: 'APPROVED' });
    await prisma.gastroDiscount.update({ where: { id: FC.discountId }, data: { displayTitle: 'Financiada', validTo: new Date('2027-12-31T23:59:59.000Z') } });
    await fundG10Courtesy(prisma, svc.ledger, seed, { profileId: profileA, campaignId: FC.campaignId!, imputedValueCents: 100000n });
    await metrics.updateDiscountStatus(tenantId, FC.discountId, { status: 'ACTIVE' }, { id: adminId, role: 'ADMIN' }, { profileId: profileA });
    check((await prisma.gastroDiscount.findUniqueOrThrow({ where: { id: FC.discountId } })).status === 'ACTIVE', 'funded courtesy activation → no agreement gate');

    console.log('\n=== B2 sendQrEmail (APPROVED → ACTIVE) ===\n');
    const Q = await createG10Discount(prisma, seed, { profileId: profileA, eventId: seed.eventA, status: 'APPROVED' });
    await prisma.gastroDiscount.update({ where: { id: Q.discountId }, data: { qrToken: 'a'.repeat(48), displayTitle: 'QR legacy' } });
    const qrBlocked = await errorOf(() => svc.admin.sendQrEmail(tenantId, adminId, 'ADMIN', profileA, Q.discountId));
    check(codeOf(qrBlocked) === ErrorCode.BENEFIT_AGREEMENT_NOT_FOUND, 'APPROVED + no CURRENT → sendQrEmail blocked');
    check((await prisma.gastroDiscount.findUniqueOrThrow({ where: { id: Q.discountId } })).status === 'APPROVED', 'stays APPROVED');
    await insertG10Agreement(prisma, seed, { gastroProfileId: profileA, gastroDiscountId: Q.discountId }, { unitPriceCents: 400000n, validFrom: '2026-01-01' });
    await svc.admin.sendQrEmail(tenantId, adminId, 'ADMIN', profileA, Q.discountId);
    check((await prisma.gastroDiscount.findUniqueOrThrow({ where: { id: Q.discountId } })).status === 'ACTIVE', 'with own CURRENT → APPROVED → ACTIVE');
  });

  if (result === 'NOT_RUN') {
    console.log('\nG10.B2 activation paths: DB integration NOT RUN');
    return;
  }
  if (failures > 0) {
    console.error(`\n${failures} G10.B2 check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll G10.B2 activation path checks passed (PostgreSQL).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

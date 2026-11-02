/**
 * G10.A — isolated PostgreSQL seed for discount-scoped agreements, backfill and pricing.
 * Everything lives in a throwaway tenant removed by `cleanupG10Tenant` (even on failure).
 */

import { randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AuditService } from '../../src/modules/audit/audit.service';
import { BenefitCommercialAgreementsService } from '../../src/modules/benefit-agreements/benefit-commercial-agreements.service';
import { BenefitDiscountAgreementHistoryService } from '../../src/modules/benefit-agreements/benefit-discount-agreement-history.service';
import { CourtesyCreditLedgerService } from '../../src/modules/courtesy-credit-ledger/courtesy-credit-ledger.service';
import { BenefitSettlementEligibilityService } from '../../src/modules/benefit-settlements/benefit-settlement-eligibility.service';
import { BenefitSettlementsService } from '../../src/modules/benefit-settlements/benefit-settlements.service';
import { BenefitSettlementPendingValidationsService } from '../../src/modules/benefit-settlements/benefit-settlement-pending-validations.service';
import { BenefitSettlementIntegrityService } from '../../src/modules/benefit-settlements/benefit-settlement-integrity.service';

const hex = (n: number) => randomBytes(n).toString('hex');

export function buildG10Services(prisma: PrismaService) {
  const audit = { logAction: async () => undefined } as unknown as AuditService;
  const ledger = new CourtesyCreditLedgerService(prisma, audit);
  const eligibility = new BenefitSettlementEligibilityService(prisma);
  return {
    agreements: new BenefitCommercialAgreementsService(prisma, audit),
    discountHistory: new BenefitDiscountAgreementHistoryService(prisma),
    ledger,
    eligibility,
    settlements: new BenefitSettlementsService(prisma, audit, eligibility, ledger),
    pending: new BenefitSettlementPendingValidationsService(prisma, eligibility),
    integrity: new BenefitSettlementIntegrityService(prisma),
  };
}

export type G10Seed = {
  tenantId: string;
  adminId: string;
  profileA: string;
  profileB: string;
  eventA: string;
  eventB: string;
  operatorId: string;
  activityEventId: string;
};

export async function seedG10Tenant(prisma: PrismaService): Promise<G10Seed> {
  const tag = `g10-${hex(4)}`;
  const tenant = await prisma.tenant.create({ data: { name: `G10 agreements ${tag}` } });
  const admin = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: `${tag}@g10.test`,
      firstName: 'G10',
      lastName: 'Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
  const profile = (name: string) =>
    prisma.gastroProfile.create({
      data: { tenantId: tenant.id, displayName: `${tag} ${name}`, status: 'ACTIVE' },
    });
  const [profileA, profileB] = [await profile('Local A'), await profile('Local B')];
  const event = (title: string, category: string) =>
    prisma.event.create({
      data: {
        tenantId: tenant.id,
        producerId: admin.id,
        category,
        title,
        startAt: new Date('2026-01-01T03:00:00.000Z'),
      },
    });
  const [eventA, eventB] = [await event(`${tag} A`, 'gastro'), await event(`${tag} B`, 'gastro')];
  const operator = await prisma.excursionOperator.create({
    data: { tenantId: tenant.id, name: `${tag} Operador` },
  });
  const activityEvent = await event(`${tag} Actividad`, 'excursion');
  return {
    tenantId: tenant.id,
    adminId: admin.id,
    profileA: profileA.id,
    profileB: profileB.id,
    eventA: eventA.id,
    eventB: eventB.id,
    operatorId: operator.id,
    activityEventId: activityEvent.id,
  };
}

export type DiscountOptions = {
  profileId: string;
  eventId: string;
  courtesy?: boolean;
  status?: 'PENDING_REVIEW' | 'ACTIVE' | 'REJECTED' | 'EXPIRED' | 'CANCELLED' | 'APPROVED';
  createdAt?: string;
  archivedAt?: string;
};

export async function createG10Discount(prisma: PrismaService, seed: G10Seed, opts: DiscountOptions) {
  const discount = await prisma.gastroDiscount.create({
    data: {
      tenantId: seed.tenantId,
      eventId: opts.eventId,
      gastroProfileId: opts.profileId,
      code: `G10-${hex(4)}`,
      type: 'PERCENT',
      value: opts.courtesy ? 0 : 10,
      status: opts.status ?? 'ACTIVE',
      visibility: opts.courtesy ? 'COURTESY_ONLY' : 'PUBLIC',
      createdByOrigin: 'ADMIN',
      createdByUserId: seed.adminId,
      ...(opts.createdAt ? { createdAt: new Date(opts.createdAt) } : {}),
      ...(opts.archivedAt ? { archivedAt: new Date(opts.archivedAt) } : {}),
    },
  });
  const campaign = opts.courtesy
    ? await prisma.gastroCourtesyCampaign.create({
        data: {
          tenantId: seed.tenantId,
          gastroProfileId: opts.profileId,
          discountId: discount.id,
          title: 'Cortesía G10',
          createdByUserId: seed.adminId,
        },
      })
    : null;
  return { discountId: discount.id, campaignId: campaign?.id ?? null };
}

/** Claims redeemed like the scanner: claim → USED + one validation per claim. */
export async function redeemG10Uses(
  prisma: PrismaService,
  seed: G10Seed,
  params: { discountId: string; campaignId?: string | null; uses: number; validatedAt: string },
): Promise<string[]> {
  const ids: string[] = [];
  const base = new Date(params.validatedAt).getTime();
  for (let i = 0; i < params.uses; i += 1) {
    const validatedAt = new Date(base + i * 60_000);
    const claim = await prisma.gastroDiscountClaim.create({
      data: {
        tenantId: seed.tenantId,
        discountId: params.discountId,
        courtesyCampaignId: params.campaignId ?? null,
        email: `u${i}-${hex(3)}@g10.test`,
        qrToken: hex(24),
        accessToken: hex(32),
        shortCode: hex(4).toUpperCase(),
        type: params.campaignId ? 'COURTESY' : 'PUBLIC_REQUEST',
        status: 'USED',
        usedAt: validatedAt,
      },
    });
    const v = await prisma.gastroDiscountValidation.create({
      data: { discountId: params.discountId, claimId: claim.id, validatedAt },
    });
    ids.push(v.id);
  }
  return ids;
}

export type AgreementTerms = {
  unitPriceCents: bigint;
  barterMultiplier?: string;
  validFrom: string;
  validTo?: string;
};

/** Direct insert (test setup only). Discount-scoped when `gastroDiscountId` is given, else legacy. */
export async function insertG10Agreement(
  prisma: PrismaService,
  seed: G10Seed,
  scope: { gastroProfileId: string; gastroDiscountId?: string },
  terms: AgreementTerms,
) {
  return prisma.benefitCommercialAgreement.create({
    data: {
      tenantId: seed.tenantId,
      vertical: 'GASTRO',
      gastroProfileId: scope.gastroProfileId,
      gastroDiscountId: scope.gastroDiscountId ?? null,
      unitPriceCents: terms.unitPriceCents,
      barterMultiplier: terms.barterMultiplier ?? '2',
      validFrom: new Date(terms.validFrom),
      validTo: terms.validTo ? new Date(terms.validTo) : null,
      createdByUserId: seed.adminId,
    },
  });
}

export async function fundG10Courtesy(
  prisma: PrismaService,
  ledger: CourtesyCreditLedgerService,
  seed: G10Seed,
  params: { profileId: string; campaignId: string; imputedValueCents: bigint },
) {
  await prisma.courtesyCreditLedgerEntry.create({
    data: {
      tenantId: seed.tenantId,
      vertical: 'GASTRO',
      gastroProfileId: params.profileId,
      type: 'ADJUSTMENT',
      amountCents: params.imputedValueCents,
      adjustmentReason: 'G10 test seed credit',
      createdByUserId: seed.adminId,
    },
  });
  return prisma.$transaction((tx) =>
    ledger.debitForGastroCourtesyCampaign(tx as Prisma.TransactionClient, {
      tenantId: seed.tenantId,
      gastroProfileId: params.profileId,
      campaignId: params.campaignId,
      imputedValueCents: params.imputedValueCents,
      currency: 'ARS',
      actorId: seed.adminId,
    }),
  );
}

export async function cleanupG10Tenant(prisma: PrismaService, tenantId: string): Promise<void> {
  await prisma.courtesyCreditLedgerEntry.deleteMany({ where: { tenantId, reversalOfEntryId: { not: null } } });
  await prisma.courtesyCreditLedgerEntry.deleteMany({ where: { tenantId } });
  await prisma.benefitSettlementUsageAllocation.deleteMany({ where: { tenantId } });
  await prisma.benefitSettlementTransfer.deleteMany({ where: { tenantId } });
  await prisma.benefitSettlement.deleteMany({ where: { tenantId } });
  await prisma.benefitCommercialAgreement.deleteMany({ where: { tenantId, derivedFromAgreementId: { not: null } } });
  await prisma.benefitCommercialAgreement.deleteMany({ where: { tenantId } });
  await prisma.activityCouponValidation.deleteMany({ where: { coupon: { tenantId } } });
  await prisma.activityCouponClaim.deleteMany({ where: { tenantId } });
  await prisma.activityCoupon.deleteMany({ where: { tenantId } });
  await prisma.gastroDiscountValidation.deleteMany({ where: { discount: { tenantId } } });
  await prisma.gastroDiscountClaim.deleteMany({ where: { tenantId } });
  await prisma.gastroCourtesyCampaign.deleteMany({ where: { tenantId } });
  await prisma.gastroDiscount.deleteMany({ where: { tenantId } });
  await prisma.event.deleteMany({ where: { tenantId } });
  await prisma.excursionOperator.deleteMany({ where: { tenantId } });
  await prisma.gastroProfile.deleteMany({ where: { tenantId } });
  await prisma.user.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });
}

export async function withG10Db(
  run: (prisma: PrismaService, seed: G10Seed) => Promise<void>,
): Promise<'PASS' | 'NOT_RUN'> {
  const prisma = new PrismaService();
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    console.log('\nDB integration: NOT RUN — PostgreSQL no disponible');
    return 'NOT_RUN';
  }
  let seed: G10Seed | null = null;
  try {
    seed = await seedG10Tenant(prisma);
    await run(prisma, seed);
    return 'PASS';
  } finally {
    if (seed) await cleanupG10Tenant(prisma, seed.tenantId);
    await prisma.$disconnect();
  }
}

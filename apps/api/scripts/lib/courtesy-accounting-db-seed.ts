/**
 * G8.11 — isolated PostgreSQL seed for courtesy accounting scenarios.
 * Everything lives in a throwaway tenant and is removed by `cleanupTenant`.
 */

import { randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AuditService } from '../../src/modules/audit/audit.service';
import { CourtesyCreditLedgerService } from '../../src/modules/courtesy-credit-ledger/courtesy-credit-ledger.service';
import { BenefitSettlementEligibilityService } from '../../src/modules/benefit-settlements/benefit-settlement-eligibility.service';
import { BenefitSettlementsService } from '../../src/modules/benefit-settlements/benefit-settlements.service';
import { BenefitSettlementPendingValidationsService } from '../../src/modules/benefit-settlements/benefit-settlement-pending-validations.service';
import { BenefitSettlementIntegrityService } from '../../src/modules/benefit-settlements/benefit-settlement-integrity.service';
import { GastroDiscountEconomicReportingService } from '../../src/modules/benefit-settlements/gastro-discount-economic-reporting.service';

const hex = (n: number) => randomBytes(n).toString('hex');

export function buildServices(prisma: PrismaService) {
  const audit = { logAction: async () => undefined } as unknown as AuditService;
  const ledger = new CourtesyCreditLedgerService(prisma, audit);
  const eligibility = new BenefitSettlementEligibilityService(prisma);
  return {
    ledger,
    eligibility,
    settlements: new BenefitSettlementsService(prisma, audit, eligibility, ledger),
    pending: new BenefitSettlementPendingValidationsService(prisma, eligibility),
    integrity: new BenefitSettlementIntegrityService(prisma),
    economic: new GastroDiscountEconomicReportingService(prisma, ledger),
  };
}

export type Seed = {
  tenantId: string;
  adminId: string;
  profileA: string;
  profileB: string;
  eventA: string;
  eventB: string;
};

export async function seedTenant(prisma: PrismaService): Promise<Seed> {
  const tag = `g811-${hex(4)}`;
  const tenant = await prisma.tenant.create({ data: { name: `G8.11 accounting ${tag}` } });
  const admin = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: `${tag}@g811.test`,
      firstName: 'G811',
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
  const event = (title: string) =>
    prisma.event.create({
      data: {
        tenantId: tenant.id,
        producerId: admin.id,
        category: 'gastro',
        title,
        startAt: new Date('2026-01-01T03:00:00.000Z'),
      },
    });
  const [eventA, eventB] = [await event(`${tag} A`), await event(`${tag} B`)];
  return {
    tenantId: tenant.id,
    adminId: admin.id,
    profileA: profileA.id,
    profileB: profileB.id,
    eventA: eventA.id,
    eventB: eventB.id,
  };
}

export async function createAgreement(
  prisma: PrismaService,
  seed: Seed,
  gastroProfileId: string,
  terms: { unitPriceCents: bigint; barterMultiplier: string; validFrom: string; validTo?: string },
) {
  return prisma.benefitCommercialAgreement.create({
    data: {
      tenantId: seed.tenantId,
      vertical: 'GASTRO',
      gastroProfileId,
      unitPriceCents: terms.unitPriceCents,
      barterMultiplier: terms.barterMultiplier,
      validFrom: new Date(terms.validFrom),
      validTo: terms.validTo ? new Date(terms.validTo) : null,
      createdByUserId: seed.adminId,
    },
  });
}

type BenefitKind = 'DISCOUNT' | 'COURTESY';

/** Creates a discount (or courtesy discount + campaign) and `uses` redeemed claims + validations. */
export async function createRedeemedBenefit(
  prisma: PrismaService,
  seed: Seed,
  params: {
    profileId: string;
    eventId: string;
    kind: BenefitKind;
    uses: number;
    validatedAt: string;
    /** Courtesy only: funds the campaign with DEBIT_COURTESY in the creation transaction. */
    fundWith?: { ledger: CourtesyCreditLedgerService; imputedValueCents: bigint };
  },
) {
  const courtesy = params.kind === 'COURTESY';
  const created = await prisma.$transaction(async (tx) => {
    const discount = await tx.gastroDiscount.create({
      data: {
        tenantId: seed.tenantId,
        eventId: params.eventId,
        gastroProfileId: params.profileId,
        code: `G811-${hex(4)}`,
        type: 'PERCENT',
        value: courtesy ? 0 : 10,
        status: 'ACTIVE',
        visibility: courtesy ? 'COURTESY_ONLY' : 'PUBLIC',
        createdByOrigin: 'ADMIN',
        createdByUserId: seed.adminId,
      },
    });
    const campaign = courtesy
      ? await tx.gastroCourtesyCampaign.create({
          data: {
            tenantId: seed.tenantId,
            gastroProfileId: params.profileId,
            discountId: discount.id,
            title: 'Cortesía G8.11',
            discountLabel: '2x1',
            createdByUserId: seed.adminId,
          },
        })
      : null;
    const claimIds: string[] = [];
    for (let i = 0; i < params.uses; i += 1) {
      const claim = await tx.gastroDiscountClaim.create({
        data: {
          tenantId: seed.tenantId,
          discountId: discount.id,
          courtesyCampaignId: campaign?.id ?? null,
          email: `u${i}-${hex(3)}@g811.test`,
          qrToken: hex(24),
          accessToken: hex(32),
          shortCode: hex(4).toUpperCase(),
          type: courtesy ? 'COURTESY' : 'PUBLIC_REQUEST',
          status: 'ACTIVE',
        },
      });
      claimIds.push(claim.id);
    }
    let debitEntryId: string | null = null;
    if (campaign && params.fundWith) {
      const { entry } = await params.fundWith.ledger.debitForGastroCourtesyCampaign(
        tx as Prisma.TransactionClient,
        {
          tenantId: seed.tenantId,
          gastroProfileId: params.profileId,
          campaignId: campaign.id,
          imputedValueCents: params.fundWith.imputedValueCents,
          currency: 'ARS',
          actorId: seed.adminId,
        },
      );
      debitEntryId = entry.id;
    }
    return { discountId: discount.id, campaignId: campaign?.id ?? null, claimIds, debitEntryId };
  });

  // Redemption (same writes as the scanner): claim → USED + one validation per claim.
  const validationIds: string[] = [];
  const base = new Date(params.validatedAt).getTime();
  for (const [i, claimId] of created.claimIds.entries()) {
    const validatedAt = new Date(base + i * 60_000);
    await prisma.gastroDiscountClaim.update({
      where: { id: claimId },
      data: { status: 'USED', usedAt: validatedAt },
    });
    const v = await prisma.gastroDiscountValidation.create({
      data: { discountId: created.discountId, claimId, validatedAt },
    });
    validationIds.push(v.id);
  }
  return { ...created, validationIds };
}

export async function cleanupTenant(prisma: PrismaService, tenantId: string): Promise<void> {
  await prisma.courtesyCreditLedgerEntry.deleteMany({ where: { tenantId, reversalOfEntryId: { not: null } } });
  await prisma.courtesyCreditLedgerEntry.deleteMany({ where: { tenantId } });
  await prisma.benefitSettlementUsageAllocation.deleteMany({ where: { tenantId } });
  await prisma.benefitSettlementTransfer.deleteMany({ where: { tenantId } });
  await prisma.benefitSettlement.deleteMany({ where: { tenantId } });
  await prisma.benefitCommercialAgreement.deleteMany({ where: { tenantId } });
  await prisma.gastroDiscountValidation.deleteMany({ where: { discount: { tenantId } } });
  await prisma.gastroDiscountClaim.deleteMany({ where: { tenantId } });
  await prisma.gastroCourtesyCampaign.deleteMany({ where: { tenantId } });
  await prisma.gastroDiscount.deleteMany({ where: { tenantId } });
  await prisma.event.deleteMany({ where: { tenantId } });
  await prisma.gastroProfile.deleteMany({ where: { tenantId } });
  await prisma.user.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });
}

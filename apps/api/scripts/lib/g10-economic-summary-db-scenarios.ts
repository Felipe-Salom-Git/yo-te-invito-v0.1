/**
 * G10.C — shared PostgreSQL fixture for the per-discount economic summary.
 * Builds scenarios A–H on one local (profile A) inside a throwaway G10 tenant.
 * Attributed transfers are inserted as controlled DB fixtures: the attributed write path is G10.D.
 */

import { PrismaService } from '../../src/prisma/prisma.service';
import { AuditService } from '../../src/modules/audit/audit.service';
import { BenefitCommercialAgreementsService } from '../../src/modules/benefit-agreements/benefit-commercial-agreements.service';
import { GastroDiscountEconomicSummaryService } from '../../src/modules/benefit-settlements/gastro-discount-economic-summary.service';
import {
  buildG10Services,
  createG10Discount,
  fundG10Courtesy,
  insertG10Agreement,
  redeemG10Uses,
  type G10Seed,
} from './g10-agreements-db-seed';

const FROM = '2026-01-01T03:00:00.000Z';
export const INTERNAL_AGREEMENT_NOTE = 'nota interna del contrato G10C';
export const INTERNAL_TRANSFER_NOTE = 'nota interna del pago G10C';
export const PROOF_URL = 'https://example.test/g10c-proof.pdf';

export function buildEconomicSummaryServices(prisma: PrismaService) {
  const base = buildG10Services(prisma);
  const audit = new AuditService(prisma);
  return {
    ...base,
    auditedAgreements: new BenefitCommercialAgreementsService(prisma, audit),
    summary: new GastroDiscountEconomicSummaryService(prisma, base.ledger, base.discountHistory),
  };
}

export type EconomicSummaryFixture = Awaited<ReturnType<typeof seedEconomicSummaryScenarios>>;

export async function seedEconomicSummaryScenarios(prisma: PrismaService, seed: G10Seed) {
  const svc = buildEconomicSummaryServices(prisma);
  const actor = { id: seed.adminId, role: 'ADMIN' };
  const { tenantId, profileA } = seed;
  const onA = { profileId: profileA, eventId: seed.eventA };

  const legacy = await insertG10Agreement(prisma, seed, { gastroProfileId: profileA }, { unitPriceCents: 999900n, validFrom: '2025-01-01T03:00:00.000Z' });
  const A = await createG10Discount(prisma, seed, onA);
  const B = await createG10Discount(prisma, seed, onA);
  const E = await createG10Discount(prisma, seed, onA);
  const F = await createG10Discount(prisma, seed, { ...onA, courtesy: true });
  const G = await createG10Discount(prisma, seed, onA);
  await fundG10Courtesy(prisma, svc.ledger, seed, { profileId: profileA, campaignId: F.campaignId!, imputedValueCents: 200000n });

  const agA = await svc.auditedAgreements.create(tenantId, actor, {
    vertical: 'GASTRO',
    gastroProfileId: profileA,
    gastroDiscountId: A.discountId,
    unitPriceCents: '500000',
    barterMultiplier: '2',
    currency: 'ARS',
    validFrom: '2026-01-01',
    notes: INTERNAL_AGREEMENT_NOTE,
  });
  await insertG10Agreement(prisma, seed, { gastroProfileId: profileA, gastroDiscountId: B.discountId }, { unitPriceCents: 500000n, validFrom: FROM });
  await insertG10Agreement(prisma, seed, { gastroProfileId: profileA, gastroDiscountId: E.discountId }, { unitPriceCents: 500000n, barterMultiplier: '2', validFrom: FROM });

  const vA = await redeemG10Uses(prisma, seed, { discountId: A.discountId, uses: 10, validatedAt: '2026-11-02T15:00:00.000Z' });
  const vB = await redeemG10Uses(prisma, seed, { discountId: B.discountId, uses: 6, validatedAt: '2026-11-03T15:00:00.000Z' });
  const vE = await redeemG10Uses(prisma, seed, { discountId: E.discountId, uses: 4, validatedAt: '2026-11-04T15:00:00.000Z' });
  await redeemG10Uses(prisma, seed, { discountId: F.discountId, campaignId: F.campaignId, uses: 2, validatedAt: '2026-11-05T15:00:00.000Z' });
  await redeemG10Uses(prisma, seed, { discountId: G.discountId, uses: 2, validatedAt: '2026-11-06T15:00:00.000Z' });

  const s = await svc.settlements.generate(tenantId, actor, { vertical: 'GASTRO', gastroProfileId: profileA, periodKey: '2026-11' });
  await svc.settlements.allocate(tenantId, actor, s.id, { mode: 'CASH', validationIds: vA });
  await svc.settlements.allocate(tenantId, actor, s.id, { mode: 'CASH', validationIds: vB });
  await svc.settlements.allocate(tenantId, actor, s.id, { mode: 'BARTER', validationIds: vE });

  return { svc, actor, settlementId: s.id, legacy, agA, A, B, E, F, G };
}

/** H — historical allocation of A priced with the legacy local agreement (pre-G10 snapshot). */
export async function seedLegacyAllocation(
  prisma: PrismaService,
  seed: G10Seed,
  params: { discountId: string; legacyAgreementId: string },
) {
  const [hv] = await redeemG10Uses(prisma, seed, { discountId: params.discountId, uses: 1, validatedAt: '2026-10-02T15:00:00.000Z' });
  const s10 = await prisma.benefitSettlement.create({
    data: { tenantId: seed.tenantId, vertical: 'GASTRO', gastroProfileId: seed.profileA, periodKey: '2026-10' },
  });
  return prisma.benefitSettlementUsageAllocation.create({
    data: {
      tenantId: seed.tenantId,
      settlementId: s10.id,
      validationSource: 'GASTRO_DISCOUNT_VALIDATION',
      validationId: hv!,
      mode: 'CASH',
      agreementId: params.legacyAgreementId,
      unitPriceCents: 999900n,
      barterMultiplier: '2',
      baseAmountCents: 999900n,
    },
  });
}

/** B — controlled attributed transfer (G10.D owns the write path; here only the read is tested). */
export async function insertAttributedTransfer(
  prisma: PrismaService,
  seed: G10Seed,
  params: { settlementId: string; discountId: string | null; amountCents: bigint; reference: string; reversed?: boolean },
) {
  return prisma.benefitSettlementTransfer.create({
    data: {
      tenantId: seed.tenantId,
      settlementId: params.settlementId,
      gastroDiscountId: params.discountId,
      amountCents: params.amountCents,
      transferredAt: new Date('2026-11-20T15:00:00.000Z'),
      reference: params.reference,
      notes: INTERNAL_TRANSFER_NOTE,
      proofUrl: PROOF_URL,
      registeredByUserId: seed.adminId,
      ...(params.reversed
        ? { reversedAt: new Date('2026-11-21T15:00:00.000Z'), reversedByUserId: seed.adminId, reversalReason: 'monto erróneo' }
        : {}),
    },
  });
}

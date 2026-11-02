/**
 * G10.D — PostgreSQL fixture for exact CASH payments / CANJE per discount.
 * Real services (settlements, transfers, economic summary) inside a throwaway G10 tenant.
 */

import { randomBytes } from 'node:crypto';
import type { AuditService } from '../../src/modules/audit/audit.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { BenefitSettlementTransfersService } from '../../src/modules/benefit-settlements/benefit-settlement-transfers.service';
import { GastroDiscountEconomicSummaryService } from '../../src/modules/benefit-settlements/gastro-discount-economic-summary.service';
import {
  buildG10Services,
  createG10Discount,
  insertG10Agreement,
  redeemG10Uses,
  type G10Seed,
} from './g10-agreements-db-seed';

const FROM = '2026-01-01T03:00:00.000Z';
const hex = (n: number) => randomBytes(n).toString('hex');

export type RecordedAudit = { action: string; entityId?: string; metadata?: Record<string, unknown> };

export function buildPaymentServices(prisma: PrismaService) {
  const base = buildG10Services(prisma);
  const events: RecordedAudit[] = [];
  const audit = {
    logAction: async (event: RecordedAudit) => {
      events.push(event);
    },
  } as unknown as AuditService;
  return {
    ...base,
    events,
    transfers: new BenefitSettlementTransfersService(prisma, audit, base.settlements),
    summary: new GastroDiscountEconomicSummaryService(prisma, base.ledger, base.discountHistory),
  };
}

export type PaymentServices = ReturnType<typeof buildPaymentServices>;

/** Discount with its own contract and `uses` claimed validations in the given month. */
export async function pricedDiscount(
  prisma: PrismaService,
  seed: G10Seed,
  params: { profileId: string; eventId: string; unitPriceCents: bigint; multiplier?: string; uses: number; validatedAt: string },
) {
  const d = await createG10Discount(prisma, seed, { profileId: params.profileId, eventId: params.eventId });
  await insertG10Agreement(
    prisma,
    seed,
    { gastroProfileId: params.profileId, gastroDiscountId: d.discountId },
    { unitPriceCents: params.unitPriceCents, barterMultiplier: params.multiplier ?? '2', validFrom: FROM },
  );
  const validationIds = await redeemG10Uses(prisma, seed, { discountId: d.discountId, uses: params.uses, validatedAt: params.validatedAt });
  return { ...d, validationIds };
}

export function cashBody(amountCents: string, gastroDiscountId?: string, reference?: string) {
  return {
    amountCents,
    currency: 'ARS' as const,
    transferredAt: '2026-11-25T15:00:00.000Z',
    ...(reference ? { reference } : {}),
    ...(gastroDiscountId ? { gastroDiscountId } : {}),
  };
}

/** ACTIVITY settlement with ONE CASH usage priced at $2.000 (pre-G10 behavior). */
export async function seedActivityCashSettlement(prisma: PrismaService, svc: PaymentServices, seed: G10Seed) {
  const actor = { id: seed.adminId, role: 'ADMIN' };
  await svc.agreements.create(seed.tenantId, actor, {
    vertical: 'ACTIVITY',
    excursionOperatorId: seed.operatorId,
    unitPriceCents: '200000',
    barterMultiplier: '2',
    currency: 'ARS',
    validFrom: '2026-06-01',
  });
  const coupon = await prisma.activityCoupon.create({
    data: {
      tenantId: seed.tenantId,
      eventId: seed.activityEventId,
      excursionOperatorId: seed.operatorId,
      code: `G10D-${hex(3)}`,
      title: 'Cupón G10.D',
      summary: 's',
      detail: 'd',
      type: 'PERCENT',
      value: 10,
      status: 'ACTIVE',
    },
  });
  const claim = await prisma.activityCouponClaim.create({
    data: {
      tenantId: seed.tenantId,
      couponId: coupon.id,
      email: `a-${hex(3)}@g10d.test`,
      qrToken: hex(24),
      accessToken: hex(32),
      shortCode: hex(4).toUpperCase(),
      status: 'USED',
      usedAt: new Date('2026-11-10T15:00:00.000Z'),
    },
  });
  await prisma.activityCouponValidation.create({
    data: { couponId: coupon.id, claimId: claim.id, result: 'VALID', validatedAt: new Date('2026-11-10T15:00:00.000Z') },
  });
  const s = await svc.settlements.generate(seed.tenantId, actor, {
    vertical: 'ACTIVITY',
    excursionOperatorId: seed.operatorId,
    periodKey: '2026-11',
  });
  await svc.settlements.allocate(seed.tenantId, actor, s.id, { mode: 'CASH', count: 1 });
  return s.id;
}

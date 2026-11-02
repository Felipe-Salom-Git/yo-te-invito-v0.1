/**
 * G10.E3 — seeds a PRE-G10 dataset (production A0 shape, scaled down) with the G9 Prisma client.
 *
 * Usage (scratch DB only, see V3_3_G10_E3_DB_REHEARSAL.md):
 *   G10_PRE_CLIENT=<path to client generated from the pre-G10 schema> \
 *   DATABASE_URL=postgresql://…/yti_g10_rehearsal tsx scripts/g10-rehearsal/seed-pre-g10.ts --out ids.json
 *
 * Shape: P1 legacy contract + 4 discounts (active, approved before contract, rejected, expired with
 * legacy CASH/BARTER history), P2 legacy history of 2 rows, P3/P4 without any contract, P5 legacy +
 * funded courtesy, ACTIVITY operator with agreement / settlement / transfer.
 */
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { REHEARSAL_TENANT_NAME, argValue, assertRehearsalDatabase } from './rehearsal-guard';

const hex = (n: number) => randomBytes(n).toString('hex');
const at = (iso: string) => new Date(iso);

async function main() {
  assertRehearsalDatabase();
  const clientPath = process.env.G10_PRE_CLIENT;
  if (!clientPath) throw new Error('G10_PRE_CLIENT is required (pre-G10 generated Prisma client)');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaClient } = require(clientPath) as { PrismaClient: new () => any };
  const prisma = new PrismaClient();
  try {
    const tenant = await prisma.tenant.create({ data: { name: REHEARSAL_TENANT_NAME } });
    const tenantId: string = tenant.id;
    const admin = await prisma.user.create({
      data: { tenantId, email: `admin-${hex(3)}@g10-rehearsal.test`, firstName: 'Rehearsal', lastName: 'Admin', role: 'ADMIN', status: 'ACTIVE' },
    });
    const profile = (name: string) =>
      prisma.gastroProfile.create({ data: { tenantId, displayName: `Rehearsal ${name}`, status: 'ACTIVE' } });
    const P1 = await profile('P1 contrato');
    const P2 = await profile('P2 historial');
    const P3 = await profile('P3 sin contrato');
    const P4 = await profile('P4 sin contrato');
    const P5 = await profile('P5 cortesía financiada');
    const event = await prisma.event.create({
      data: { tenantId, producerId: admin.id, category: 'gastro', title: 'Rehearsal gastro', startAt: at('2026-01-01T03:00:00.000Z') },
    });

    const discount = (profileId: string, status: string, createdAt: string, courtesy = false) =>
      prisma.gastroDiscount.create({
        data: {
          tenantId,
          eventId: event.id,
          gastroProfileId: profileId,
          code: `REH-${hex(4)}`,
          type: 'PERCENT',
          value: courtesy ? 0 : 10,
          status,
          visibility: courtesy ? 'COURTESY_ONLY' : 'PUBLIC',
          createdByOrigin: 'ADMIN',
          createdByUserId: admin.id,
          createdAt: at(createdAt),
        },
      });
    const use = async (discountId: string, validatedAt: string, campaignId: string | null = null) => {
      const claim = await prisma.gastroDiscountClaim.create({
        data: {
          tenantId,
          discountId,
          courtesyCampaignId: campaignId,
          email: `u-${hex(3)}@g10-rehearsal.test`,
          qrToken: hex(24),
          accessToken: hex(32),
          shortCode: hex(4).toUpperCase(),
          type: campaignId ? 'COURTESY' : 'PUBLIC_REQUEST',
          status: 'USED',
          usedAt: at(validatedAt),
        },
      });
      const v = await prisma.gastroDiscountValidation.create({ data: { discountId, claimId: claim.id, validatedAt: at(validatedAt) } });
      return v.id as string;
    };
    const legacyAgreement = (gastroProfileId: string, unitPriceCents: bigint, validFrom: string, validTo: string | null) =>
      prisma.benefitCommercialAgreement.create({
        data: {
          tenantId,
          vertical: 'GASTRO',
          gastroProfileId,
          unitPriceCents,
          barterMultiplier: '2',
          validFrom: at(validFrom),
          validTo: validTo ? at(validTo) : null,
          createdByUserId: admin.id,
        },
      });

    // ── P1: one open legacy contract ($5.000) ──
    const L1 = await legacyAgreement(P1.id, 500000n, '2026-03-01T03:00:00.000Z', null);
    const D1a = await discount(P1.id, 'ACTIVE', '2026-04-10T15:00:00.000Z');
    const D1b = await discount(P1.id, 'APPROVED', '2026-02-01T15:00:00.000Z');
    const D1c = await discount(P1.id, 'REJECTED', '2026-04-01T15:00:00.000Z');
    const D1d = await discount(P1.id, 'EXPIRED', '2026-03-05T15:00:00.000Z');
    const d1dUses = [await use(D1d.id, '2026-05-10T15:00:00.000Z'), await use(D1d.id, '2026-05-11T15:00:00.000Z')];
    const d1aBarterUse = await use(D1a.id, '2026-05-12T15:00:00.000Z');
    const d1aPending = [await use(D1a.id, '2026-10-15T15:00:00.000Z'), await use(D1a.id, '2026-10-20T15:00:00.000Z')];

    // Legacy settlement (pre-G10): 2 CASH + 1 BARTER priced with the local contract, one partial transfer.
    const S1 = await prisma.benefitSettlement.create({
      data: { tenantId, vertical: 'GASTRO', gastroProfileId: P1.id, periodKey: '2026-05', status: 'CLOSED', createdByUserId: admin.id, closedAt: at('2026-06-05T15:00:00.000Z') },
    });
    const allocation = (validationId: string, mode: 'CASH' | 'BARTER') =>
      prisma.benefitSettlementUsageAllocation.create({
        data: {
          tenantId,
          settlementId: S1.id,
          validationSource: 'GASTRO_DISCOUNT_VALIDATION',
          validationId,
          mode,
          agreementId: L1.id,
          unitPriceCents: 500000n,
          barterMultiplier: '2',
          baseAmountCents: 500000n,
          allocatedByUserId: admin.id,
        },
      });
    await allocation(d1dUses[0], 'CASH');
    await allocation(d1dUses[1], 'CASH');
    const barterAlloc = await allocation(d1aBarterUse, 'BARTER');
    await prisma.courtesyCreditLedgerEntry.create({
      data: { tenantId, vertical: 'GASTRO', gastroProfileId: P1.id, type: 'CREDIT_FROM_SETTLEMENT', amountCents: 1000000n, sourceAllocationId: barterAlloc.id, createdByUserId: admin.id },
    });
    const legacyTransfer = await prisma.benefitSettlementTransfer.create({
      data: { tenantId, settlementId: S1.id, amountCents: 600000n, transferredAt: at('2026-06-10T15:00:00.000Z'), reference: 'LEGACY-PARTIAL', registeredByUserId: admin.id },
    });

    // ── P2: legacy history (closed $4.000 + open $6.000) ──
    const L2a = await legacyAgreement(P2.id, 400000n, '2026-01-01T03:00:00.000Z', '2026-06-30T03:00:00.000Z');
    const L2b = await legacyAgreement(P2.id, 600000n, '2026-07-01T03:00:00.000Z', null);
    const D2a = await discount(P2.id, 'ACTIVE', '2026-03-15T15:00:00.000Z');
    const D2b = await discount(P2.id, 'ACTIVE', '2026-08-01T15:00:00.000Z');
    const d2aPending = [await use(D2a.id, '2026-05-10T15:00:00.000Z'), await use(D2a.id, '2026-09-01T15:00:00.000Z')];

    // ── P3 / P4: no contract at all (must stay without coverage) ──
    const D3a = await discount(P3.id, 'ACTIVE', '2026-06-01T15:00:00.000Z');
    const d3aPending = [await use(D3a.id, '2026-10-01T15:00:00.000Z')];
    const D4a = await discount(P4.id, 'APPROVED', '2026-07-01T15:00:00.000Z');

    // ── P5: legacy contract + funded courtesy (DEBIT_COURTESY) ──
    const L5 = await legacyAgreement(P5.id, 300000n, '2026-01-01T03:00:00.000Z', null);
    const D5a = await discount(P5.id, 'ACTIVE', '2026-09-01T15:00:00.000Z');
    const D5c = await discount(P5.id, 'ACTIVE', '2026-09-10T15:00:00.000Z', true);
    const campaign = await prisma.gastroCourtesyCampaign.create({
      data: { tenantId, gastroProfileId: P5.id, discountId: D5c.id, title: 'Cortesía rehearsal', createdByUserId: admin.id },
    });
    await prisma.courtesyCreditLedgerEntry.create({
      data: { tenantId, vertical: 'GASTRO', gastroProfileId: P5.id, type: 'ADJUSTMENT', amountCents: 200000n, adjustmentReason: 'rehearsal seed credit', createdByUserId: admin.id },
    });
    await prisma.courtesyCreditLedgerEntry.create({
      data: { tenantId, vertical: 'GASTRO', gastroProfileId: P5.id, type: 'DEBIT_COURTESY', amountCents: -200000n, sourceCourtesyCampaignId: campaign.id, createdByUserId: admin.id },
    });
    const d5cUses = [await use(D5c.id, '2026-09-15T15:00:00.000Z', campaign.id)];

    // ── ACTIVITY: agreement + settlement + CASH allocation + transfer (must stay untouched) ──
    const operator = await prisma.excursionOperator.create({ data: { tenantId, name: 'Rehearsal operador' } });
    const activityEvent = await prisma.event.create({
      data: { tenantId, producerId: admin.id, category: 'excursion', title: 'Rehearsal actividad', startAt: at('2026-01-01T03:00:00.000Z') },
    });
    const LA = await prisma.benefitCommercialAgreement.create({
      data: { tenantId, vertical: 'ACTIVITY', excursionOperatorId: operator.id, unitPriceCents: 200000n, barterMultiplier: '2', validFrom: at('2026-01-01T03:00:00.000Z'), createdByUserId: admin.id },
    });
    const coupon = await prisma.activityCoupon.create({
      data: { tenantId, eventId: activityEvent.id, excursionOperatorId: operator.id, code: `REHA-${hex(3)}`, title: 'Cupón rehearsal', summary: 's', detail: 'd', type: 'PERCENT', value: 10, status: 'ACTIVE' },
    });
    const aClaim = await prisma.activityCouponClaim.create({
      data: { tenantId, couponId: coupon.id, email: `a-${hex(3)}@g10-rehearsal.test`, qrToken: hex(24), accessToken: hex(32), shortCode: hex(4).toUpperCase(), status: 'USED', usedAt: at('2026-05-10T15:00:00.000Z') },
    });
    const aValidation = await prisma.activityCouponValidation.create({
      data: { couponId: coupon.id, claimId: aClaim.id, result: 'VALID', validatedAt: at('2026-05-10T15:00:00.000Z') },
    });
    const SA = await prisma.benefitSettlement.create({
      data: { tenantId, vertical: 'ACTIVITY', excursionOperatorId: operator.id, periodKey: '2026-05', status: 'OPEN', createdByUserId: admin.id },
    });
    await prisma.benefitSettlementUsageAllocation.create({
      data: { tenantId, settlementId: SA.id, validationSource: 'ACTIVITY_COUPON_VALIDATION', validationId: aValidation.id, mode: 'CASH', agreementId: LA.id, unitPriceCents: 200000n, barterMultiplier: '2', baseAmountCents: 200000n, allocatedByUserId: admin.id },
    });
    const activityTransfer = await prisma.benefitSettlementTransfer.create({
      data: { tenantId, settlementId: SA.id, amountCents: 100000n, transferredAt: at('2026-06-01T15:00:00.000Z'), reference: 'ACTIVITY-PARTIAL', registeredByUserId: admin.id },
    });

    const ids = {
      tenantId,
      adminId: admin.id,
      profiles: { P1: P1.id, P2: P2.id, P3: P3.id, P4: P4.id, P5: P5.id },
      legacyAgreements: { L1: L1.id, L2a: L2a.id, L2b: L2b.id, L5: L5.id },
      activityAgreement: LA.id,
      discounts: { D1a: D1a.id, D1b: D1b.id, D1c: D1c.id, D1d: D1d.id, D2a: D2a.id, D2b: D2b.id, D3a: D3a.id, D4a: D4a.id, D5a: D5a.id, D5c: D5c.id },
      pendingValidations: { D1a: d1aPending, D2a: d2aPending, D3a: d3aPending, D5c: d5cUses },
      settlements: { S1: S1.id, SA: SA.id },
      transfers: { legacy: legacyTransfer.id, activity: activityTransfer.id },
    };
    const out = argValue('--out');
    if (out) writeFileSync(out, JSON.stringify(ids, null, 2));
    console.log(JSON.stringify(ids, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

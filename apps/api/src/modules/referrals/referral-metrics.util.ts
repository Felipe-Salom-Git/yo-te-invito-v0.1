import type { Prisma } from '@prisma/client';

export type ReferralPerfBucket = {
  paidOrdersCount: number;
  ticketsSoldCount: number;
  attributedGrossCents: number;
};

export function emptyPerf(): ReferralPerfBucket {
  return { paidOrdersCount: 0, ticketsSoldCount: 0, attributedGrossCents: 0 };
}

export function sumPerf(a: ReferralPerfBucket, b: ReferralPerfBucket): ReferralPerfBucket {
  return {
    paidOrdersCount: a.paidOrdersCount + b.paidOrdersCount,
    ticketsSoldCount: a.ticketsSoldCount + b.ticketsSoldCount,
    attributedGrossCents: a.attributedGrossCents + b.attributedGrossCents,
  };
}

export function orderTotalToCents(totalAmount: Prisma.Decimal | number | { toString(): string }): number {
  const n = Number(totalAmount);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function sumOrderTicketQuantities(order: { orderItems: { quantity: number }[] }): number {
  return order.orderItems.reduce((s, it) => s + it.quantity, 0);
}

type AttributionRow = { orderId: string; referralLinkId: string; eventId: string };

type OrderRow = {
  id: string;
  status: string;
  totalAmount: Prisma.Decimal | number;
  orderItems: { quantity: number }[];
};

export function aggregatePaidAttributions(
  attributions: AttributionRow[],
  orderMap: Map<string, OrderRow>,
  linkToReferrer?: Map<string, string>,
): {
  total: ReferralPerfBucket;
  byLinkId: Map<string, ReferralPerfBucket>;
  byEventId: Map<string, ReferralPerfBucket>;
  byReferrerProfileId: Map<string, ReferralPerfBucket>;
} {
  const byLinkId = new Map<string, ReferralPerfBucket>();
  const byEventId = new Map<string, ReferralPerfBucket>();
  const byReferrerProfileId = new Map<string, ReferralPerfBucket>();
  let total = emptyPerf();

  for (const attr of attributions) {
    const order = orderMap.get(attr.orderId);
    if (!order || order.status !== 'PAID') continue;

    const qty = sumOrderTicketQuantities(order);
    const cents = orderTotalToCents(order.totalAmount);
    const slice: ReferralPerfBucket = {
      paidOrdersCount: 1,
      ticketsSoldCount: qty,
      attributedGrossCents: cents,
    };
    total = sumPerf(total, slice);

    const linkCur = byLinkId.get(attr.referralLinkId) ?? emptyPerf();
    byLinkId.set(attr.referralLinkId, sumPerf(linkCur, slice));

    const evCur = byEventId.get(attr.eventId) ?? emptyPerf();
    byEventId.set(attr.eventId, sumPerf(evCur, slice));

    const refId = linkToReferrer?.get(attr.referralLinkId);
    if (refId) {
      const refCur = byReferrerProfileId.get(refId) ?? emptyPerf();
      byReferrerProfileId.set(refId, sumPerf(refCur, slice));
    }
  }

  return { total, byLinkId, byEventId, byReferrerProfileId };
}

export type CommissionRow = {
  id: string;
  amountCents: number;
  status: string;
  agreementId: string | null;
  referrerProfileId: string | null;
  producerProfileId: string | null;
  eventId: string;
  referralLinkId: string;
  updatedAt?: Date;
  createdAt?: Date;
};

export function sumCommissionCents(
  rows: CommissionRow[],
  filter: (c: CommissionRow) => boolean,
): number {
  return rows.filter(filter).reduce((s, c) => s + c.amountCents, 0);
}

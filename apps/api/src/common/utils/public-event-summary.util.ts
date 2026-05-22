import type { Prisma, TicketBatch } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { pickActiveBatch } from '../../ticketing/ticket-batch.service';

/** Public list price unit: major currency units (e.g. ARS pesos), same as TicketType.price Decimal. */
export function decimalToPublicPrice(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : Number(value);
}

export function resolvePublicProducerName(
  profile: { displayName: string } | null | undefined,
): string | null {
  const name = profile?.displayName?.trim();
  return name ? name : null;
}

export type TicketTypeRowForPublicPrice = {
  eventId: string;
  price: Prisma.Decimal;
  salesStartAt: Date | null;
  salesEndAt: Date | null;
  capacityAvailable: number;
  batches: TicketBatch[];
};

/**
 * Lowest sellable unit price for one ACTIVE ticket type at `now`.
 * Mirrors public ticket-types pricing (active batch price, else type price) but only when purchasable.
 * Does not run batch reconciliation (conservative; avoids extra writes on list endpoints).
 */
export function resolveTicketTypeUnitPrice(
  type: Omit<TicketTypeRowForPublicPrice, 'eventId'>,
  now: Date,
): number | null {
  const batches = type.batches ?? [];
  if (batches.length > 0) {
    const active = pickActiveBatch(batches, now);
    if (!active) return null;
    const remaining =
      active.effectiveQuantity - active.soldCount - active.reservedQuantity;
    if (remaining <= 0) return null;
    return decimalToPublicPrice(active.price);
  }

  if (type.salesStartAt && now.getTime() < type.salesStartAt.getTime()) {
    return null;
  }
  if (type.salesEndAt && now.getTime() > type.salesEndAt.getTime()) {
    return null;
  }
  if (type.capacityAvailable <= 0) return null;
  return decimalToPublicPrice(type.price);
}

export function resolveEventFromPrice(typePrices: number[]): number | null {
  if (typePrices.length === 0) return null;
  return Math.min(...typePrices);
}

export type PublicFromPriceCandidate = {
  id: string;
  isTicketingEnabled: boolean;
  isGeneralPublication: boolean;
};

/**
 * Batch-load minimum public ticket price per event (one query for all ticket types + batches).
 */
export async function loadPublicFromPriceByEventId(
  prisma: PrismaService,
  candidates: PublicFromPriceCandidate[],
  now: Date = new Date(),
): Promise<Map<string, number | null>> {
  const result = new Map<string, number | null>();

  for (const c of candidates) {
    if (!c.isTicketingEnabled || c.isGeneralPublication) {
      result.set(c.id, null);
    }
  }

  const eligibleIds = candidates
    .filter((c) => c.isTicketingEnabled && !c.isGeneralPublication)
    .map((c) => c.id);

  if (eligibleIds.length === 0) {
    return result;
  }

  const types = await prisma.ticketType.findMany({
    where: {
      eventId: { in: eligibleIds },
      status: 'ACTIVE',
      deletedAt: null,
    },
    select: {
      eventId: true,
      price: true,
      salesStartAt: true,
      salesEndAt: true,
      capacityAvailable: true,
      batches: { orderBy: { orderIndex: 'asc' } },
    },
  });

  const pricesByEvent = new Map<string, number[]>();
  for (const t of types) {
    const unit = resolveTicketTypeUnitPrice(t, now);
    if (unit == null) continue;
    const list = pricesByEvent.get(t.eventId) ?? [];
    list.push(unit);
    pricesByEvent.set(t.eventId, list);
  }

  for (const id of eligibleIds) {
    result.set(id, resolveEventFromPrice(pricesByEvent.get(id) ?? []));
  }

  return result;
}

export function applyPublicSummaryEnrichment<
  T extends { id: string; fromPrice?: number | null; producerName?: string | null },
>(
  items: T[],
  fromPriceMap: Map<string, number | null>,
  producerNameById: Map<string, string | null>,
): T[] {
  return items.map((item) => ({
    ...item,
    fromPrice: fromPriceMap.get(item.id) ?? null,
    producerName: producerNameById.get(item.id) ?? item.producerName ?? null,
  }));
}

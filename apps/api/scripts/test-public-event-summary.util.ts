/**
 * Unit checks for public list pricing helpers.
 * Run: pnpm --filter api exec tsx scripts/test-public-event-summary.util.ts
 */

import type { TicketBatch } from '@prisma/client';
import {
  resolveEventFromPrice,
  resolvePublicProducerName,
  resolveTicketTypeUnitPrice,
} from '../src/common/utils/public-event-summary.util';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

const now = new Date('2026-06-15T12:00:00.000Z');

const batch = (partial: Partial<TicketBatch> & Pick<TicketBatch, 'orderIndex' | 'price'>): TicketBatch =>
  ({
    id: 'b1',
    tenantId: 't',
    eventId: 'e1',
    ticketTypeId: 'tt1',
    name: 'Tanda 1',
    startAt: new Date('2026-06-01T00:00:00Z'),
    endAt: new Date('2026-12-31T23:59:59Z'),
    baseQuantity: 100,
    rolloverQuantity: 0,
    effectiveQuantity: 100,
    reservedQuantity: 0,
    soldCount: 0,
    currency: 'ARS',
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
    ...partial,
  }) as TicketBatch;

// producerName
assert(resolvePublicProducerName({ displayName: '  Productora X  ' }) === 'Productora X', 'trim displayName');
assert(resolvePublicProducerName(null) === null, 'null profile');
assert(resolvePublicProducerName({ displayName: '   ' }) === null, 'empty displayName');

// fromPrice — no batches
assert(
  resolveTicketTypeUnitPrice(
    {
      price: 1500 as unknown as import('@prisma/client').Prisma.Decimal,
      salesStartAt: null,
      salesEndAt: null,
      capacityAvailable: 10,
      batches: [],
    },
    now,
  ) === 1500,
  'type price without batches',
);

assert(
  resolveTicketTypeUnitPrice(
    {
      price: 0 as unknown as import('@prisma/client').Prisma.Decimal,
      salesStartAt: null,
      salesEndAt: null,
      capacityAvailable: 5,
      batches: [],
    },
    now,
  ) === 0,
  'free ticket price 0',
);

assert(
  resolveTicketTypeUnitPrice(
    {
      price: 100 as unknown as import('@prisma/client').Prisma.Decimal,
      salesStartAt: null,
      salesEndAt: null,
      capacityAvailable: 0,
      batches: [],
    },
    now,
  ) === null,
  'sold out type capacity',
);

// fromPrice — active batch
assert(
  resolveTicketTypeUnitPrice(
    {
      price: 9999 as unknown as import('@prisma/client').Prisma.Decimal,
      salesStartAt: null,
      salesEndAt: null,
      capacityAvailable: 10,
      batches: [batch({ orderIndex: 0, price: 2500 as unknown as import('@prisma/client').Prisma.Decimal })],
    },
    now,
  ) === 2500,
  'active batch price wins',
);

assert(
  resolveTicketTypeUnitPrice(
    {
      price: 100 as unknown as import('@prisma/client').Prisma.Decimal,
      salesStartAt: null,
      salesEndAt: null,
      capacityAvailable: 10,
      batches: [
        batch({
          orderIndex: 0,
          price: 100 as unknown as import('@prisma/client').Prisma.Decimal,
          soldCount: 100,
          effectiveQuantity: 100,
        }),
      ],
    },
    now,
  ) === null,
  'batch sold out',
);

assert(resolveEventFromPrice([3000, 1500, 4000]) === 1500, 'min across types');
assert(resolveEventFromPrice([]) === null, 'no sellable types');

console.log('OK — public-event-summary.util tests passed');

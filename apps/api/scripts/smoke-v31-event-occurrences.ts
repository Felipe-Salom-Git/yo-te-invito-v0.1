/**
 * V3.1 Etapa 7 Slice 7.1 — Event occurrences model smoke.
 * Run: pnpm --filter api run smoke:v31-event-occurrences
 * Requires: Postgres up, migration 20260617120000_event_occurrences applied.
 */

import { PrismaClient } from '@prisma/client';
import {
  deriveEventStartAtFromOccurrences,
  isMultiDateEvent,
  resolveEventDisplayStartAt,
  resolveNextVisibleOccurrence,
} from '@yo-te-invito/shared';
import { EventOccurrencesService } from '../src/modules/event-occurrences/event-occurrences.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { SMOKE_TEST_MARKER } from './lib/smoke-constants';
import { runSmokeScript } from './lib/smoke-runner';

const TENANT = process.env.SMOKE_TENANT_ID ?? 'tenant-demo';
const MARKER = `${SMOKE_TEST_MARKER} v31-occurrences`;

type Cleanup = { eventIds: string[]; occurrenceIds: string[] };

function pass(label: string) {
  console.log(`  OK ${label}`);
}

function fail(label: string, detail?: string) {
  console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
}

async function assertSchema(prisma: PrismaClient): Promise<boolean> {
  let ok = true;
  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'EventOccurrence'
  `;
  if (tables.length === 0) {
    fail('table EventOccurrence');
    ok = false;
  } else {
    pass('table EventOccurrence');
  }

  const col = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'TicketType' AND column_name = 'occurrenceId'
  `;
  if (col.length === 0) {
    fail('TicketType.occurrenceId column');
    ok = false;
  } else {
    pass('TicketType.occurrenceId column');
  }
  return ok;
}

async function smokeLegacyEvent(prisma: PrismaClient, cleanup: Cleanup): Promise<boolean> {
  let ok = true;
  const producer = await prisma.producerProfile.findFirst({
    where: { tenantId: TENANT, status: 'ACTIVE' },
    select: { id: true },
  });
  const producerId =
    producer?.id ??
    (await prisma.user.findFirst({ where: { tenantId: TENANT }, select: { id: true } }))?.id;
  if (!producerId) {
    fail('producerId for legacy event');
    return false;
  }

  const legacyStart = new Date(Date.now() + 7 * 86400000);
  const event = await prisma.event.create({
    data: {
      tenantId: TENANT,
      producerId,
      title: `${MARKER} legacy single-date`,
      category: 'event',
      status: 'DRAFT',
      startAt: legacyStart,
    },
    select: { id: true, startAt: true },
  });
  cleanup.eventIds.push(event.id);

  const occurrences = await prisma.eventOccurrence.findMany({ where: { eventId: event.id } });
  if (occurrences.length !== 0) {
    fail('legacy event should have zero occurrences');
    ok = false;
  } else {
    pass('legacy event has no occurrences');
  }

  if (isMultiDateEvent(occurrences)) {
    fail('isMultiDateEvent should be false for legacy');
    ok = false;
  } else {
    pass('isMultiDateEvent false for legacy');
  }

  const displayStart = resolveEventDisplayStartAt({ startAt: event.startAt }, occurrences);
  if (displayStart.getTime() !== event.startAt.getTime()) {
    fail('resolveEventDisplayStartAt legacy', `${displayStart.toISOString()} vs ${event.startAt.toISOString()}`);
    ok = false;
  } else {
    pass('resolveEventDisplayStartAt uses Event.startAt for legacy');
  }

  const legacyTypes = await prisma.ticketType.findMany({
    where: { eventId: event.id, deletedAt: null },
    select: { occurrenceId: true },
  });
  if (legacyTypes.some((t) => t.occurrenceId != null)) {
    fail('legacy ticket types should have null occurrenceId');
    ok = false;
  } else {
    pass('legacy ticket types keep occurrenceId null');
  }

  return ok;
}

async function smokeOccurrenceCrud(
  prisma: PrismaService,
  cleanup: Cleanup,
): Promise<boolean> {
  const service = new EventOccurrencesService(prisma);
  let ok = true;

  const producer = await prisma.producerProfile.findFirst({
    where: { tenantId: TENANT, status: 'ACTIVE' },
    select: { id: true },
  });
  const producerId =
    producer?.id ??
    (await prisma.user.findFirst({ where: { tenantId: TENANT }, select: { id: true } }))?.id;
  if (!producerId) {
    fail('producerId for multi-date event');
    return false;
  }

  const event = await prisma.event.create({
    data: {
      tenantId: TENANT,
      producerId,
      title: `${MARKER} multi-date`,
      category: 'event',
      status: 'DRAFT',
      startAt: new Date(Date.now() + 10 * 86400000),
    },
    select: { id: true, startAt: true },
  });
  cleanup.eventIds.push(event.id);

  const dateA = new Date(Date.now() + 14 * 86400000);
  const dateB = new Date(Date.now() + 21 * 86400000);

  const occA = await service.createForEvent(TENANT, event.id, {
    startAt: dateA.toISOString(),
    venueName: 'Teatro A',
    city: 'Bariloche',
    capacity: 200,
  });
  cleanup.occurrenceIds.push(occA.id);

  const occB = await service.createForEvent(TENANT, event.id, {
    startAt: dateB.toISOString(),
    venueName: 'Teatro B',
    city: 'San Martín',
    sortOrder: 1,
  });
  cleanup.occurrenceIds.push(occB.id);

  if (occA.tenantId !== TENANT || occB.eventId !== event.id) {
    fail('create occurrence tenant/event linkage');
    ok = false;
  } else {
    pass('create two occurrences for event');
  }

  const listed = await service.listForEvent(TENANT, event.id);
  if (listed.length !== 2) {
    fail('list occurrences', `count=${listed.length}`);
    ok = false;
  } else {
    pass('list occurrences for event');
  }

  try {
    await service.createForEvent('other-tenant', event.id, {
      startAt: dateA.toISOString(),
    });
    fail('create occurrence for foreign tenant should throw');
    ok = false;
  } catch (e: unknown) {
    const status = (e as { status?: number }).status;
    if (status === 404) {
      pass('cannot create occurrence for event in another tenant');
    } else {
      fail('foreign tenant guard', String(e));
      ok = false;
    }
  }

  service.assertTenantMatch(TENANT, occA.tenantId);
  pass('assertTenantMatch same tenant');

  try {
    service.assertTenantMatch('wrong-tenant', occA.tenantId);
    fail('assertTenantMatch should throw for mismatch');
    ok = false;
  } catch (e: unknown) {
    const status = (e as { status?: number }).status;
    if (status === 403) {
      pass('assertTenantMatch rejects wrong tenant');
    } else {
      fail('assertTenantMatch mismatch', String(e));
      ok = false;
    }
  }

  const rows = await prisma.eventOccurrence.findMany({ where: { eventId: event.id } });
  if (!isMultiDateEvent(rows)) {
    fail('isMultiDateEvent should be true');
    ok = false;
  } else {
    pass('isMultiDateEvent true with occurrences');
  }

  const next = resolveNextVisibleOccurrence(rows);
  if (!next || next.id !== occA.id) {
    fail('resolveNextVisibleOccurrence', next?.id);
    ok = false;
  } else {
    pass('resolveNextVisibleOccurrence picks earliest future ACTIVE');
  }

  const derivedStart = deriveEventStartAtFromOccurrences(rows);
  if (!derivedStart || derivedStart.getTime() !== dateA.getTime()) {
    fail('deriveEventStartAtFromOccurrences');
    ok = false;
  } else {
    pass('deriveEventStartAtFromOccurrences');
  }

  const displayStart = resolveEventDisplayStartAt({ startAt: event.startAt }, rows);
  if (displayStart.getTime() !== dateA.getTime()) {
    fail('resolveEventDisplayStartAt multi-date');
    ok = false;
  } else {
    pass('resolveEventDisplayStartAt uses next occurrence for multi-date');
  }

  const ticketType = await prisma.ticketType.create({
    data: {
      tenantId: TENANT,
      eventId: event.id,
      occurrenceId: occA.id,
      name: `${MARKER} GA`,
      price: 5000,
      capacityTotal: 100,
      capacityAvailable: 100,
    },
    select: { id: true },
  });

  try {
    await service.assertTicketTypeMatchesOccurrence(TENANT, event.id, ticketType.id, occB.id);
    fail('ticket type on occA should not match occB');
    ok = false;
  } catch (e: unknown) {
    const status = (e as { status?: number }).status;
    if (status === 400) {
      pass('assertTicketTypeMatchesOccurrence rejects wrong date');
    } else {
      fail('assertTicketTypeMatchesOccurrence', String(e));
      ok = false;
    }
  }

  await service.assertTicketTypeMatchesOccurrence(TENANT, event.id, ticketType.id, occA.id);
  pass('assertTicketTypeMatchesOccurrence accepts correct date');

  await prisma.ticketType.delete({ where: { id: ticketType.id } });

  return ok;
}

async function main(): Promise<number> {
  const prisma = new PrismaClient();
  const prismaService = prisma as unknown as PrismaService;
  const cleanup: Cleanup = { eventIds: [], occurrenceIds: [] };
  let exitCode = 0;

  console.log('\n=== V3.1 event occurrences model smoke ===\n');

  try {
    await prisma.$connect();
    pass('DB connect');

    if (!(await assertSchema(prisma))) exitCode = 1;
    if (exitCode === 0 && !(await smokeLegacyEvent(prisma, cleanup))) exitCode = 1;
    if (exitCode === 0 && !(await smokeOccurrenceCrud(prismaService, cleanup))) exitCode = 1;
  } catch (e) {
    fail('unexpected', String(e));
    exitCode = 1;
  } finally {
    for (const eventId of cleanup.eventIds) {
      await prisma.ticketType.deleteMany({ where: { eventId } });
      await prisma.eventOccurrence.deleteMany({ where: { eventId } });
      await prisma.event.delete({ where: { id: eventId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  }

  if (exitCode === 0) console.log('\nAll event occurrences smoke checks passed.\n');
  return exitCode;
}

void runSmokeScript('v31-event-occurrences', main);

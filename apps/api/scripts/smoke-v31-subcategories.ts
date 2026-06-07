/**
 * V3.1 Slice 8.5 — EventSubcategory / multi-subcategory excursions smoke.
 * Run: pnpm --filter api run smoke:v31-subcategories
 * Requires: Postgres up, all migrations applied (incl. 20260612120000_event_subcategories).
 * Optional API: API on :3001 for public list/detail checks.
 */

import { PrismaClient } from '@prisma/client';
import {
  mapEventSubcategoriesPublic,
  resolveValidatedExcursionSubcategories,
  subcategoryFilterWhere,
  syncEventSubcategories,
} from '../src/common/event-subcategories.util';
import { SMOKE_TEST_MARKER } from './lib/smoke-constants';
import { runSmokeScript } from './lib/smoke-runner';

const TENANT = process.env.SMOKE_TENANT_ID ?? 'tenant-demo';
const MARKER = `${SMOKE_TEST_MARKER} v31-subcategories`;

type CleanupIds = {
  eventIds: string[];
  operatorId?: string;
};

function pass(label: string) {
  console.log(`  OK ${label}`);
}

function fail(label: string, detail?: string) {
  console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
}

async function assertEventSubcategorySchema(prisma: PrismaClient): Promise<boolean> {
  let ok = true;
  const columns = ['eventId', 'subcategoryId', 'isPrimary'];
  for (const column of columns) {
    const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'EventSubcategory' AND column_name = ${column}
    `;
    if (rows.length === 0) {
      fail(`column EventSubcategory.${column}`);
      ok = false;
    } else {
      pass(`column EventSubcategory.${column}`);
    }
  }

  const uniques = await prisma.$queryRaw<Array<{ indexname: string }>>`
    SELECT indexname FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'EventSubcategory'
      AND indexdef LIKE '%UNIQUE%' AND indexdef LIKE '%eventId%' AND indexdef LIKE '%subcategoryId%'
  `;
  if (uniques.length === 0) {
    fail('unique (eventId, subcategoryId)');
    ok = false;
  } else {
    pass(`unique (eventId, subcategoryId) — ${uniques[0]!.indexname}`);
  }

  return ok;
}

async function pickExcursionSubcategories(
  prisma: PrismaClient,
  count: number,
): Promise<Array<{ id: string; name: string }>> {
  const rows = await prisma.contentSubcategory.findMany({
    where: { tenantId: TENANT, category: 'excursion', isActive: true },
    orderBy: { sortOrder: 'asc' },
    take: count,
    select: { id: true, name: true },
  });
  return rows;
}

async function smokeMultiSubcategoryFlow(
  prisma: PrismaClient,
  cleanup: CleanupIds,
): Promise<boolean> {
  const subs = await pickExcursionSubcategories(prisma, 2);
  if (subs.length < 2) {
    fail('excursion subcategories in DB', `need >=2, got ${subs.length} — run seed:subcategories`);
    return false;
  }
  pass(`found ${subs.length} excursion subcategories for test`);

  const producer = await prisma.producerProfile.findFirst({
    where: { tenantId: TENANT, status: 'ACTIVE' },
    select: { id: true },
  });
  const producerId =
    producer?.id ??
    (await prisma.user.findFirst({ where: { tenantId: TENANT }, select: { id: true } }))?.id;
  if (!producerId) {
    fail('producerId');
    return false;
  }

  const operator = await prisma.excursionOperator.create({
    data: {
      tenantId: TENANT,
      name: `${MARKER} operator`,
      city: 'San Carlos de Bariloche',
    },
  });
  cleanup.operatorId = operator.id;

  const primaryId = subs[0]!.id;
  const secondaryId = subs[1]!.id;
  const resolved = await resolveValidatedExcursionSubcategories(prisma, TENANT, {
    subcategoryIds: [primaryId, secondaryId],
  });
  if (!resolved || resolved.allIds.length !== 2 || resolved.primaryId !== primaryId) {
    fail('resolveValidatedExcursionSubcategories', JSON.stringify(resolved));
    return false;
  }
  pass('resolveValidatedExcursionSubcategories (2 ids, primary=first)');

  const event = await prisma.$transaction(async (tx) => {
    const created = await tx.event.create({
      data: {
        tenantId: TENANT,
        producerId,
        category: 'excursion',
        excursionOperatorId: operator.id,
        subcategoryId: resolved.primaryId,
        title: `${MARKER} multi-sub`,
        startAt: new Date(),
        status: 'APPROVED',
      },
    });
    await syncEventSubcategories(tx, created.id, resolved.primaryId, resolved.allIds);
    return created;
  });
  cleanup.eventIds.push(event.id);
  pass('create excursion + sync EventSubcategory');

  const junction = await prisma.eventSubcategory.findMany({
    where: { eventId: event.id },
    include: { subcategory: { select: { id: true, name: true } } },
  });
  if (junction.length !== 2) {
    fail('junction row count', String(junction.length));
    return false;
  }
  const primaryRows = junction.filter((r) => r.isPrimary);
  if (primaryRows.length !== 1 || primaryRows[0]!.subcategoryId !== primaryId) {
    fail('single isPrimary', JSON.stringify(junction.map((j) => ({ id: j.subcategoryId, isPrimary: j.isPrimary }))));
    return false;
  }
  const refreshed = await prisma.event.findUnique({ where: { id: event.id } });
  if (refreshed?.subcategoryId !== primaryId) {
    fail('Event.subcategoryId primary', refreshed?.subcategoryId ?? 'null');
    return false;
  }
  pass('Event.subcategoryId = primary; exactly one isPrimary in junction');

  const newPrimaryId = secondaryId;
  const updatedResolved = await resolveValidatedExcursionSubcategories(prisma, TENANT, {
    subcategoryId: newPrimaryId,
    subcategoryIds: [newPrimaryId, primaryId],
  });
  if (!updatedResolved) {
    fail('update resolve');
    return false;
  }
  await prisma.$transaction(async (tx) => {
    await tx.event.update({
      where: { id: event.id },
      data: { subcategoryId: updatedResolved.primaryId },
    });
    await syncEventSubcategories(
      tx,
      event.id,
      updatedResolved.primaryId,
      updatedResolved.allIds,
    );
  });
  pass('edit excursion — swap primary via subcategoryId');

  const afterEdit = await prisma.eventSubcategory.findMany({ where: { eventId: event.id } });
  if (afterEdit.length !== 2 || afterEdit.filter((r) => r.isPrimary).length !== 1) {
    fail('junction after edit', JSON.stringify(afterEdit));
    return false;
  }
  const eventAfter = await prisma.event.findUnique({ where: { id: event.id } });
  if (eventAfter?.subcategoryId !== newPrimaryId) {
    fail('Event.subcategoryId after edit');
    return false;
  }
  pass('junction synced without duplicates after edit');

  const filterClause = subcategoryFilterWhere(TENANT, 'excursion', {
    subcategoryId: secondaryId,
  });
  if (!filterClause) {
    fail('subcategoryFilterWhere');
    return false;
  }
  const matches = await prisma.event.findMany({
    where: {
      id: event.id,
      tenantId: TENANT,
      category: 'excursion',
      status: 'APPROVED',
      deletedAt: null,
      AND: [filterClause],
    },
    select: { id: true },
  });
  if (matches.length !== 1) {
    fail('filter by secondary subcategory', `matches=${matches.length}`);
    return false;
  }
  pass('filter by secondary subcategory (junction match)');

  const publicRows = mapEventSubcategoriesPublic(
    await prisma.eventSubcategory.findMany({
      where: { eventId: event.id },
      include: { subcategory: { select: { id: true, name: true } } },
    }),
  );
  if (publicRows.length !== 2) {
    fail('mapEventSubcategoriesPublic', String(publicRows.length));
    return false;
  }
  pass('mapEventSubcategoriesPublic (detail shape)');

  const backfillSample = await prisma.event.findFirst({
    where: {
      tenantId: TENANT,
      category: 'excursion',
      subcategoryId: { not: null },
      id: { not: event.id },
      deletedAt: null,
    },
    select: { id: true, subcategoryId: true },
  });
  if (backfillSample?.subcategoryId) {
    const backfillRow = await prisma.eventSubcategory.findFirst({
      where: { eventId: backfillSample.id, subcategoryId: backfillSample.subcategoryId },
    });
    if (backfillRow) {
      pass(`backfill sample: event ${backfillSample.id} has junction row`);
    } else {
      console.log(
        `  NOTE backfill sample event ${backfillSample.id} has subcategoryId but no junction (pre-migration data?)`,
      );
    }
  } else {
    console.log('  SKIP backfill sample (no other excursion with subcategoryId)');
  }

  return true;
}

async function optionalPublicApiDetail(eventId: string): Promise<void> {
  const base = (process.env.SMOKE_API_BASE_URL ?? process.env.API_BASE_URL ?? 'http://localhost:3001').replace(
    /\/$/,
    '',
  );
  try {
    const res = await fetch(
      `${base}/public/events/${encodeURIComponent(eventId)}?tenantId=${TENANT}`,
    );
    if (!res.ok) {
      console.log(`  SKIP API detail (status=${res.status})`);
      return;
    }
    const body = (await res.json()) as { subcategories?: Array<{ id: string; name: string }> };
    if (!body.subcategories || body.subcategories.length < 2) {
      fail('API detail subcategories[]', JSON.stringify(body.subcategories));
      return;
    }
    pass('GET /public/events/:id returns subcategories[] (2+)');
  } catch (e) {
    console.log('  SKIP API detail', String(e));
  }
}

async function cleanupArtifacts(prisma: PrismaClient, cleanup: CleanupIds) {
  for (const eventId of cleanup.eventIds) {
    await prisma.eventMedia.deleteMany({ where: { eventId } });
    await prisma.eventSubcategory.deleteMany({ where: { eventId } });
    await prisma.event.deleteMany({ where: { id: eventId } });
  }
  if (cleanup.operatorId) {
    await prisma.excursionOperator.deleteMany({ where: { id: cleanup.operatorId } });
  }
}

async function main() {
  const prisma = new PrismaClient();
  const cleanup: CleanupIds = { eventIds: [] };
  let exitCode = 0;

  try {
    await prisma.$connect();
    pass('DB connect');

    if (!(await assertEventSubcategorySchema(prisma))) exitCode = 1;
    if (exitCode === 0 && !(await smokeMultiSubcategoryFlow(prisma, cleanup))) exitCode = 1;
    if (exitCode === 0 && cleanup.eventIds[0]) {
      await optionalPublicApiDetail(cleanup.eventIds[0]);
    }
  } catch (e) {
    fail('unexpected', String(e));
    exitCode = 1;
  } finally {
    await cleanupArtifacts(prisma, cleanup);
    if (cleanup.eventIds.length || cleanup.operatorId) {
      pass('ephemeral smoke artifacts cleaned');
    }
    await prisma.$disconnect();
  }

  return exitCode;
}

void runSmokeScript('v31-subcategories', main);

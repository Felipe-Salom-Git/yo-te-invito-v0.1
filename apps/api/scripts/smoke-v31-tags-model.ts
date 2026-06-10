/**
 * V3.1 Etapa 4 Slice 4.1 — Content tags model smoke.
 * Run: pnpm --filter api run smoke:v31-tags-model
 * Requires: Postgres up, migration 20260615120000_content_tags applied.
 */

import { PrismaClient } from '@prisma/client';
import {
  formatContentTagHashtag,
  normalizeContentTagName,
  slugifyContentTagName,
} from '@yo-te-invito/shared';
import {
  mapEventTagsPublic,
  syncEventTags,
  validateEventTagIds,
} from '../src/common/event-tags.util';
import { ContentTagsService } from '../src/modules/content-tags/content-tags.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { SMOKE_TEST_MARKER } from './lib/smoke-constants';
import { runSmokeScript } from './lib/smoke-runner';

const TENANT = process.env.SMOKE_TENANT_ID ?? 'tenant-demo';
const MARKER = `${SMOKE_TEST_MARKER} v31-tags`;

type Cleanup = { tagIds: string[]; eventId?: string };

function pass(label: string) {
  console.log(`  OK ${label}`);
}

function fail(label: string, detail?: string) {
  console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
}

async function assertSchema(prisma: PrismaClient): Promise<boolean> {
  let ok = true;
  for (const table of ['ContentTag', 'EventTag']) {
    const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${table}
    `;
    if (rows.length === 0) {
      fail(`table ${table}`);
      ok = false;
    } else {
      pass(`table ${table}`);
    }
  }
  const uniques = await prisma.$queryRaw<Array<{ indexname: string }>>`
    SELECT indexname FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'ContentTag'
      AND indexdef LIKE '%UNIQUE%' AND indexdef LIKE '%tenantId%' AND indexdef LIKE '%slug%'
  `;
  if (uniques.length === 0) {
    fail('unique (tenantId, slug) on ContentTag');
    ok = false;
  } else {
    pass(`unique tenantId+slug — ${uniques[0]!.indexname}`);
  }
  return ok;
}

async function smokeTagCrud(
  prisma: PrismaService,
  cleanup: Cleanup,
): Promise<boolean> {
  const service = new ContentTagsService(prisma);
  let ok = true;

  const rawName = '#Nieve';
  const normalized = normalizeContentTagName(rawName);
  const slug = slugifyContentTagName(normalized);
  if (normalized !== 'Nieve' || slug !== 'nieve') {
    fail('normalize #Nieve', `name=${normalized} slug=${slug}`);
    ok = false;
  } else {
    pass(`normalize #Nieve → name="${normalized}" slug="${slug}" hashtag="${formatContentTagHashtag(normalized)}"`);
  }

  const created = await service.create(TENANT, {
    name: rawName,
    categoryScope: 'excursion',
  });
  cleanup.tagIds.push(created.id);
  if (created.slug !== 'nieve' || created.name !== 'Nieve') {
    fail('create tag', JSON.stringify(created));
    ok = false;
  } else {
    pass('create tag #Nieve (excursion scope)');
  }

  try {
    await service.create(TENANT, { name: 'Nieve' });
    fail('duplicate tag should throw');
    ok = false;
  } catch (e: unknown) {
    const status = (e as { status?: number }).status;
    if (status === 409) {
      pass('duplicate tag rejected (409)');
    } else {
      fail('duplicate tag', String(e));
      ok = false;
    }
  }

  const archived = await service.setActive(TENANT, created.id, false);
  if (archived.isActive) {
    fail('archive tag');
    ok = false;
  } else {
    pass('archive tag');
  }

  const publicList = await service.listPublic({ tenantId: TENANT, category: 'excursion' });
  if (publicList.data.some((t) => t.id === created.id)) {
    fail('archived tag in public list');
    ok = false;
  } else {
    pass('archived tag hidden from public list');
  }

  await service.setActive(TENANT, created.id, true);
  const publicExcursionAfterRestore = await service.listPublic({
    tenantId: TENANT,
    category: 'excursion',
  });
  if (!publicExcursionAfterRestore.data.some((t) => t.slug === 'nieve')) {
    fail('excursion tag not in public excursion list after restore');
    ok = false;
  } else {
    pass('restored tag visible for excursion category filter');
  }

  const publicEventAfterRestore = await service.listPublic({
    tenantId: TENANT,
    category: 'event',
  });
  if (publicEventAfterRestore.data.some((t) => t.slug === 'nieve')) {
    fail('excursion-scoped tag must not appear in event public list');
    ok = false;
  } else {
    pass('excursion-scoped tag excluded from event category filter');
  }

  return ok;
}

async function smokeEventTags(
  prisma: PrismaService,
  cleanup: Cleanup,
): Promise<boolean> {
  let ok = true;
  const globalTag = await prisma.contentTag.create({
    data: {
      tenantId: TENANT,
      name: `${MARKER} global`,
      slug: `${MARKER.replace(/\s+/g, '-')}-global`,
      categoryScope: null,
      isActive: true,
    },
  });
  cleanup.tagIds.push(globalTag.id);

  const producer = await prisma.producerProfile.findFirst({
    where: { tenantId: TENANT, status: 'ACTIVE' },
    select: { id: true },
  });
  const producerId =
    producer?.id ??
    (await prisma.user.findFirst({ where: { tenantId: TENANT }, select: { id: true } }))?.id;
  if (!producerId) {
    fail('producerId for event smoke');
    return false;
  }

  const event = await prisma.event.create({
    data: {
      tenantId: TENANT,
      producerId,
      title: `${MARKER} event`,
      category: 'event',
      status: 'DRAFT',
      startAt: new Date(Date.now() + 86400000),
    },
    select: { id: true },
  });
  cleanup.eventId = event.id;

  const ids = await validateEventTagIds(prisma, TENANT, 'event', [globalTag.id]);
  if (ids.length !== 1) {
    fail('validateEventTagIds');
    ok = false;
  } else {
    pass('validateEventTagIds for event + global tag');
  }

  await syncEventTags(prisma, event.id, ids);
  const rows = await prisma.eventTag.findMany({
    where: { eventId: event.id },
    include: { tag: true },
  });
  const mapped = mapEventTagsPublic(rows);
  if (mapped.length !== 1 || mapped[0]!.slug !== globalTag.slug) {
    fail('syncEventTags / mapEventTagsPublic', JSON.stringify(mapped));
    ok = false;
  } else {
    pass('syncEventTags + mapEventTagsPublic');
  }

  return ok;
}

async function main(): Promise<number> {
  const prisma = new PrismaClient();
  const prismaService = prisma as unknown as PrismaService;
  const cleanup: Cleanup = { tagIds: [] };
  let exitCode = 0;

  console.log('\n=== V3.1 tags model smoke ===\n');

  try {
    await prisma.$connect();
    pass('DB connect');

    if (!(await assertSchema(prisma))) exitCode = 1;
    if (exitCode === 0 && !(await smokeTagCrud(prismaService, cleanup))) exitCode = 1;
    if (exitCode === 0 && !(await smokeEventTags(prismaService, cleanup))) exitCode = 1;
  } catch (e) {
    fail('unexpected', String(e));
    exitCode = 1;
  } finally {
    if (cleanup.eventId) {
      await prisma.eventTag.deleteMany({ where: { eventId: cleanup.eventId } });
      await prisma.event.delete({ where: { id: cleanup.eventId } });
    }
    if (cleanup.tagIds.length) {
      await prisma.eventTag.deleteMany({ where: { tagId: { in: cleanup.tagIds } } });
      await prisma.contentTag.deleteMany({ where: { id: { in: cleanup.tagIds } } });
    }
    await prisma.$disconnect();
  }

  if (exitCode === 0) console.log('\nAll tag model smoke checks passed.\n');
  return exitCode;
}

void runSmokeScript('v31-tags-model', main);

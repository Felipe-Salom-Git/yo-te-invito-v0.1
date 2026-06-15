/**
 * V3.1 Slice 10 — category editorial banners smoke.
 * Run: pnpm --filter api run smoke:v31-category-banners
 */

import { AuditAction, PrismaClient } from '@prisma/client';
import { SMOKE_TEST_MARKER } from './lib/smoke-constants';
import { runSmokeScript } from './lib/smoke-runner';

const TENANT = process.env.SMOKE_TENANT_ID ?? 'tenant-demo';
const MARKER = `${SMOKE_TEST_MARKER} v31-category-banners`;
const ACTOR = { id: 'user-admin', role: 'ADMIN' };
const PLACEHOLDER_IMAGE = 'https://storage.googleapis.com/yo-te-invito-public/placeholder-banner.jpg';

type Cleanup = { bannerIds: string[] };

function pass(label: string) {
  console.log(`  OK ${label}`);
}

function fail(label: string, detail?: string) {
  console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
}

async function listSmokeBanners(
  prisma: PrismaClient,
  bannerIds: string[],
  activeOnly: boolean,
) {
  return prisma.categoryEditorialBanner.findMany({
    where: {
      id: { in: bannerIds },
      ...(activeOnly ? { isActive: true } : {}),
    },
    orderBy: { sortOrder: 'asc' },
  });
}

async function nextSortOrders(
  prisma: PrismaClient,
  category: 'event',
  count: number,
): Promise<number[]> {
  const maxSort = await prisma.categoryEditorialBanner.aggregate({
    where: { tenantId: TENANT, category },
    _max: { sortOrder: true },
  });
  const base = (maxSort._max.sortOrder ?? -1) + 1;
  return Array.from({ length: count }, (_, i) => base + i);
}

async function main() {
  const prisma = new PrismaClient();
  const cleanup: Cleanup = { bannerIds: [] };
  let exitCode = 0;

  try {
    await prisma.$connect();
    pass('DB connect');

    const [sortOrder1, sortOrder2] = await nextSortOrders(prisma, 'event', 2);

    const b1 = await prisma.categoryEditorialBanner.create({
      data: {
        tenantId: TENANT,
        category: 'event',
        title: `${MARKER} hero 1`,
        subtitle: 'Subtítulo smoke',
        imageUrl: PLACEHOLDER_IMAGE,
        isActive: true,
        sortOrder: sortOrder1,
      },
    });
    const b2 = await prisma.categoryEditorialBanner.create({
      data: {
        tenantId: TENANT,
        category: 'event',
        title: `${MARKER} hero 2`,
        imageUrl: PLACEHOLDER_IMAGE,
        isActive: true,
        sortOrder: sortOrder2,
      },
    });
    cleanup.bannerIds.push(b1.id, b2.id);
    pass('seed two active editorial banners');

    const publicationsBefore = await prisma.event.count({
      where: {
        tenantId: TENANT,
        deletedAt: null,
        status: 'APPROVED',
        OR: [{ category: 'event' }, { category: null }],
      },
    });
    pass(`publications baseline (event category): ${publicationsBefore}`);

    const editorialSmokeActive = await listSmokeBanners(prisma, cleanup.bannerIds, true);
    if (editorialSmokeActive.length < 2) {
      fail('editorial public active set', `expected 2 smoke banners, got ${editorialSmokeActive.length}`);
      exitCode = 1;
    } else if (editorialSmokeActive[0]?.id !== b1.id || editorialSmokeActive[1]?.id !== b2.id) {
      fail(
        'smoke banners ordered by sortOrder',
        `got ${editorialSmokeActive.map((r) => r.id).join(',')}`,
      );
      exitCode = 1;
    } else {
      pass('editorial public active smoke banners (ordered)');
    }

    const publicationsAfterCreate = await prisma.event.count({
      where: {
        tenantId: TENANT,
        deletedAt: null,
        status: 'APPROVED',
        OR: [{ category: 'event' }, { category: null }],
      },
    });
    if (publicationsAfterCreate !== publicationsBefore) {
      fail(
        'editorial banners must not affect publications',
        `before=${publicationsBefore} after=${publicationsAfterCreate}`,
      );
      exitCode = 1;
    } else {
      pass('editorial banners do not modify publication count');
    }

    await prisma.auditLog.create({
      data: {
        tenantId: TENANT,
        actorId: ACTOR.id,
        actorRole: ACTOR.role,
        action: AuditAction.CATEGORY_EDITORIAL_BANNER_CREATED,
        entityType: 'CategoryEditorialBanner',
        entityId: b1.id,
        after: { title: b1.title },
      },
    });
    pass('audit CATEGORY_EDITORIAL_BANNER_CREATED');

    await prisma.categoryEditorialBanner.update({
      where: { id: b1.id },
      data: { title: `${MARKER} hero 1 edited` },
    });
    await prisma.auditLog.create({
      data: {
        tenantId: TENANT,
        actorId: ACTOR.id,
        actorRole: ACTOR.role,
        action: AuditAction.CATEGORY_EDITORIAL_BANNER_UPDATED,
        entityType: 'CategoryEditorialBanner',
        entityId: b1.id,
        before: { title: `${MARKER} hero 1` },
        after: { title: `${MARKER} hero 1 edited` },
      },
    });
    pass('edit banner + audit');

    await prisma.$transaction([
      prisma.categoryEditorialBanner.update({
        where: { id: b2.id },
        data: { sortOrder: b1.sortOrder },
      }),
      prisma.categoryEditorialBanner.update({
        where: { id: b1.id },
        data: { sortOrder: b2.sortOrder },
      }),
    ]);
    const reordered = await listSmokeBanners(prisma, cleanup.bannerIds, true);
    if (reordered[0]?.id !== b2.id || reordered[1]?.id !== b1.id) {
      fail('reorder swap among smoke banners', `got ${reordered.map((r) => r.id).join(',')}`);
      exitCode = 1;
    } else {
      pass('reorder swap among smoke banners');
    }

    await prisma.categoryEditorialBanner.update({
      where: { id: b2.id },
      data: { isActive: false },
    });
    const publicationsAfterDeactivate = await prisma.event.count({
      where: {
        tenantId: TENANT,
        deletedAt: null,
        status: 'APPROVED',
        OR: [{ category: 'event' }, { category: null }],
      },
    });
    if (publicationsAfterDeactivate !== publicationsBefore) {
      fail(
        'deactivate editorial must not affect publications',
        `before=${publicationsBefore} after=${publicationsAfterDeactivate}`,
      );
      exitCode = 1;
    } else {
      pass('deactivate editorial keeps publications intact');
    }

    const afterDeactivate = await listSmokeBanners(prisma, cleanup.bannerIds, true);
    if (afterDeactivate.length !== 1 || afterDeactivate[0]?.id !== b1.id) {
      fail('deactivate', `smoke active ids ${afterDeactivate.map((r) => r.id).join(',')}`);
      exitCode = 1;
    } else {
      pass('deactivate hides smoke banner from active set');
    }

    await prisma.categoryEditorialBanner.update({
      where: { id: b2.id },
      data: { isActive: true },
    });
    pass('reactivate banner');
  } catch (e) {
    fail('unexpected', String(e));
    exitCode = 1;
  } finally {
    if (cleanup.bannerIds.length > 0) {
      await prisma.auditLog.deleteMany({
        where: { entityId: { in: cleanup.bannerIds } },
      });
      await prisma.categoryEditorialBanner.deleteMany({
        where: { id: { in: cleanup.bannerIds } },
      });
      pass('ephemeral smoke artifacts cleaned');
    }
    await prisma.$disconnect();
  }

  return exitCode;
}

void runSmokeScript('v31-category-banners', main);

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

async function main() {
  const prisma = new PrismaClient();
  const cleanup: Cleanup = { bannerIds: [] };
  let exitCode = 0;

  try {
    await prisma.$connect();
    pass('DB connect');

    const b1 = await prisma.categoryEditorialBanner.create({
      data: {
        tenantId: TENANT,
        category: 'event',
        title: `${MARKER} hero 1`,
        subtitle: 'Subtítulo smoke',
        imageUrl: PLACEHOLDER_IMAGE,
        isActive: true,
        sortOrder: 0,
      },
    });
    const b2 = await prisma.categoryEditorialBanner.create({
      data: {
        tenantId: TENANT,
        category: 'event',
        title: `${MARKER} hero 2`,
        imageUrl: PLACEHOLDER_IMAGE,
        isActive: true,
        sortOrder: 1,
      },
    });
    cleanup.bannerIds.push(b1.id, b2.id);
    pass('seed two active editorial banners');

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

    const publicActive = await prisma.categoryEditorialBanner.findMany({
      where: { tenantId: TENANT, category: 'event', isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (publicActive.length < 2 || publicActive[0]?.id !== b1.id) {
      fail('public active order', `got ${publicActive.map((r) => r.id).join(',')}`);
      exitCode = 1;
    } else {
      pass('public active ordered by sortOrder');
    }

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
    const reordered = await prisma.categoryEditorialBanner.findMany({
      where: { tenantId: TENANT, category: 'event', isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (reordered[0]?.id !== b2.id) {
      fail('reorder swap');
      exitCode = 1;
    } else {
      pass('reorder swap');
    }

    await prisma.categoryEditorialBanner.update({
      where: { id: b2.id },
      data: { isActive: false },
    });
    const afterDeactivate = await prisma.categoryEditorialBanner.count({
      where: { tenantId: TENANT, category: 'event', isActive: true },
    });
    if (afterDeactivate !== 1) {
      fail('deactivate', `active count ${afterDeactivate}`);
      exitCode = 1;
    } else {
      pass('deactivate hides from active set');
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

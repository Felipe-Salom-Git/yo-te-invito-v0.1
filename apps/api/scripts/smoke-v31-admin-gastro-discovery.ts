/**
 * V3.1 hotfix — admin gastro → public discovery sync.
 * Run: pnpm --filter api run smoke:v31-admin-gastro-discovery
 */

import { PrismaClient } from '@prisma/client';
import { SMOKE_TEST_MARKER } from './lib/smoke-constants';
import { runSmokeScript } from './lib/smoke-runner';
import { AdminGastroLocationsService } from '../src/modules/admin/admin-gastro-locations.service';
import { AdminGastroService } from '../src/modules/admin/admin-gastro.service';
import { GastroPublicEventSyncService } from '../src/modules/gastro/gastro-public-event-sync.service';
import { SubcategoriesService } from '../src/modules/subcategories/subcategories.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { mergePublicParentEntitiesActive } from '../src/common/utils/public-content-availability.util';
import { mergePublicEventVisibility } from '../src/common/utils/event-public-visibility.util';

const TENANT = process.env.SMOKE_TENANT_ID ?? 'tenant-demo';
const MARKER = `${SMOKE_TEST_MARKER} v31-admin-gastro-discovery`;
const ADMIN_ID = process.env.SMOKE_DEV_USER_ID ?? 'user-admin';

type Cleanup = {
  profileId?: string;
  eventId?: string;
};

function pass(label: string) {
  console.log(`  OK ${label}`);
}

function fail(label: string, detail?: string) {
  console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
}

function publicGastroWhere(tenantId: string, eventId?: string) {
  return mergePublicParentEntitiesActive(
    mergePublicEventVisibility({
      tenantId,
      category: 'gastro',
      status: 'APPROVED',
      deletedAt: null,
      ...(eventId ? { id: eventId } : {}),
    }),
  );
}

async function countPublicGastro(prisma: PrismaClient, eventId: string) {
  return prisma.event.count({
    where: publicGastroWhere(TENANT, eventId),
  });
}

function buildAdminGastroLocationsService(prisma: PrismaClient) {
  const prismaService = prisma as unknown as PrismaService;
  return new AdminGastroLocationsService(
    prismaService,
    new SubcategoriesService(prismaService),
    new GastroPublicEventSyncService(prismaService),
    new AdminGastroService(prismaService, null as never, null as never),
  );
}

async function main() {
  const prisma = new PrismaClient();
  const cleanup: Cleanup = {};
  let exitCode = 0;

  try {
    await prisma.$connect();
    pass('DB connect');

    const admin =
      (await prisma.user.findFirst({
        where: { id: ADMIN_ID, tenantId: TENANT },
        select: { id: true },
      })) ??
      (await prisma.user.findFirst({
        where: { tenantId: TENANT, role: 'ADMIN' },
        select: { id: true },
      })) ??
      (await prisma.user.findFirst({
        where: { tenantId: TENANT },
        select: { id: true },
      }));
    if (!admin) {
      fail('admin user for tenant', TENANT);
      return 1;
    }
    pass(`actor ${admin.id}`);

    const service = buildAdminGastroLocationsService(prisma);

    const created = await service.create(TENANT, admin.id, {
      displayName: `${MARKER} local`,
      contactEmail: 'smoke-gastro-discovery@test.local',
      location: {
        province: 'Río Negro',
        city: 'San Carlos de Bariloche',
        address: 'Smoke Address 100',
      },
      status: 'ACTIVE',
      publish: true,
    });
    cleanup.profileId = created.id;
    pass('admin create ACTIVE + publish');

    if (!created.publicEventId) {
      fail('publicEventId after create');
      return 1;
    }
    cleanup.eventId = created.publicEventId;

    const event = await prisma.event.findUnique({
      where: { id: created.publicEventId },
      select: { id: true, category: true, status: true, title: true },
    });
    if (!event || event.category !== 'gastro' || event.status !== 'APPROVED') {
      fail('linked Event', JSON.stringify(event));
      return 1;
    }
    pass('Event category=gastro status=APPROVED');

    const publicCount = await countPublicGastro(prisma, created.publicEventId);
    if (publicCount !== 1) {
      fail('public discovery list', `count=${publicCount}`);
      return 1;
    }
    pass('appears in public gastro discovery query');

    const profileDetail = await prisma.gastroProfile.findFirst({
      where: { publicEventId: created.publicEventId, tenantId: TENANT, status: 'ACTIVE' },
    });
    if (!profileDetail) {
      fail('public gastro profile detail');
      return 1;
    }
    pass('public profile detail resolves');

    await service.updateStatus(TENANT, admin.id, 'ADMIN', created.id, {
      status: 'SUSPENDED',
    });
    const hiddenCount = await countPublicGastro(prisma, created.publicEventId);
    if (hiddenCount !== 0) {
      fail('hidden after suspend', `count=${hiddenCount}`);
      return 1;
    }
    pass('hidden after suspend');

    await service.updateStatus(TENANT, admin.id, 'ADMIN', created.id, {
      status: 'ACTIVE',
    });
    const visibleAgain = await countPublicGastro(prisma, created.publicEventId);
    if (visibleAgain !== 1) {
      fail('visible after reactivate', `count=${visibleAgain}`);
      return 1;
    }
    pass('visible after reactivate');

    const draft = await service.create(TENANT, admin.id, {
      displayName: `${MARKER} draft`,
      contactEmail: 'smoke-gastro-draft@test.local',
      location: {
        province: 'Río Negro',
        city: 'San Carlos de Bariloche',
        address: 'Smoke Draft 200',
      },
      status: 'DRAFT',
      publish: false,
    });
    if (draft.publicEventId) {
      fail('draft should not have publicEventId');
      await prisma.gastroProfile.delete({ where: { id: draft.id } });
      return 1;
    }
    pass('DRAFT create skips publicEventId');

    await service.updateStatus(TENANT, admin.id, 'ADMIN', draft.id, {
      status: 'ACTIVE',
    });
    const draftActivated = await prisma.gastroProfile.findUnique({
      where: { id: draft.id },
      select: { publicEventId: true },
    });
    if (!draftActivated?.publicEventId) {
      fail('activate DRAFT should create publicEventId');
      await prisma.gastroProfile.delete({ where: { id: draft.id } });
      return 1;
    }
    pass('activate DRAFT creates publicEventId');
    await prisma.event.delete({ where: { id: draftActivated.publicEventId } });
    await prisma.gastroProfile.delete({ where: { id: draft.id } });
  } catch (err) {
    fail('unexpected', err instanceof Error ? err.message : String(err));
    exitCode = 1;
  } finally {
    if (cleanup.eventId) {
      await prisma.eventMedia.deleteMany({ where: { eventId: cleanup.eventId } });
      await prisma.event.deleteMany({ where: { id: cleanup.eventId } });
    }
    if (cleanup.profileId) {
      await prisma.gastroProfile.deleteMany({ where: { id: cleanup.profileId } });
    }
    await prisma.$disconnect();
  }

  return exitCode;
}

runSmokeScript('v31-admin-gastro-discovery', main);

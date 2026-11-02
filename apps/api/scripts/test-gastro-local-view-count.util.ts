/**
 * G12.1-D — `GET /gastro/locations` returns each local's own GastroProfileView total
 * (multi-local isolation; never the account sum). Fake Prisma, no DB.
 * Run: pnpm --filter api run test:gastro-local-view-count
 */
import { GastroLocalService } from '../src/modules/gastro/gastro-local.service';
import { mapViewCountsByProfile } from '../src/modules/gastro/gastro-location-view-counts.util';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log('OK:', msg);
}

const TENANT = 'tenant-demo';
const UPDATED = new Date('2026-11-02T12:00:00.000Z');

function profile(id: string, displayName: string) {
  return {
    id,
    tenantId: TENANT,
    displayName,
    status: 'ACTIVE',
    city: 'Bariloche',
    province: 'Río Negro',
    address: null,
    publicEventId: `evt-${id}`,
    subcategory: null,
    updatedAt: UPDATED,
    // Mirror column must NOT be the source (dashboard counts GastroProfileView rows).
    viewCount: 999_999,
  };
}

const VIEW_ROWS = [
  ...Array.from({ length: 1200 }, () => ({ tenantId: TENANT, gastroProfileId: 'local-a' })),
  ...Array.from({ length: 350 }, () => ({ tenantId: TENANT, gastroProfileId: 'local-b' })),
  ...Array.from({ length: 80 }, () => ({ tenantId: TENANT, gastroProfileId: 'local-c' })),
  ...Array.from({ length: 50 }, () => ({ tenantId: TENANT, gastroProfileId: 'other-account-local' })),
  ...Array.from({ length: 7 }, () => ({ tenantId: 'other-tenant', gastroProfileId: 'local-a' })),
];

let groupByCalls = 0;
const prisma = {
  gastroProfileView: {
    groupBy: async ({ where }: { where: { tenantId: string; gastroProfileId: { in: string[] } } }) => {
      groupByCalls += 1;
      const counts = new Map<string, number>();
      for (const r of VIEW_ROWS) {
        if (r.tenantId !== where.tenantId || !where.gastroProfileId.in.includes(r.gastroProfileId)) continue;
        counts.set(r.gastroProfileId, (counts.get(r.gastroProfileId) ?? 0) + 1);
      }
      return [...counts].map(([gastroProfileId, n]) => ({ gastroProfileId, _count: { _all: n } }));
    },
  },
};

const managedByUser: Record<string, ReturnType<typeof profile>[]> = {
  'owner-1': [profile('local-a', 'Alma'), profile('local-b', 'Bodegón'), profile('local-c', 'Café'), profile('local-d', 'Dulce')],
  'owner-empty': [],
};

const service = new GastroLocalService(
  prisma as never,
  { hasGastroAccess: async () => true } as never,
  { listManagedProfiles: async (_t: string, userId: string) => managedByUser[userId] ?? [] } as never,
  {} as never,
  {} as never,
);

async function main() {
  const { data } = await service.listMyLocations(TENANT, 'owner-1', 'GASTRO_OWNER');
  const byId = new Map(data.map((l) => [l.id, l.viewCount]));
  assert(byId.get('local-a') === 1200, 'Local A → 1200 views');
  assert(byId.get('local-b') === 350, 'Local B → 350 views');
  assert(byId.get('local-c') === 80, 'Local C → 80 views');
  assert(byId.get('local-d') === 0, 'local without views → 0');
  assert(!data.some((l) => l.viewCount === 1630), 'account total (1630) never repeated on a local');
  assert(!data.some((l) => l.viewCount === 999_999), 'source is GastroProfileView, not the mirror column');
  assert(groupByCalls === 1, 'single grouped query for all locals (no N+1)');

  const empty = await service.listMyLocations(TENANT, 'owner-empty', 'GASTRO_OWNER');
  assert(empty.data.length === 0 && groupByCalls === 1, 'no locals → no view query');

  const map = mapViewCountsByProfile(['x'], [{ gastroProfileId: 'y', _count: { _all: 3 } }]);
  assert(map.get('x') === 0 && !map.has('y'), 'helper ignores rows outside the requested locals');

  console.log('OK: gastro local view count (multi-local isolation)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * G12.2 — Gastro promotional events: create / edit / submit / archive scoped to the local
 * (multi-local, foreign local, other gastro user, cross-tenant) and always publicity-only.
 * Fake Prisma + real GastroOwnershipService, no DB.
 * Run: pnpm --filter api run test:gastro-promo-events
 */
import { GastroPromoEventsService } from '../src/modules/gastro/gastro-promo-events.service';
import { GastroOwnershipService } from '../src/modules/gastro/gastro-ownership.service';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log('OK:', msg);
}

async function expectStatus(p: Promise<unknown>, status: number, msg: string) {
  try {
    await p;
  } catch (e) {
    const got = (e as { getStatus?: () => number }).getStatus?.();
    assert(got === status, `${msg} (HTTP ${status}, got ${got})`);
    return;
  }
  throw new Error(`FAIL: ${msg} — expected HTTP ${status}, call succeeded`);
}

const T = 'tenant-demo';
type Profile = { id: string; tenantId: string; status: string; displayName: string; address: string; city: string; province: string; googlePlaceId: null; geoLat: number; geoLng: number; createdByUserId: string };
const profile = (id: string, tenantId: string, owner: string, status = 'ACTIVE'): Profile => ({
  id, tenantId, status, displayName: `Local ${id}`, address: `Calle ${id}`, city: 'Bariloche', province: 'Río Negro', googlePlaceId: null, geoLat: -41.1, geoLng: -71.3, createdByUserId: owner,
});
const profiles: Profile[] = [
  profile('gp-a', T, 'owner-a'),
  profile('gp-b', T, 'owner-a'),
  profile('gp-c', T, 'owner-c'),
  profile('gp-pending', T, 'owner-a', 'PENDING'),
  profile('gp-x', 'tenant-other', 'owner-a'),
];
const memberships = [
  { tenantId: T, userId: 'owner-a', profileId: 'gp-a' },
  { tenantId: T, userId: 'owner-a', profileId: 'gp-b' },
  { tenantId: T, userId: 'owner-a', profileId: 'gp-pending' },
  { tenantId: T, userId: 'owner-c', profileId: 'gp-c' },
  { tenantId: 'tenant-other', userId: 'owner-a', profileId: 'gp-x' },
];

type EventRow = Record<string, unknown> & { id: string; tenantId: string; gastroProfileId: string | null; deletedAt: Date | null; status: string };
const events: EventRow[] = [];
const media: Array<{ eventId: string; url: string; sortOrder: number; deletedAt: Date | null }> = [];

function withIncludes(e: EventRow) {
  return {
    ...e,
    media: media.filter((m) => m.eventId === e.id && !m.deletedAt).sort((a, b) => a.sortOrder - b.sortOrder),
    subcategory: null,
    eventTags: [],
  };
}
function matches(e: EventRow, where: Record<string, unknown>): boolean {
  if (where.id && e.id !== where.id) return false;
  if (where.tenantId && e.tenantId !== where.tenantId) return false;
  if ('deletedAt' in where && where.deletedAt === null && e.deletedAt) return false;
  const g = where.gastroProfileId as unknown;
  if (typeof g === 'string' && e.gastroProfileId !== g) return false;
  if (g && typeof g === 'object' && 'not' in (g as object) && !e.gastroProfileId) return false;
  return true;
}

const prisma = {
  userGastroMembership: {
    findFirst: async ({ where }: { where: { tenantId: string; userId: string; profileId: string; profile: { status: { in: string[] } } } }) => {
      const m = memberships.find((x) => x.tenantId === where.tenantId && x.userId === where.userId && x.profileId === where.profileId);
      const p = m && profiles.find((x) => x.id === m.profileId && where.profile.status.in.includes(x.status));
      return p ? { profile: p } : null;
    },
    findMany: async ({ where }: { where: { tenantId: string; userId: string } }) =>
      memberships
        .filter((m) => m.tenantId === where.tenantId && m.userId === where.userId)
        .map((m) => ({ profileId: m.profileId, profile: profiles.find((p) => p.id === m.profileId)! })),
  },
  gastroProfile: {
    findFirst: async ({ where }: { where: { id: string; tenantId: string; createdByUserId?: string } }) =>
      profiles.find((p) => p.id === where.id && p.tenantId === where.tenantId && !where.createdByUserId) ?? null,
    findMany: async () => [],
  },
  event: {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const row = { id: `evt-${events.length + 1}`, deletedAt: null, publishedAt: null, createdAt: new Date(), updatedAt: new Date(), ...data } as EventRow;
      events.push(row);
      return row;
    },
    findFirstOrThrow: async ({ where }: { where: { id: string } }) => withIncludes(events.find((e) => e.id === where.id)!),
    findFirst: async ({ where }: { where: Record<string, unknown> }) => {
      const e = events.find((x) => matches(x, where));
      return e ? withIncludes(e) : null;
    },
    findMany: async ({ where }: { where: Record<string, unknown> }) => events.filter((x) => matches(x, where)).map(withIncludes),
    update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const e = events.find((x) => x.id === where.id)!;
      Object.assign(e, data, { updatedAt: new Date() });
      return withIncludes(e);
    },
  },
  eventMedia: {
    createMany: async ({ data }: { data: Array<{ eventId: string; url: string; sortOrder: number }> }) => {
      for (const d of data) media.push({ ...d, deletedAt: null });
    },
    updateMany: async ({ where }: { where: { eventId: string } }) => {
      for (const m of media) if (m.eventId === where.eventId) m.deletedAt = new Date();
    },
  },
  eventTag: { deleteMany: async () => undefined, createMany: async () => undefined },
  contentTag: { findMany: async () => [] },
  $transaction: async <R>(fn: (tx: unknown) => Promise<R>) => fn(prisma),
};

const pendingAlerts: string[] = [];
const service = new GastroPromoEventsService(
  prisma as never,
  new GastroOwnershipService(prisma as never),
  { resolveSubcategoryForEvent: async (_t: string, _c: string, id: string | null) => id } as never,
  { notifyNewEventPending: (p: { eventId: string }) => pendingAlerts.push(p.eventId) } as never,
);

const BASE = { title: 'Noche de jazz', description: 'En vivo', startAt: '2026-12-10T22:00:00.000Z', galleryUrls: ['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg'] };

async function main() {
  // Create: local A (PASS), own local B (PASS).
  const a = await service.create(T, 'owner-a', 'GASTRO_OWNER', { ...BASE, profileId: 'gp-a' });
  assert(a.gastroProfileId === 'gp-a' && a.status === 'DRAFT', 'GASTRO A · local A → create PASS (DRAFT)');
  const rowA = events.find((e) => e.id === a.id)!;
  assert(rowA.category === 'event' && rowA.producerProfileId === null, 'stored as discovery `event`, no producer owner');
  assert(rowA.isTicketingEnabled === false && rowA.isGeneralPublication === true, 'publicity only: no ticketing');
  assert(rowA.venueName === 'Local gp-a' && rowA.city === 'Bariloche' && rowA.geoLat === -41.1, 'location defaults to the local');
  assert(a.coverImageUrl === 'https://cdn.test/a.jpg' && a.galleryUrls.length === 2, 'cover falls back to first gallery image');

  const b = await service.create(T, 'owner-a', 'GASTRO_OWNER', { ...BASE, profileId: 'gp-b', submitForReview: true });
  assert(b.gastroProfileId === 'gp-b' && b.status === 'PENDING', 'GASTRO A · own local B → create PASS (PENDING)');
  assert(pendingAlerts.includes(b.id), 'ADMIN notified when submitted for review');

  // G12.4 — location modes.
  assert(a.usesLocalLocation === true && rowA.geoLng === -71.3, 'default → local location (address + pin copied from the local)');
  const custom = await service.create(T, 'owner-a', 'GASTRO_OWNER', {
    ...BASE,
    profileId: 'gp-a',
    useLocalLocation: false,
    venueName: 'Centro Cívico',
    venueAddress: 'Plaza 1',
    city: 'San Carlos de Bariloche',
    province: 'Río Negro',
    googlePlaceId: 'pl-9',
    geoLat: -41.13,
    geoLng: -71.31,
  });
  const rowCustom = events.find((e) => e.id === custom.id)!;
  assert(custom.usesLocalLocation === false && rowCustom.venueAddress === 'Plaza 1', 'custom location stored as the event venue');
  assert(rowCustom.geoLat === -41.13 && rowCustom.geoLng === -71.31 && rowCustom.googlePlaceId === 'pl-9', 'custom pin preserved (not the local pin)');
  const toLocal = await service.update(T, 'owner-a', 'GASTRO_OWNER', custom.id, { useLocalLocation: true, venueAddress: 'ignored', geoLat: 1, geoLng: 1 });
  const rowToLocal = events.find((e) => e.id === custom.id)!;
  assert(
    toLocal.usesLocalLocation && rowToLocal.venueAddress === 'Calle gp-a' && rowToLocal.geoLat === -41.1 && rowToLocal.googlePlaceId === null,
    'custom → local resets the whole venue to the local (custom values ignored, no mixed pin)',
  );
  const backCustom = await service.update(T, 'owner-a', 'GASTRO_OWNER', custom.id, {
    useLocalLocation: false, venueAddress: 'Otra 2', city: 'Dina Huapi', province: 'Río Negro', geoLat: null, geoLng: null,
  });
  const rowBack = events.find((e) => e.id === custom.id)!;
  assert(!backCustom.usesLocalLocation && rowBack.geoLat === null && rowBack.venueName === null, 'local → custom without pin keeps no local coordinates');
  const legacy = await service.create(T, 'owner-a', 'GASTRO_OWNER', { ...BASE, profileId: 'gp-a', venueAddress: 'Legacy 9', city: 'Bariloche', province: 'Río Negro' });
  assert(!legacy.usesLocalLocation && events.find((e) => e.id === legacy.id)!.geoLat === null, 'legacy G12.2 payload (custom address, no flag) still works');

  // Foreign local / other gastro user / cross-tenant.
  await expectStatus(service.create(T, 'owner-a', 'GASTRO_OWNER', { ...BASE, profileId: 'gp-c' }), 403, 'GASTRO A · foreign local C → FAIL');
  await expectStatus(service.update(T, 'owner-c', 'GASTRO_OWNER', a.id, { title: 'Hack' }), 403, 'other GASTRO cannot edit local A event');
  await expectStatus(service.submit(T, 'owner-c', 'GASTRO_OWNER', a.id), 403, 'other GASTRO cannot submit local A event');
  await expectStatus(service.archive(T, 'owner-c', 'GASTRO_OWNER', a.id), 403, 'other GASTRO cannot archive local A event');
  await expectStatus(service.create('tenant-other', 'owner-a', 'GASTRO_OWNER', { ...BASE, profileId: 'gp-a' }), 403, 'cross-tenant profile → FAIL');
  await expectStatus(service.get('tenant-other', 'owner-a', 'GASTRO_OWNER', a.id), 404, 'cross-tenant event → 404');

  // Pending local cannot submit.
  await expectStatus(
    service.create(T, 'owner-a', 'GASTRO_OWNER', { ...BASE, profileId: 'gp-pending', submitForReview: true }),
    403,
    'local not ACTIVE cannot submit to review',
  );
  const draftPending = await service.create(T, 'owner-a', 'GASTRO_OWNER', { ...BASE, profileId: 'gp-pending' });
  assert(draftPending.status === 'DRAFT', 'local not ACTIVE can still prepare drafts');

  // Edit + submit + list isolation.
  const edited = await service.update(T, 'owner-a', 'GASTRO_OWNER', a.id, { title: 'Noche de jazz y vino', galleryUrls: ['https://cdn.test/c.jpg'] });
  assert(edited.title === 'Noche de jazz y vino' && edited.galleryUrls.join() === 'https://cdn.test/c.jpg', 'edit PASS (gallery replaced)');
  const submitted = await service.submit(T, 'owner-a', 'GASTRO_OWNER', a.id);
  assert(submitted.status === 'PENDING', 'submit DRAFT → PENDING');
  await expectStatus(service.submit(T, 'owner-a', 'GASTRO_OWNER', a.id), 400, 'cannot re-submit while PENDING');

  const listA = await service.list(T, 'owner-a', 'GASTRO_OWNER', 'gp-a');
  assert(
    listA.data.some((e) => e.id === a.id) && listA.data.every((e) => e.gastroProfileId === 'gp-a'),
    'list local A → only local A events',
  );
  const listB = await service.list(T, 'owner-a', 'GASTRO_OWNER', 'gp-b');
  assert(listB.data.length === 1 && listB.data[0]!.id === b.id, 'list local B → only local B events (same owner)');
  await expectStatus(service.list(T, 'owner-c', 'GASTRO_OWNER', 'gp-a'), 403, 'other GASTRO cannot list local A');

  // ADMIN.
  const byAdmin = await service.update(T, 'admin-1', 'ADMIN', b.id, { description: 'Revisado' });
  assert(byAdmin.description === 'Revisado', 'ADMIN can edit any local event in tenant');

  // Rejected (CANCELLED) can be re-submitted; archive hides it.
  events.find((e) => e.id === b.id)!.status = 'CANCELLED';
  assert((await service.submit(T, 'owner-a', 'GASTRO_OWNER', b.id)).status === 'PENDING', 'rejected → re-submit PENDING');
  await service.archive(T, 'owner-a', 'GASTRO_OWNER', b.id);
  assert((await service.list(T, 'owner-a', 'GASTRO_OWNER', 'gp-b')).data.length === 0, 'archived event leaves the list');

  console.log('OK: gastro promo events (create/edit/lifecycle/isolation)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

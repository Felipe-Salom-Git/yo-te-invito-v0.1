/**
 * G12.2-E — Admin: gastro promo events are distinguishable (origin / local / owner), filterable,
 * and approval / rejection notify the local's team with gastro-portal links. Fake Prisma, no DB.
 * Run: pnpm --filter api run test:gastro-promo-event-admin
 */
import { buildAdminEventsWhere } from '../src/modules/admin/admin-events-list.util';
import { AdminEventsService } from '../src/modules/admin/admin-events.service';
import { ProducerEventStatusNotificationsService } from '../src/modules/notifications/producer-event-status-notifications.service';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log('OK:', msg);
}

const T = 'tenant-demo';
const NOW = new Date('2026-11-02T12:00:00.000Z');

async function main() {
  // Filters.
  const gastroWhere = buildAdminEventsWhere(T, { page: 1, limit: 20, origin: 'gastro' });
  assert(JSON.stringify(gastroWhere.gastroProfileId) === JSON.stringify({ not: null }), 'origin=gastro → gastroProfileId not null');
  const platformWhere = buildAdminEventsWhere(T, { page: 1, limit: 20, origin: 'platform' });
  assert(platformWhere.gastroProfileId === null && platformWhere.producerProfileId === null, 'origin=platform → no owner profile');
  const qWhere = buildAdminEventsWhere(T, { page: 1, limit: 20, q: 'Bodegón' });
  assert(JSON.stringify(qWhere.OR).includes('gastroProfile'), 'search also matches the local name');

  // List mapping.
  const row = (id: string, extra: Record<string, unknown>) => ({
    id, title: id, category: 'event', subcategoryId: null, status: 'PENDING', city: 'Bariloche', producerId: 'u-owner',
    producerProfileId: null, gastroProfileId: null, startAt: NOW, endAt: null, createdAt: NOW, updatedAt: NOW,
    publishedAt: null, subcategory: null, producerProfile: null, gastroProfile: null, ...extra,
  });
  const prisma = {
    event: {
      findMany: async () => [
        row('gastro-evt', { gastroProfileId: 'gp-a', gastroProfile: { id: 'gp-a', displayName: 'Bodegón' } }),
        row('producer-evt', { producerProfileId: 'pp-1', producerProfile: { id: 'pp-1', displayName: 'Prod SA' }, producerId: 'u-prod' }),
      ],
      count: async () => 2,
    },
    eventOccurrence: { groupBy: async () => [] },
    user: { findMany: async () => [{ id: 'u-owner', firstName: 'Ana', lastName: 'Paz' }] },
  };
  const admin = new AdminEventsService(prisma as never, {} as never, {} as never);
  const { data } = await admin.listForAdmin(T, { page: 1, limit: 20 });
  const g = data.find((e) => e.id === 'gastro-evt')!;
  const p = data.find((e) => e.id === 'producer-evt')!;
  assert(g.ownerKind === 'GASTRO' && g.gastroProfileName === 'Bodegón' && g.createdByName === 'Ana Paz', 'admin row: Origen = Local gastronómico · local · owner');
  assert(p.ownerKind === 'PRODUCER' && p.producerName === 'Prod SA' && p.createdByName === null, 'producer rows unchanged');

  // Notifications routing.
  const delivered: Array<{ userId: string; href: string; vars?: Record<string, string> }> = [];
  const notifPrisma = {
    userGastroMembership: {
      findMany: async ({ where }: { where: { profileId: string } }) =>
        where.profileId === 'gp-a' ? [{ userId: 'u-owner' }, { userId: 'u-staff' }] : [],
    },
    userProducerMembership: { findMany: async () => [{ userId: 'u-prod' }] },
    producerProfile: { findFirst: async () => ({ createdByUserId: 'u-prod' }) },
    user: { findFirst: async ({ where }: { where: { id: string } }) => ({ email: `${where.id}@test`, preferences: {}, firstName: 'X', lastName: 'Y' }) },
    event: { findFirst: async () => ({ startAt: NOW, venueName: 'Bodegón' }) },
  };
  const notifications = {
    deliver: async (p: { userId: string; href: string; emailTemplateVariables?: Record<string, string> }) => {
      delivered.push({ userId: p.userId, href: p.href, vars: p.emailTemplateVariables });
    },
  };
  const svc = new ProducerEventStatusNotificationsService(notifPrisma as never, notifications as never);
  const dispatch = (svc as unknown as {
    dispatch: (t: string, e: Record<string, unknown>, s: 'APPROVED' | 'REJECTED', r?: string) => Promise<void>;
  }).dispatch.bind(svc);

  await dispatch(T, { id: 'gastro-evt', title: 'Jazz', producerProfileId: null, gastroProfileId: 'gp-a', producerId: 'u-owner' }, 'APPROVED');
  assert(delivered.map((d) => d.userId).sort().join() === 'u-owner,u-staff', 'approval notifies the local team (memberships)');
  assert(delivered.every((d) => d.href === '/gastro/contenido?profileId=gp-a&tab=eventos'), 'link → gastro portal Eventos tab');
  assert(!delivered.some((d) => d.href.startsWith('/producer')), 'never links gastro owners to the producer portal');

  delivered.length = 0;
  await dispatch(T, { id: 'producer-evt', title: 'Show', producerProfileId: 'pp-1', producerId: 'u-prod' }, 'REJECTED', 'motivo');
  assert(delivered.length === 1 && delivered[0]!.href === '/producer/events/producer-evt', 'producer notifications unchanged (regression)');

  console.log('OK: gastro promo event admin');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

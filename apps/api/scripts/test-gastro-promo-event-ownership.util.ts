/**
 * G12.2-A — Event owner model: producer XOR gastro local; gastro promo events never reachable
 * through producer CRUD (non-admin) or ticket types (anyone). Fake Prisma, no DB.
 * Run: pnpm --filter api run test:gastro-promo-event-ownership
 */
import { EVENT_OWNER_KIND, isGastroPromoEvent, resolveEventOwnerKind } from '@yo-te-invito/shared';
import { ProducerEventsCrudService } from '../src/modules/producer/producer-events-crud.service';
import { ProducerTicketTypesService } from '../src/modules/producer/producer-ticket-types.service';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log('OK:', msg);
}

async function expectStatus(p: Promise<unknown>, status: number, msg: string) {
  try {
    await p;
  } catch (e) {
    assert((e as { getStatus?: () => number }).getStatus?.() === status, `${msg} (HTTP ${status})`);
    return;
  }
  throw new Error(`FAIL: ${msg} — expected HTTP ${status}`);
}

const TENANT = 'tenant-demo';
const events: Record<string, Record<string, unknown>> = {
  'evt-producer': { id: 'evt-producer', tenantId: TENANT, producerId: 'dual-user', producerProfileId: 'pp-1', gastroProfileId: null, isTicketingEnabled: true, isGeneralPublication: false },
  'evt-gastro': { id: 'evt-gastro', tenantId: TENANT, producerId: 'dual-user', producerProfileId: null, gastroProfileId: 'gp-a', isTicketingEnabled: false, isGeneralPublication: true },
};
const prisma = {
  event: {
    findFirst: async ({ where }: { where: { id: string; tenantId: string } }) => {
      const e = events[where.id];
      return e && e.tenantId === where.tenantId ? e : null;
    },
  },
};
const profilesAuth = {
  canManageEvent: async (_t: string, userId: string, e: { producerId: string }) => e.producerId === userId,
};

async function main() {
  assert(resolveEventOwnerKind({ producerProfileId: 'pp', gastroProfileId: null }) === EVENT_OWNER_KIND.PRODUCER, 'producer event → PRODUCER');
  assert(resolveEventOwnerKind({ producerProfileId: null, gastroProfileId: 'gp' }) === EVENT_OWNER_KIND.GASTRO, 'gastro promo event → GASTRO');
  assert(resolveEventOwnerKind({}) === EVENT_OWNER_KIND.PLATFORM, 'general publication / page-event → PLATFORM');
  assert(isGastroPromoEvent({ gastroProfileId: 'gp' }) && !isGastroPromoEvent({ gastroProfileId: null }), 'isGastroPromoEvent');

  const crud = new ProducerEventsCrudService(prisma as never, profilesAuth as never, {} as never, {} as never, {} as never, {} as never);
  const ok = await crud.assertEventAccessForUser('evt-producer', TENANT, 'dual-user', 'PRODUCER_OWNER');
  assert(ok.id === 'evt-producer', 'producer still manages its own events (regression)');
  // A user that is both producer and gastro created the promo event (producerId = user).
  await expectStatus(
    crud.assertEventAccessForUser('evt-gastro', TENANT, 'dual-user', 'PRODUCER_OWNER'),
    403,
    'producer API cannot edit a gastro promo event even if producerId matches',
  );
  const admin = await crud.assertEventAccessForUser('evt-gastro', TENANT, 'admin', 'ADMIN');
  assert(admin.id === 'evt-gastro', 'ADMIN keeps access');
  await expectStatus(crud.assertEventAccessForUser('evt-gastro', 'other-tenant', 'dual-user', 'ADMIN'), 404, 'cross-tenant → 404');

  const tickets = new ProducerTicketTypesService(prisma as never, {} as never);
  const assertTickets = (tickets as unknown as {
    assertEventOwnedByUser: (e: string, t: string, u: string, r: string) => Promise<unknown>;
  }).assertEventOwnedByUser.bind(tickets);
  await expectStatus(assertTickets('evt-gastro', TENANT, 'dual-user', 'PRODUCER_OWNER'), 403, 'no ticket types on gastro promo events (owner)');
  await expectStatus(assertTickets('evt-gastro', TENANT, 'admin', 'ADMIN'), 403, 'no ticket types on gastro promo events (ADMIN)');
  await assertTickets('evt-producer', TENANT, 'dual-user', 'PRODUCER_OWNER');
  console.log('OK: producer ticket types unchanged (regression)');

  console.log('OK: gastro promo event ownership');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

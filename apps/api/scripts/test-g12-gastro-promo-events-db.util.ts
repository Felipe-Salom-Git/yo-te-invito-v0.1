/**
 * G12.2 — DB integration (PostgreSQL, always rolled back): gastro promotional events in public
 * Events discovery / search / detail, local isolation, no ticketing, owner CHECK and FK RESTRICT.
 * Run: pnpm --filter api run test:g12-gastro-promo-events-db   (prints NOT RUN when no DB)
 */
import { Prisma, PrismaClient } from '@prisma/client';
import { isCategoryComingSoon } from '@yo-te-invito/shared';
import { PublicEventsService } from '../src/public/public-events.service';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log('OK:', msg);
}

class Rollback extends Error {}
const prisma = new PrismaClient();
/** `event` may still be «comingSoon» (V3.2): query as a preview role, i.e. as once Events is public. */
const ACCESS = { role: 'ADMIN' };
const SUFFIX = `g12-${Date.now()}`;

async function expectDbError(tx: Prisma.TransactionClient, sql: () => Promise<unknown>, msg: string) {
  await tx.$executeRawUnsafe('SAVEPOINT g12_check');
  try {
    await sql();
  } catch {
    await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT g12_check');
    console.log('OK:', msg);
    return;
  }
  throw new Error(`FAIL: ${msg} — statement succeeded`);
}

async function main() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    console.log('NOT RUN: PostgreSQL not reachable (DATABASE_URL)');
    return;
  }
  const tenant = await prisma.tenant.findFirst({ select: { id: true } });
  const user = await prisma.user.findFirst({ select: { id: true } });
  if (!tenant || !user) {
    console.log('NOT RUN: needs at least one tenant and one user');
    return;
  }
  const T = tenant.id;
  const future = new Date(Date.now() + 10 * 24 * 3600 * 1000);

  try {
    await prisma.$transaction(
      async (tx) => {
        const mkProfile = (name: string, status: 'ACTIVE' | 'SUSPENDED') =>
          tx.gastroProfile.create({ data: { tenantId: T, displayName: `${name} ${SUFFIX}`, status } as never });
        const localA = await mkProfile('Local A', 'ACTIVE');
        const localB = await mkProfile('Local B', 'ACTIVE');
        const localC = await mkProfile('Local C', 'SUSPENDED');

        const mkEvent = (title: string, data: Record<string, unknown>) =>
          tx.event.create({
            data: {
              tenantId: T,
              producerId: user.id,
              category: 'event',
              title: `${title} ${SUFFIX}`,
              startAt: future,
              isTicketingEnabled: false,
              isGeneralPublication: true,
              ...data,
            } as never,
          });
        const aApproved = await mkEvent('A aprobado', { gastroProfileId: localA.id, status: 'APPROVED', publishedAt: new Date() });
        const aDraft = await mkEvent('A borrador', { gastroProfileId: localA.id, status: 'DRAFT' });
        const aPending = await mkEvent('A pendiente', { gastroProfileId: localA.id, status: 'PENDING' });
        const aRejected = await mkEvent('A rechazado', { gastroProfileId: localA.id, status: 'CANCELLED' });
        const bApproved = await mkEvent('B aprobado', { gastroProfileId: localB.id, status: 'APPROVED' });
        const cApproved = await mkEvent('C aprobado', { gastroProfileId: localC.id, status: 'APPROVED' });
        const producerEvt = await mkEvent('Productora', { status: 'APPROVED' });

        const svc = new PublicEventsService(tx as never);
        const ids = (rows: Array<{ id: string }>) => new Set(rows.map((r) => r.id));

        const events = ids((await svc.list({ tenantId: T, category: 'event', page: 1, limit: 100 }, ACCESS)).data);
        assert(events.has(aApproved.id) && events.has(bApproved.id), 'APPROVED gastro promo events appear in Events discovery');
        assert(!events.has(aDraft.id) && !events.has(aPending.id) && !events.has(aRejected.id), 'DRAFT / PENDING / rejected do NOT appear');
        assert(!events.has(cApproved.id), 'promo event of a non-ACTIVE local is hidden');
        assert(events.has(producerEvt.id), 'producer events still listed (regression)');
        if (isCategoryComingSoon('event')) {
          const anon = ids((await svc.list({ tenantId: T, category: 'event', page: 1, limit: 100 })).data);
          assert(!anon.has(aApproved.id) && !anon.has(producerEvt.id), 'while Events is «comingSoon», anonymous users see neither (same gate as producers)');
        }

        const ticketed = ids((await svc.list({ tenantId: T, category: 'event', hasTicketing: true, page: 1, limit: 100 }, ACCESS)).data);
        assert(!ticketed.has(aApproved.id), 'ticketing rails (Destacados / Próximos) exclude promo events, like producer publicity');

        const byLocalA = (await svc.list({ tenantId: T, category: 'event', gastroProfileId: localA.id, page: 1, limit: 100 }, ACCESS)).data;
        assert(byLocalA.length === 1 && byLocalA[0]!.id === aApproved.id, 'local A filter → only local A approved event');
        const byLocalB = (await svc.list({ tenantId: T, category: 'event', gastroProfileId: localB.id, page: 1, limit: 100 }, ACCESS)).data;
        assert(byLocalB.length === 1 && byLocalB[0]!.id === bApproved.id, 'local B (same owner) isolated from local A');

        const card = byLocalA[0]!;
        assert(card.producerName === localA.displayName && card.gastroOrganizer?.id === localA.id, 'card organizer = local name');
        assert(card.hasTicketing === false && card.fromPrice === null, 'card: no ticketing, no price');

        const search = ids((await svc.search({ tenantId: T, q: `Local A ${SUFFIX}`, page: 1, limit: 50 }, ACCESS)).data);
        assert(search.has(aApproved.id) && !search.has(aDraft.id), 'search by local name finds its published event');

        const detail = await svc.detail(aApproved.id, T, ACCESS);
        assert(detail.gastroOrganizer?.id === localA.id && detail.producer == null, 'detail exposes the organizer local, no producer');
        assert(detail.isTicketingEnabled === false && detail.isGeneralPublication === true && detail.fromPrice === null, 'detail: no ticketing / checkout data');
        let draftHidden = false;
        try {
          await svc.detail(aDraft.id, T, ACCESS);
        } catch {
          draftHidden = true;
        }
        assert(draftHidden, 'draft detail is not public (404)');
        let foreignTenant = false;
        try {
          await svc.detail(aApproved.id, `${T}-other`);
        } catch {
          foreignTenant = true;
        }
        assert(foreignTenant, 'cross-tenant detail → 404');

        const producerProfile = await tx.producerProfile.findFirst({ select: { id: true } });
        if (producerProfile) {
          await expectDbError(
            tx,
            () => tx.event.update({ where: { id: aDraft.id }, data: { producerProfileId: producerProfile.id } }),
            'DB CHECK rejects an event owned by producer AND gastro local',
          );
        } else {
          console.log('SKIP: no ProducerProfile row to exercise the owner CHECK');
        }
        await expectDbError(tx, () => tx.gastroProfile.delete({ where: { id: localA.id } }), 'FK RESTRICT blocks deleting a local with promo events');

        throw new Rollback();
      },
      { timeout: 60_000 },
    );
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }
  console.log('OK: G12.2 gastro promo events DB integration (rolled back)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

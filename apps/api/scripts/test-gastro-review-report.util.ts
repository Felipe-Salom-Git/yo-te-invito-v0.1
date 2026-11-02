/**
 * G12.1-C — «Denunciar valoración» for gastro locals reuses the review dispute domain
 * (ReviewDisputeRequest + ADMIN inbox), scoped per local (publicEventId). Fake Prisma, no DB.
 * Run: pnpm --filter api run test:gastro-review-report
 */
import { GastroReviewDisputesService } from '../src/modules/review-disputes/gastro-review-disputes.service';
import { mapDispute } from '../src/modules/review-disputes/review-dispute-records';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log('OK:', msg);
}

const TENANT = 'tenant-demo';
const NOW = new Date('2026-11-02T12:00:00.000Z');

type Dispute = Record<string, unknown> & { id: string; reviewId: string; status: string; gastroProfileId?: string };

function makeWorld() {
  const events: Record<string, { id: string; title: string; category: string; producerProfileId: null; producerId: string }> = {
    'evt-a': { id: 'evt-a', title: 'Local A', category: 'gastro', producerProfileId: null, producerId: 'owner-a' },
    'evt-b': { id: 'evt-b', title: 'Local B', category: 'gastro', producerProfileId: null, producerId: 'owner-b' },
    'evt-show': { id: 'evt-show', title: 'Show', category: 'event', producerProfileId: null, producerId: 'p' },
  };
  const reviews: Record<string, { id: string; tenantId: string; eventId: string; userId: string; status: string; score: number; overallRating: number; comment: string; guestName: null; hiddenFromPublic: boolean; officialReply: null }> = {};
  for (const [id, eventId] of [['rev-a', 'evt-a'], ['rev-b', 'evt-b'], ['rev-show', 'evt-show']] as const) {
    reviews[id] = { id, tenantId: TENANT, eventId, userId: 'author', status: 'VISIBLE', score: 2, overallRating: 4, comment: 'meh', guestName: null, hiddenFromPublic: false, officialReply: null };
  }
  const profilesByEvent: Record<string, string> = { 'evt-a': 'gp-a', 'evt-b': 'gp-b' };
  const managedEventsByUser: Record<string, string[]> = { 'owner-a': ['evt-a'], 'owner-b': ['evt-b'] };
  const disputes: Dispute[] = [];
  const inbox: Array<Record<string, unknown>> = [];
  const notified: string[] = [];

  const tx = {
    review: {
      update: async ({ where, data }: { where: { id: string }; data: { status: string } }) => {
        reviews[where.id]!.status = data.status;
        return reviews[where.id];
      },
    },
    inboxItem: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `inbox-${inbox.length + 1}`, ...data };
        inbox.push(row);
        return row;
      },
    },
    reviewDisputeRequest: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row: Dispute = {
          id: `disp-${disputes.length + 1}`,
          producerProfileId: null,
          gastroProfileId: null,
          adminNote: null,
          createdAt: NOW,
          updatedAt: NOW,
          resolvedAt: null,
          ...data,
        } as Dispute;
        disputes.push(row);
        const review = reviews[row.reviewId]!;
        return { ...row, review: { ...review, user: { firstName: 'Ana', lastName: 'Paz' } }, event: events[review.eventId] };
      },
    },
  };

  const prisma = {
    ...tx,
    review: {
      ...tx.review,
      findFirst: async ({ where }: { where: { id: string; tenantId: string } }) => {
        const r = reviews[where.id];
        return r && r.tenantId === where.tenantId ? { ...r, event: events[r.eventId] } : null;
      },
    },
    gastroProfile: {
      findFirst: async ({ where }: { where: { publicEventId: string } }) => {
        const id = profilesByEvent[where.publicEventId];
        return id ? { id } : null;
      },
    },
    reviewDisputeRequest: {
      ...tx.reviewDisputeRequest,
      findFirst: async ({ where }: { where: { reviewId: string; gastroProfileId: string; status: { in: string[] } } }) =>
        disputes.find(
          (d) => d.reviewId === where.reviewId && d.gastroProfileId === where.gastroProfileId && where.status.in.includes(d.status),
        ) ?? null,
    },
    $transaction: async <T>(fn: (client: typeof tx) => Promise<T>) => fn(tx),
  };

  const profiles = {
    canManageGastroPublicEvent: async (_t: string, userId: string, role: string, eventId: string) =>
      role === 'ADMIN' || (managedEventsByUser[userId] ?? []).includes(eventId),
  };
  const notifications = {
    notifyDisputeCreated: (_t: string, disputeId: string) => {
      notified.push(disputeId);
    },
  };

  const service = new GastroReviewDisputesService(prisma as never, profiles as never, notifications as never);
  return { service, reviews, disputes, inbox, notified };
}

async function expectError(p: Promise<unknown>, status: number, msg: string) {
  try {
    await p;
  } catch (e) {
    const got = (e as { getStatus?: () => number }).getStatus?.();
    assert(got === status, `${msg} (HTTP ${status})`);
    return;
  }
  throw new Error(`FAIL: ${msg} — expected HTTP ${status}, call succeeded`);
}

const BODY = { reasonType: 'OFFENSIVE' as const, message: 'Comentario ofensivo hacia el personal' };

async function main() {
  const w = makeWorld();

  // Owner of the local reports a review of their own local.
  const created = await w.service.createDispute(TENANT, 'owner-a', 'GASTRO_OWNER', 'rev-a', BODY);
  assert(created.ownerType === 'GASTRO' && created.gastroProfileId === 'gp-a', 'owner reports review → dispute scoped to its local');
  assert(created.producerProfileId === null, 'gastro dispute has no producerProfileId (single owner scope)');
  assert(created.status === 'PENDING' && created.reasonType === 'OFFENSIVE', 'dispute PENDING with chosen reason');
  assert(w.reviews['rev-a']!.status === 'IN_REVIEW', 'review goes IN_REVIEW (same moderation semantics as producer)');
  assert(w.reviews['rev-a']!.score === 2 && w.reviews['rev-a']!.overallRating === 4, 'rating untouched');
  assert(
    w.inbox.length === 1 && w.inbox[0]!.kind === 'REVIEW_DISPUTE_REQUEST' && w.inbox[0]!.assigneeRole === 'ADMIN',
    'ADMIN inbox item created (reappears in /admin/review-disputes queue)',
  );
  assert(w.notified.length === 1, 'dispute-created notification dispatched');

  // Duplicate while open.
  await expectError(w.service.createDispute(TENANT, 'owner-a', 'GASTRO_OWNER', 'rev-a', BODY), 409, 'duplicate open report blocked');

  // Multi-local isolation: owner of A cannot report a review of B.
  await expectError(w.service.createDispute(TENANT, 'owner-a', 'GASTRO_OWNER', 'rev-b', BODY), 403, 'owner of another local forbidden');
  // Review author / other users (not managers) cannot report.
  await expectError(w.service.createDispute(TENANT, 'author', 'USER', 'rev-b', BODY), 403, 'review author / other user forbidden');

  // ADMIN can report any gastro review.
  const byAdmin = await w.service.createDispute(TENANT, 'admin-1', 'ADMIN', 'rev-b', BODY);
  assert(byAdmin.gastroProfileId === 'gp-b', 'ADMIN report scoped to the review local');

  // Non-gastro review → producer flow, not this endpoint.
  await expectError(w.service.createDispute(TENANT, 'admin-1', 'ADMIN', 'rev-show', BODY), 400, 'non-gastro review rejected');
  await expectError(w.service.createDispute(TENANT, 'owner-a', 'GASTRO_OWNER', 'missing', BODY), 404, 'unknown review → 404');

  // Re-report allowed once the previous dispute is closed.
  w.disputes[0]!.status = 'REJECTED';
  const again = await w.service.createDispute(TENANT, 'owner-a', 'GASTRO_OWNER', 'rev-a', BODY);
  assert(again.id !== created.id, 'new report allowed after admin closed the previous one');

  // Producer disputes keep mapping as before.
  const producerMapped = mapDispute({
    id: 'd-p',
    reviewId: 'r',
    producerProfileId: 'pp-1',
    gastroProfileId: null,
    eventId: 'e',
    reasonType: 'OTHER',
    message: 'x'.repeat(10),
    status: 'PENDING',
    adminNote: null,
    createdAt: NOW,
    updatedAt: NOW,
    resolvedAt: null,
    review: { score: 3, comment: null, guestName: 'G', user: null },
    event: { title: 'Show', category: 'event' },
  });
  assert(producerMapped.ownerType === 'PRODUCER' && producerMapped.producerProfileId === 'pp-1', 'producer dispute mapping unchanged');

  console.log('OK: gastro review report (denunciar valoración)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

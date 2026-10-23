/**
 * G8.9 — Gastro portal courtesy experience (behavioural: REAL services over the in-memory
 * fake Prisma). Covers: list per local (A/B, no foreign leak), courtesy metrics per row,
 * summary campaign block (benefit, frozen audience, metrics), human states + valid actions,
 * owner cancel of a pending request, ADMIN-origin courtesy not owner-cancellable, no recipient
 * shortCodes in operational metrics, legacy ACTIVE courtesy.
 *
 * Run: pnpm --filter api run test:gastro-courtesy-portal
 */
import { ForbiddenException } from '@nestjs/common';
import {
  GASTRO_COURTESY_STATE_LABELS,
  courtesyDisplayStateLabel,
  resolveCourtesyActions,
  resolveCourtesyDisplayState,
} from '@yo-te-invito/shared';
import { computeCourtesyCampaignMetrics } from '../src/modules/gastro/gastro-discount-metrics.util';
import {
  FUTURE_TO,
  FakeCourtesyDb,
  TENANT,
  errorOf,
  makeChecker,
  sendBody,
  type Row,
} from './lib/courtesy-fake-db';

const { check, state } = makeChecker();

function world() {
  const db = new FakeCourtesyDb();
  db.addProfile('prof-a');
  db.addProfile('prof-b');
  // Same owner operates both locals (multi-local account); owner-b only B.
  db.addOwner('owner-a', 'prof-a');
  db.addOwner('owner-a', 'prof-b');
  db.addOwner('owner-b', 'prof-b');
  db.addUser('owner-a', 'owner-a@example.com', 'Olga');
  db.addUser('owner-b', 'owner-b@example.com', 'Omar');
  db.addUser('u-a', 'a@example.com');
  const svc = db.build();
  const portal = db.buildPortalService(svc);
  return { db, svc, portal };
}

function addPublicDiscount(db: FakeCourtesyDb, profileId: string | null, eventProfile: string) {
  const row: Row = {
    id: db.id('disc'),
    tenantId: TENANT,
    eventId: `evt-${eventProfile}`,
    gastroProfileId: profileId,
    code: 'PUB-1',
    type: 'PERCENT',
    value: 15,
    displayTitle: `Público ${profileId ?? 'legacy'}`,
    summary: 's',
    detail: 'd',
    validityMode: 'DATE_RANGE',
    validWeekday: null,
    validFrom: new Date('2026-01-01T00:00:00.000Z'),
    validTo: new Date(FUTURE_TO),
    discountDate: new Date(FUTURE_TO),
    status: 'ACTIVE',
    visibility: 'PUBLIC',
    qrToken: 'ab'.repeat(24),
    createdByOrigin: 'GASTRO',
    pendingUpdate: null,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  };
  db.discounts.push(row);
  return row;
}

function unit() {
  console.log('\n=== UNIT: human states + valid actions ===\n');
  const past = '2020-01-01T00:00:00.000Z';
  check(resolveCourtesyDisplayState({ status: 'PENDING_REVIEW' }) === 'PENDING', 'PENDING_REVIEW → PENDING');
  check(resolveCourtesyDisplayState({ status: 'COMMISSION_NEGOTIATION' }) === 'PENDING', 'COMMISSION_NEGOTIATION → PENDING');
  check(resolveCourtesyDisplayState({ status: 'ACTIVE', validTo: FUTURE_TO }) === 'ACTIVE', 'ACTIVE (vigente) → ACTIVE');
  check(resolveCourtesyDisplayState({ status: 'ACTIVE', validTo: past }) === 'EXPIRED', 'ACTIVE past validTo → EXPIRED');
  check(resolveCourtesyDisplayState({ status: 'REJECTED' }) === 'REJECTED', 'REJECTED');
  check(resolveCourtesyDisplayState({ status: 'CANCELLED' }) === 'CANCELLED', 'CANCELLED');
  check(resolveCourtesyDisplayState({ status: 'EXPIRED' }) === 'EXPIRED', 'EXPIRED');
  check(
    resolveCourtesyDisplayState({ status: 'ACTIVE', archivedAt: past }) === 'ARCHIVED',
    'archived wins over status',
  );
  check(
    courtesyDisplayStateLabel({ status: 'PENDING_REVIEW' }) === 'Pendiente de aprobación' &&
      GASTRO_COURTESY_STATE_LABELS.ACTIVE === 'Activa' &&
      GASTRO_COURTESY_STATE_LABELS.REJECTED === 'Rechazada' &&
      GASTRO_COURTESY_STATE_LABELS.CANCELLED === 'Cancelada' &&
      GASTRO_COURTESY_STATE_LABELS.EXPIRED === 'Vencida',
    'human labels (no raw enums)',
  );

  const ownerPending = resolveCourtesyActions({ actor: 'OWNER', status: 'PENDING_REVIEW', createdByOrigin: 'GASTRO' });
  check(ownerPending.cancelRequest && !ownerPending.cancelCampaign, 'owner pending → "Cancelar solicitud" only');
  check(ownerPending.editDesign, 'owner pending → Studio allowed');
  check(!ownerPending.approve && !ownerPending.redeliver, 'owner never approves / redelivers');
  check(ownerPending.edit === false && ownerPending.sendMasterQrEmail === false, 'never edit / master QR');
  const ownerActive = resolveCourtesyActions({ actor: 'OWNER', status: 'ACTIVE', validTo: FUTURE_TO, createdByOrigin: 'GASTRO' });
  check(ownerActive.cancelCampaign && !ownerActive.cancelRequest, 'owner active → "Cancelar cortesía"');
  const ownerAdminOrigin = resolveCourtesyActions({ actor: 'OWNER', status: 'ACTIVE', validTo: FUTURE_TO, createdByOrigin: 'ADMIN' });
  check(!ownerAdminOrigin.cancelCampaign, 'owner cannot cancel an ADMIN-created courtesy');
  for (const status of ['REJECTED', 'CANCELLED', 'EXPIRED']) {
    const a = resolveCourtesyActions({ actor: 'OWNER', status, createdByOrigin: 'GASTRO' });
    check(!a.editDesign && !a.cancelCampaign && !a.cancelRequest, `owner ${status} → no actions (no Studio)`);
  }
  const expired = resolveCourtesyActions({ actor: 'OWNER', status: 'ACTIVE', validTo: past, createdByOrigin: 'GASTRO' });
  check(!expired.editDesign && !expired.cancelCampaign, 'owner active-but-expired → no Studio / no cancel');
  const adminPending = resolveCourtesyActions({ actor: 'ADMIN', status: 'PENDING_REVIEW', createdByOrigin: 'GASTRO' });
  check(adminPending.approve && adminPending.reject && adminPending.markNegotiation, 'admin pending → approve / reject');
  check(!adminPending.cancelRequest, 'admin does not "withdraw" (owner wording)');
  const adminActive = resolveCourtesyActions({ actor: 'ADMIN', status: 'ACTIVE', validTo: FUTURE_TO, pendingDeliveryClaims: 2 });
  check(adminActive.redeliver && !adminActive.approve, 'admin active + pending delivery → redeliver');
  check(
    !resolveCourtesyActions({ actor: 'ADMIN', status: 'ACTIVE', validTo: FUTURE_TO, pendingDeliveryClaims: 0 }).redeliver,
    'no pending delivery → no redeliver',
  );

  console.log('\n=== UNIT: courtesy campaign metrics ===\n');
  const base = { type: 'COURTESY', usedAt: null, expiresAt: new Date(FUTURE_TO), emailSendError: null };
  const retained = computeCourtesyCampaignMetrics(
    [
      { ...base, status: 'ACTIVE', emailSentAt: null, source: 'MANUAL_EMAIL', userId: 'u1' },
      { ...base, status: 'ACTIVE', emailSentAt: null, source: 'FOLLOWERS', userId: 'u2' },
    ],
    'PENDING_REVIEW',
  );
  check(retained.retainedClaims === 2 && retained.availableClaims === 0, 'pending: retained, never available');
  check(retained.deliveredClaims === 0 && retained.pendingDeliveryClaims === 0, 'pending: never delivered / pending delivery');
  check(
    retained.manualRecipientCount === 1 && retained.followerRecipientCount === 1 && retained.registeredRecipientCount === 2,
    'audience breakdown (manual / followers / registered)',
  );
  const live = computeCourtesyCampaignMetrics(
    [
      { ...base, status: 'ACTIVE', emailSentAt: new Date(), source: 'MANUAL_EMAIL' },
      { ...base, status: 'ACTIVE', emailSentAt: null, source: 'MANUAL_EMAIL' },
      { ...base, status: 'USED', usedAt: new Date(), emailSentAt: new Date(), source: 'MANUAL_EMAIL' },
      { ...base, status: 'CANCELLED', emailSentAt: new Date(), source: 'MANUAL_EMAIL' },
    ],
    'ACTIVE',
  );
  check(live.availableClaims === 2 && live.deliveredClaims === 1, 'active: available 2, delivered 1 (⊂ available)');
  check(live.pendingDeliveryClaims === 1, 'active: 1 pending delivery (never emailed)');
  check(live.usedClaims === 1 && live.cancelledClaims === 1 && live.retainedClaims === 0, 'used / cancelled buckets');
}

async function listPerLocal() {
  console.log('\n=== LIST: per local (A/B), no foreign rows ===\n');
  const { db, portal, svc } = world();
  await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  await svc.courtesy.sendCourtesy(
    TENANT,
    'owner-a',
    'GASTRO_OWNER',
    sendBody({ gastroProfileId: 'prof-b', title: 'Cortesía B', manualEmails: ['z@example.com'] }),
  );
  addPublicDiscount(db, 'prof-b', 'prof-b');
  // A row owned by B but pointing at A's public event must never appear in A's list.
  const foreign = addPublicDiscount(db, 'prof-b', 'prof-a');
  // A legacy row (no gastroProfileId) of A's public event still belongs to A.
  const legacy = addPublicDiscount(db, null, 'prof-a');

  const a = await portal.listMyDiscounts(TENANT, 'owner-a', 'GASTRO_OWNER', 'prof-a');
  const b = await portal.listMyDiscounts(TENANT, 'owner-a', 'GASTRO_OWNER', 'prof-b');
  check(
    a.data.every((d) => d.gastroProfileId === 'prof-a' || (d.id === legacy.id && d.gastroProfileId == null)),
    'Local A → only A rows (+ its legacy event row)',
  );
  check(!a.data.some((d) => d.id === foreign.id), 'row owned by B on A event does NOT leak into A');
  check(a.data.some((d) => d.id === legacy.id), 'legacy event-only row of A still listed');
  check(b.data.every((d) => d.gastroProfileId === 'prof-b'), 'Local B → only B rows');
  check(
    a.data.filter((d) => d.visibility === 'COURTESY_ONLY').length === 1 &&
      b.data.filter((d) => d.visibility === 'COURTESY_ONLY').length === 1,
    'each local sees exactly its own courtesy',
  );
  const e = await errorOf(() => portal.listMyDiscounts(TENANT, 'owner-b', 'GASTRO_OWNER', 'prof-a'));
  check(e instanceof ForbiddenException, 'owner of B cannot list A (?profileId= never authorizes)');

  const courtesyA = a.data.find((d) => d.visibility === 'COURTESY_ONLY')!;
  check(courtesyA.courtesyMetrics?.recipientCount === 3, 'list row: recipient count');
  check(
    courtesyA.courtesyMetrics?.retainedClaims === 3 && courtesyA.courtesyMetrics.availableClaims === 0,
    'list row: pending → 3 retained, 0 available',
  );
  check(courtesyA.courtesyCampaign?.discountLabel === '20% en cena', 'list row: real benefit (not 0%)');
  check(
    a.data.filter((d) => d.visibility !== 'COURTESY_ONLY').every((d) => d.courtesyMetrics == null),
    'PUBLIC rows carry no courtesy metrics',
  );
  check(b.data.find((d) => d.visibility === 'COURTESY_ONLY')!.courtesyMetrics?.recipientCount === 1, 'B metrics are B only');
}

async function lifecycleMetrics() {
  console.log('\n=== LIST/SUMMARY: metrics across approve → use → cancel ===\n');
  const { db, portal, svc } = world();
  db.agreements.add('prof-a');
  db.follows.push({ tenantId: TENANT, gastroProfileId: 'prof-a', userId: 'u-a' });
  await svc.courtesy.sendCourtesy(
    TENANT,
    'owner-a',
    'GASTRO_OWNER',
    sendBody({ manualEmails: ['b@example.com', 'c@example.com'], sendToFollowers: true }),
  );
  const d0 = db.discounts[0]!;

  const pending = await portal.getDiscountSummary(TENANT, 'owner-a', 'GASTRO_OWNER', d0.id);
  const c = pending.courtesy!;
  check(Boolean(c), 'summary carries the courtesy campaign block');
  check(c.benefitLabel === '20% en cena' && !/^0\s*%$/.test(c.benefitLabel), 'benefit label is real, never 0%');
  check(c.metrics.recipientCount === 3, 'frozen audience: 3 recipients');
  check(c.metrics.manualRecipientCount === 2 && c.metrics.followerRecipientCount === 1, 'audience: 2 emails + 1 follower');
  check(c.metrics.retainedClaims === 3 && c.metrics.deliveredClaims === 0, 'pending: retained, not delivered');
  check(c.createdByOrigin === 'GASTRO' && Boolean(c.validTo), 'origin + vigencia');

  // A new follower after the request does NOT change the audience (frozen, no recalculation).
  db.addUser('u-late', 'late@example.com');
  db.follows.push({ tenantId: TENANT, gastroProfileId: 'prof-a', userId: 'u-late' });
  const again = await portal.getDiscountSummary(TENANT, 'owner-a', 'GASTRO_OWNER', d0.id);
  check(again.courtesy!.metrics.recipientCount === 3, 'late follower is not added (audience frozen)');

  await svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', d0.id);
  const approved = await portal.getDiscountSummary(TENANT, 'owner-a', 'GASTRO_OWNER', d0.id);
  const m = approved.courtesy!.metrics;
  check(m.retainedClaims === 0 && m.availableClaims === 3 && m.deliveredClaims === 3, 'approved: 3 available + delivered');

  const claim = db.claims.find((x) => x.discountId === d0.id)!;
  claim.status = 'USED';
  claim.usedAt = new Date();
  const list = await portal.listMyDiscounts(TENANT, 'owner-a', 'GASTRO_OWNER', 'prof-a');
  const row = list.data.find((d) => d.id === d0.id)!;
  check(row.courtesyMetrics?.usedClaims === 1 && row.courtesyMetrics.availableClaims === 2, 'list: used 1, available 2');

  await portal.updateDiscountStatus(TENANT, 'owner-a', 'GASTRO_OWNER', d0.id, { status: 'CANCELLED' });
  const cancelled = await portal.getDiscountSummary(TENANT, 'owner-a', 'GASTRO_OWNER', d0.id);
  check(
    cancelled.courtesy!.metrics.cancelledClaims === 2 && cancelled.courtesy!.metrics.usedClaims === 1,
    'cancel campaign: unused → cancelled, used preserved',
  );
}

async function ownerCancelPending() {
  console.log('\n=== OWNER: cancel a pending request ===\n');
  const { db, portal, svc } = world();
  db.agreements.add('prof-a');
  await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  const d0 = db.discounts[0]!;
  const res = await portal.updateDiscountStatus(TENANT, 'owner-a', 'GASTRO_OWNER', d0.id, { status: 'CANCELLED' });
  check(res.discount.status === 'CANCELLED', 'parent → CANCELLED');
  check(db.claims.every((x) => x.status === 'CANCELLED'), 'retained claims → CANCELLED');
  check(svc.emailLog.length === 0, 'no delivery email');
  check(res.courtesy!.metrics.cancelledClaims === 3 && res.courtesy!.metrics.retainedClaims === 0, 'metrics: 3 cancelled');
  const reapprove = await errorOf(() => svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', d0.id));
  check(reapprove != null, 'ADMIN cannot approve a withdrawn request');
  const reactivate = await errorOf(() =>
    portal.updateDiscountStatus(TENANT, 'owner-a', 'GASTRO_OWNER', d0.id, { status: 'ACTIVE' }),
  );
  check(reactivate != null && d0.status === 'CANCELLED', 'no reactivation');
  const otherOwner = await errorOf(() =>
    portal.updateDiscountStatus(TENANT, 'owner-b', 'GASTRO_OWNER', d0.id, { status: 'CANCELLED' }),
  );
  check(otherOwner instanceof ForbiddenException, 'owner of B cannot cancel A courtesy');
}

async function adminOrigin() {
  console.log('\n=== OWNER vs ADMIN-created courtesy ===\n');
  const { db, portal, svc } = world();
  db.agreements.add('prof-a');
  await svc.courtesy.sendCourtesy(TENANT, 'admin', 'ADMIN', sendBody());
  const d0 = db.discounts[0]!;
  check(d0.status === 'ACTIVE' && d0.createdByOrigin === 'ADMIN', 'admin-created courtesy is ACTIVE');
  const e = await errorOf(() =>
    portal.updateDiscountStatus(TENANT, 'owner-a', 'GASTRO_OWNER', d0.id, { status: 'CANCELLED' }),
  );
  check(e instanceof ForbiddenException && d0.status === 'ACTIVE', 'owner cannot cancel an ADMIN-created courtesy');
  const summary = await portal.getDiscountSummary(TENANT, 'owner-a', 'GASTRO_OWNER', d0.id);
  check(summary.courtesy?.createdByOrigin === 'ADMIN', 'summary exposes origin (UI hides the action)');
  await svc.admin.cancel(TENANT, 'admin', 'ADMIN', 'prof-a', d0.id, 'Cierre');
  check(d0.status === 'CANCELLED', 'ADMIN still can cancel it');
}

async function operationalShortCodes() {
  console.log('\n=== OPERATIONAL METRICS: no recipient shortCodes for courtesies ===\n');
  const { db, portal, svc } = world();
  await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  const d0 = db.discounts[0]!;
  const ops = await portal.getDiscountOperationalMetrics(TENANT, 'owner-a', 'GASTRO_OWNER', d0.id);
  check(ops.recentShortCodes.length === 0, 'courtesy: recentShortCodes empty (codes are redeemable by hand)');
  check(ops.retainedClaims === 3 && ops.availableClaims === 0, 'courtesy ops: retained excluded from available');

  const pub = addPublicDiscount(db, 'prof-a', 'prof-a');
  db.claims.push({
    id: db.id('claim'), tenantId: TENANT, discountId: pub.id, email: 'p@example.com', userId: null,
    qrToken: 'cd'.repeat(24), accessToken: 'ef'.repeat(32), shortCode: 'PUB123', type: 'PUBLIC_REQUEST',
    source: 'WEB', status: 'ACTIVE', expiresAt: pub.validTo, usedAt: null, emailSentAt: null,
    emailSendError: null, createdAt: new Date(),
  });
  const pubOps = await portal.getDiscountOperationalMetrics(TENANT, 'owner-a', 'GASTRO_OWNER', pub.id);
  check(pubOps.recentShortCodes.includes('PUB123'), 'PUBLIC discount: existing behaviour kept');
}

async function legacyActive() {
  console.log('\n=== LEGACY ACTIVE courtesy ===\n');
  const { db, portal } = world();
  const { discount } = db.addLegacyActiveCourtesy('prof-a', ['l1@example.com', 'l2@example.com']);
  const list = await portal.listMyDiscounts(TENANT, 'owner-a', 'GASTRO_OWNER', 'prof-a');
  const row = list.data.find((d) => d.id === discount.id)!;
  check(row.courtesyMetrics?.availableClaims === 2 && row.courtesyMetrics.deliveredClaims === 2, 'legacy: 2 available + delivered');
  check(resolveCourtesyDisplayState(row) === 'ACTIVE', 'legacy shows "Activa"');
  const summary = await portal.getDiscountSummary(TENANT, 'owner-a', 'GASTRO_OWNER', discount.id);
  check(summary.courtesy?.benefitLabel === '2x1', 'legacy benefit label');
}

async function main() {
  unit();
  await listPerLocal();
  await lifecycleMetrics();
  await ownerCancelPending();
  await adminOrigin();
  await operationalShortCodes();
  await legacyActive();
  if (state.failures > 0) {
    console.error(`\n${state.failures} FAILURE(S)`);
    process.exit(1);
  }
  console.log('\nAll G8.9 courtesy portal checks passed.');
}

void main();

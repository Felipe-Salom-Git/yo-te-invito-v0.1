/**
 * G8.10 — ADMIN courtesy management (behavioural: REAL services over the in-memory fake
 * Prisma). Covers: pending queue (courtesy vs discount), review detail (local, campaign,
 * audience, retained, requester, no master QR), approve / reject UX + domain errors,
 * redelivery (only never-emailed claims), sendQrEmail (PUBLIC kept, COURTESY_ONLY blocked),
 * audit labels, admin list per local + metrics, legacy ACTIVE, security (profile A route +
 * courtesy B, tenant A → B, redelivery wrong profile).
 *
 * Run: pnpm --filter api run test:admin-gastro-courtesy
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  ErrorCode,
  GASTRO_COURTESY_AGREEMENT_REQUIRED_MESSAGE,
  resolveCourtesyAuditActionLabel,
} from '@yo-te-invito/shared';
import { buildAuditLogSummary } from '../src/modules/admin/admin-audit-summary.util';
import {
  FUTURE_TO,
  FakeCourtesyDb,
  TENANT,
  codeOf,
  errorOf,
  makeChecker,
  sendBody,
  type Row,
} from './lib/courtesy-fake-db';

const { check, state } = makeChecker();

function world(opts: { failEmailFor?: string[] } = {}) {
  const db = new FakeCourtesyDb();
  db.addProfile('prof-a');
  db.addProfile('prof-b');
  db.addOwner('owner-a', 'prof-a');
  db.addOwner('owner-b', 'prof-b');
  db.addUser('owner-a', 'owner-a@example.com', 'Olga');
  db.addUser('owner-b', 'owner-b@example.com', 'Omar');
  const svc = db.build(opts);
  const portal = db.buildPortalService(svc);
  return { db, svc, portal };
}

function addPublicDiscount(db: FakeCourtesyDb, over: Row = {}) {
  const row: Row = {
    id: db.id('disc'),
    tenantId: TENANT,
    eventId: 'evt-prof-a',
    gastroProfileId: 'prof-a',
    code: 'PUB-1',
    type: 'PERCENT',
    value: 15,
    displayTitle: 'Público A',
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
    displayImageUrls: ['https://img/x.jpg'],
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    ...over,
  };
  db.discounts.push(row);
  return row;
}

async function pendingQueue() {
  console.log('\n=== PENDING QUEUE: courtesy vs discount ===\n');
  const { db, svc } = world();
  await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  addPublicDiscount(db, { status: 'PENDING_REVIEW', qrToken: null, displayTitle: 'Desc pendiente' });
  const { data } = await svc.admin.listPendingDiscounts(TENANT);
  const courtesy = data.find((d) => d.visibility === 'COURTESY_ONLY');
  const discount = data.find((d) => d.visibility === 'PUBLIC');
  check(Boolean(courtesy) && Boolean(discount), 'queue lists both kinds, distinguishable by visibility');
  check(courtesy!.profileName === 'Local prof-a', 'courtesy: local');
  check(courtesy!.courtesy?.title === 'Cena de cortesía', 'courtesy: campaign');
  check(courtesy!.courtesy?.discountLabel === '20% en cena', 'courtesy: benefit');
  check(courtesy!.courtesy?.recipientCount === 3, 'courtesy: recipients');
  check(Boolean(courtesy!.courtesy?.validTo), 'courtesy: vigencia');
  check(courtesy!.createdByOrigin === 'GASTRO' && courtesy!.status === 'PENDING_REVIEW', 'courtesy: origin + state');
  check(courtesy!.courtesy?.metrics?.retainedClaims === 3, 'courtesy: retained metrics in the queue');
  check(discount!.courtesy == null, 'discount row carries no courtesy block');
}

async function reviewDetail() {
  console.log('\n=== REVIEW DETAIL ===\n');
  const { db, svc } = world();
  await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody({ message: 'Te esperamos' }));
  const d0 = db.discounts[0]!;
  d0.qrToken = 'cd'.repeat(24); // a legacy/inconsistent master token must never be exposed
  const detail = await svc.admin.getDiscountDetail(TENANT, 'prof-a', d0.id);
  check(detail.profileId === 'prof-a' && detail.profileName === 'Local prof-a', 'GastroProfile of the courtesy');
  check(detail.courtesy?.title === 'Cena de cortesía' && detail.courtesy.message === 'Te esperamos', 'campaign info');
  check(detail.courtesy?.metrics?.recipientCount === 3, 'audience count');
  check(detail.courtesy?.metrics?.manualRecipientCount === 3, 'audience breakdown');
  check(detail.courtesy?.metrics?.retainedClaims === 3, 'retained claims');
  check(detail.createdByOrigin === 'GASTRO', 'createdByOrigin');
  check(
    detail.courtesy?.createdBy?.id === 'owner-a' && detail.courtesy.createdBy.email === 'owner-a@example.com',
    'createdByUser (requester)',
  );
  check(detail.qrToken === null && detail.qrPayload == null, 'no master QR exposed for a courtesy');
  const summary = await svc.metrics.buildSummaryForDiscount(TENANT, d0.id, true);
  check(summary.courtesy?.benefitLabel === '20% en cena', 'summary benefit (never 0%)');
  check(summary.claims.every((c) => !('shortCode' in c) && !('qrToken' in c)), 'summary claims carry no tokens/shortCodes');
}

async function approveReject() {
  console.log('\n=== APPROVE / REJECT ===\n');
  const { db, svc } = world();
  await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  const d0 = db.discounts[0]!;
  const noAgreement = await errorOf(() => svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', d0.id));
  check(codeOf(noAgreement) === ErrorCode.BENEFIT_AGREEMENT_NOT_FOUND, 'no CURRENT agreement → domain error');
  check(
    noAgreement?.message === GASTRO_COURTESY_AGREEMENT_REQUIRED_MESSAGE &&
      /acuerdo comercial vigente/.test(noAgreement.message),
    'understandable message ("… no tiene acuerdo comercial vigente …")',
  );
  check(d0.status === 'PENDING_REVIEW' && svc.emailLog.length === 0, 'blocked approval changes nothing');

  db.agreements.add('prof-a');
  const approved = await svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', d0.id);
  check(approved.status === 'ACTIVE' && approved.courtesyDelivery?.sent === 3, 'approve → ACTIVE + delivery');
  check(approved.courtesy?.metrics?.deliveredClaims === 3 && approved.courtesy.metrics.retainedClaims === 0, 'metrics after approval');
  const again = await errorOf(() => svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', d0.id));
  check(again instanceof BadRequestException && svc.emailLog.length === 3, 'second approve fails, no re-delivery');

  const w = world();
  await w.svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  const r0 = w.db.discounts[0]!;
  await w.svc.flush();
  w.svc.notifications.length = 0;
  const rejected = await w.svc.admin.reject(TENANT, 'admin', 'ADMIN', 'prof-a', r0.id, 'Fuera de política');
  await w.svc.flush();
  check(rejected.status === 'REJECTED', 'reject → REJECTED');
  check(w.db.claims.every((c) => c.status === 'CANCELLED'), 'reject → claims cancelled');
  check(w.svc.emailLog.length === 0, 'reject → nothing delivered');
  check(
    w.svc.notifications.some((n) => /rechaz/i.test(String(n.title ?? n.kind))),
    'reject → owner notification',
  );
}

async function redelivery() {
  console.log('\n=== REDELIVERY ===\n');
  const { db, svc } = world({ failEmailFor: ['b@example.com'] });
  db.agreements.add('prof-a');
  await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  const d0 = db.discounts[0]!;
  const approved = await svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', d0.id);
  check(approved.courtesy?.metrics?.pendingDeliveryClaims === 1, 'failed email → 1 pending delivery');
  check(approved.courtesy?.pendingDeliveryCount === 1, 'legacy counter agrees');
  const sentBefore = svc.emailLog.map((e) => e.to);
  const wrong = await errorOf(() => svc.admin.redeliverCourtesy(TENANT, 'admin', 'ADMIN', 'prof-b', d0.id));
  check(wrong instanceof NotFoundException, 'redelivery with wrong profile → blocked (404)');
  const res = await svc.admin.redeliverCourtesy(TENANT, 'admin', 'ADMIN', 'prof-a', d0.id);
  const newlySent = svc.emailLog.map((e) => e.to).slice(sentBefore.length);
  check(res.courtesyDelivery?.skippedAlreadySent === 2, 'claims with emailSentAt are skipped');
  check(res.courtesyDelivery?.attempted === 1, 'only the never-emailed claim is attempted');
  check(newlySent.every((to) => to === 'b@example.com'), 'never re-sends to already-emailed recipients');
  const pub = addPublicDiscount(db);
  const notCourtesy = await errorOf(() => svc.admin.redeliverCourtesy(TENANT, 'admin', 'ADMIN', 'prof-a', pub.id));
  check(notCourtesy instanceof BadRequestException, 'redelivery is courtesy-only');
}

async function sendQrEmail() {
  console.log('\n=== sendQrEmail: PUBLIC vs COURTESY_ONLY ===\n');
  const { db, svc } = world();
  db.agreements.add('prof-a');
  await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  const d0 = db.discounts[0]!;
  await svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', d0.id);
  const before = svc.emailLog.length;
  const e = await errorOf(() => svc.admin.sendQrEmail(TENANT, 'admin', 'ADMIN', 'prof-a', d0.id));
  check(e instanceof BadRequestException, 'COURTESY_ONLY → master QR email blocked');
  check(d0.emailSentAt == null && svc.emailLog.length === before && d0.qrToken == null, 'no email, no master QR minted');
  const pub = addPublicDiscount(db);
  const res = await svc.admin.sendQrEmail(TENANT, 'admin', 'ADMIN', 'prof-a', pub.id);
  check(Boolean(res.emailSentAt) && res.qrPayload != null, 'PUBLIC → existing behaviour (master QR email sent)');
}

async function auditLabels() {
  console.log('\n=== AUDIT LABELS ===\n');
  const { db, svc, portal } = world();
  db.agreements.add('prof-a');
  await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody({ title: 'Otra' }));
  const [c1, c2] = db.discounts;
  await svc.admin.markCommissionNegotiation(TENANT, 'admin', 'ADMIN', 'prof-a', c1!.id);
  await svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', c1!.id);
  await portal.updateDiscountStatus(TENANT, 'owner-a', 'GASTRO_OWNER', c2!.id, { status: 'CANCELLED' });
  const pub = addPublicDiscount(db, { status: 'PENDING_REVIEW', qrToken: null });
  await svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', pub.id);

  const label = (a: Row) =>
    buildAuditLogSummary(a.action, a.entityType ?? 'GastroDiscount', a.before, a.after, a.metadata);
  const find = (action: string, entityId: string) =>
    db.audits.find((a) => a.action === action && a.entityId === entityId)!;
  check(label(find('GASTRO_DISCOUNT_APPROVED', c1!.id)).startsWith('Cortesía gastro aprobada'), 'courtesy approve → "Cortesía gastro aprobada"');
  check(
    label(find('GASTRO_DISCOUNT_COMMISSION_NEGOTIATION', c1!.id)).startsWith('Cortesía gastro en coordinación'),
    'courtesy negotiation labelled as courtesy',
  );
  check(
    label(find('GASTRO_DISCOUNT_CANCELLED', c2!.id)).startsWith('Solicitud de cortesía retirada por el local'),
    'owner withdrawal labelled as such (not "descuento cancelado")',
  );
  check(label(find('GASTRO_DISCOUNT_APPROVED', pub.id)).startsWith('Descuento gastro aprobado'), 'PUBLIC keeps "Descuento gastro aprobado"');
  const created = db.audits.find((a) => a.action === 'GASTRO_DISCOUNT_COURTESY_CREATED')!;
  check(label(created).startsWith('Cortesía gastro solicitada'), 'courtesy creation label');
  const sent = db.audits.find((a) => a.action === 'GASTRO_DISCOUNT_COURTESY_SENT')!;
  check(label(sent).startsWith('Entrega de cortesía gastro'), 'courtesy delivery label');
  check(
    find('GASTRO_DISCOUNT_APPROVED', c1!.id).entityId === c1!.id &&
      find('GASTRO_DISCOUNT_APPROVED', c1!.id).entityType === 'GastroDiscount',
    'canonical ids kept (entity GastroDiscount + discountId)',
  );
  check(
    resolveCourtesyAuditActionLabel({ action: 'GASTRO_DISCOUNT_APPROVED', after: { status: 'ACTIVE' } }) === null,
    'no courtesy flag → generic label',
  );
}

async function adminList() {
  console.log('\n=== ADMIN LIST per local + metrics ===\n');
  const { db, svc } = world();
  await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  await svc.courtesy.sendCourtesy(
    TENANT,
    'owner-b',
    'GASTRO_OWNER',
    sendBody({ gastroProfileId: 'prof-b', manualEmails: ['z@example.com'] }),
  );
  addPublicDiscount(db);
  const foreign = addPublicDiscount(db, { gastroProfileId: 'prof-b', displayTitle: 'B on A event' });
  const a = await svc.admin.listLocationDiscounts(TENANT, 'prof-a');
  check(!a.data.some((d) => d.id === foreign.id), 'row owned by B never listed under A');
  check(a.data.filter((d) => d.visibility === 'COURTESY_ONLY').length === 1, 'A lists only its courtesy');
  check(a.data.some((d) => d.visibility === 'PUBLIC'), 'A lists its discounts too (same list, filterable)');
  const c = a.data.find((d) => d.visibility === 'COURTESY_ONLY')!;
  const m = c.courtesy?.metrics;
  check(
    m?.recipientCount === 3 && m.retainedClaims === 3 && m.availableClaims === 0 && m.deliveredClaims === 0,
    'metrics: recipients / retained / available / delivered (retained ≠ delivered)',
  );
  check(m?.usedClaims === 0 && m.cancelledClaims === 0, 'metrics: used / cancelled');
  const b = await svc.admin.listLocationDiscounts(TENANT, 'prof-b');
  check(b.data.every((d) => d.id !== c.id), 'B list never shows A courtesy');
}

async function legacy() {
  console.log('\n=== LEGACY ACTIVE courtesy ===\n');
  const { db, svc } = world();
  const { discount, campaign } = db.addLegacyActiveCourtesy('prof-a', ['l1@example.com', 'l2@example.com']);
  delete (campaign as Row).createdByUserId;
  const detail = await svc.admin.getDiscountDetail(TENANT, 'prof-a', discount.id);
  check(detail.status === 'ACTIVE', 'legacy ACTIVE stays visible');
  check(detail.courtesy?.createdBy === null, 'no requester history → null (graceful)');
  check(detail.courtesy?.metrics?.availableClaims === 2 && detail.courtesy.metrics.deliveredClaims === 2, 'legacy metrics');
  const approve = await errorOf(() => svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', discount.id));
  check(approve instanceof BadRequestException, 'no retroactive approval required/allowed');
  await svc.admin.cancel(TENANT, 'admin', 'ADMIN', 'prof-a', discount.id, 'Cierre');
  check(discount.status === 'CANCELLED', 'legacy still administrable (cancel)');

  const orphan = db.addLegacyActiveCourtesy('prof-a', ['o@example.com']);
  db.campaigns = db.campaigns.filter((c) => c.id !== orphan.campaign.id);
  const noCampaign = await svc.admin.getDiscountDetail(TENANT, 'prof-a', orphan.discount.id);
  check(noCampaign.courtesy === null && noCampaign.visibility === 'COURTESY_ONLY', 'missing campaign → courtesy null, still loads');
}

async function security() {
  console.log('\n=== SECURITY ===\n');
  const { db, svc } = world();
  db.agreements.add('prof-a');
  db.agreements.add('prof-b');
  await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  await svc.courtesy.sendCourtesy(
    TENANT,
    'owner-b',
    'GASTRO_OWNER',
    sendBody({ gastroProfileId: 'prof-b', manualEmails: ['z@example.com'] }),
  );
  const [cA, cB] = db.discounts;
  const okA = await svc.admin.getDiscountDetail(TENANT, 'prof-a', cA!.id);
  check(okA.id === cA!.id, 'ADMIN profile A → courtesy A OK');
  check(
    (await svc.admin.assertDiscountInProfile(TENANT, 'prof-a', cA!.id)) === 'prof-a',
    'summary/status guard: A route + A courtesy OK',
  );
  for (const [name, fn] of [
    ['detail', () => svc.admin.getDiscountDetail(TENANT, 'prof-a', cB!.id)],
    ['summary guard', () => svc.admin.assertDiscountInProfile(TENANT, 'prof-a', cB!.id)],
    ['approve', () => svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', cB!.id)],
    ['reject', () => svc.admin.reject(TENANT, 'admin', 'ADMIN', 'prof-a', cB!.id, 'x')],
    ['cancel', () => svc.admin.cancel(TENANT, 'admin', 'ADMIN', 'prof-a', cB!.id, 'x')],
    ['metrics', () => svc.admin.getDiscountMetrics(TENANT, 'prof-a', cB!.id)],
    ['redeliver', () => svc.admin.redeliverCourtesy(TENANT, 'admin', 'ADMIN', 'prof-a', cB!.id)],
  ] as const) {
    const e = await errorOf(fn as () => Promise<unknown>);
    check(e instanceof NotFoundException, `ADMIN profile A route + courtesy B → blocked (${name})`);
  }
  check(cB!.status === 'PENDING_REVIEW' && db.claims.filter((c) => c.discountId === cB!.id).every((c) => c.status === 'ACTIVE'), 'courtesy B untouched');
  const ops = await errorOf(() => svc.metrics.getOperationalMetrics(TENANT, 'prof-a', cB!.id));
  check(ops != null, 'operational metrics A route + courtesy B → blocked');

  // Tenant A → tenant B
  db.profiles.push({ id: 'prof-t2', tenantId: 't2', displayName: 'Otro tenant', status: 'ACTIVE', publicEventId: 'evt-t2' });
  const t2 = addPublicDiscount(db, { tenantId: 't2', gastroProfileId: 'prof-t2', eventId: 'evt-t2', visibility: 'COURTESY_ONLY', status: 'PENDING_REVIEW', qrToken: null });
  for (const [name, fn] of [
    ['detail', () => svc.admin.getDiscountDetail(TENANT, 'prof-t2', t2.id)],
    ['approve', () => svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-t2', t2.id)],
    ['summary', () => svc.metrics.buildSummaryForDiscount(TENANT, t2.id, true)],
    ['redeliver', () => svc.admin.redeliverCourtesy(TENANT, 'admin', 'ADMIN', 'prof-t2', t2.id)],
  ] as const) {
    const e = await errorOf(fn as () => Promise<unknown>);
    check(e instanceof NotFoundException, `tenant A → tenant B blocked (${name})`);
  }
  check(t2.status === 'PENDING_REVIEW', 'tenant B row untouched');
}

async function main() {
  await pendingQueue();
  await reviewDetail();
  await approveReject();
  await redelivery();
  await sendQrEmail();
  await auditLabels();
  await adminList();
  await legacy();
  await security();
  if (state.failures > 0) {
    console.error(`\n${state.failures} FAILURE(S)`);
    process.exit(1);
  }
  console.log('\nAll G8.10 admin courtesy checks passed.');
}

void main();

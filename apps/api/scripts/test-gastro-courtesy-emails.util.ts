/**
 * G8.8 — Courtesy notifications, agreement emails, metrics and owner cancel
 * (behavioural: REAL services over the in-memory fake Prisma; only the delivery sink is captured).
 *
 * Covers: owner "request received" (no QR), approval (local/campaign/recipients/vigencia/estado +
 * CURRENT agreement, not persisted), rejection (stored reason only), normal-discount approval
 * agreement, recipient email with shortCode, failed delivery retry, metrics (retained is never
 * available/delivered), owner cancel of a pending request.
 *
 * Run: pnpm --filter api run test:gastro-courtesy-emails
 */
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { formatGastroClaimShortCodeForDisplay } from '../src/common/gastro-claim-short-code.util';
import { renderEmailTemplate } from '../src/email/templates/email-template.renderer';
import {
  buildAgreementDetails,
  buildDiscountLifecycleContent,
  formatBarterMultiplier,
} from '../src/modules/notifications/gastro-lifecycle-email-content';
import {
  FUTURE_TO,
  FakeCourtesyDb,
  TENANT,
  errorOf,
  makeChecker,
  sendBody,
} from './lib/courtesy-fake-db';

const { check, state } = makeChecker();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function world() {
  const db = new FakeCourtesyDb();
  db.addProfile('prof-a');
  db.addProfile('prof-b');
  db.addOwner('owner-a', 'prof-a');
  db.addOwner('owner-b', 'prof-b');
  db.addUser('owner-a', 'owner-a@example.com', 'Olga');
  db.addUser('owner-b', 'owner-b@example.com', 'Omar');
  db.addUser('u-a', 'a@example.com');
  return { db, svc: db.build() };
}

function labels(n: Row): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of (n.emailTemplateVariables?.details ?? []) as Array<{ label: string; value: string }>) {
    out[d.label] = d.value;
  }
  return out;
}

function renderLifecycle(n: Row) {
  return renderEmailTemplate({
    templateId: n.emailTemplateId,
    variables: n.emailTemplateVariables,
  });
}

function unit() {
  console.log('\n=== UNIT: agreement lines ===\n');
  check(formatBarterMultiplier('2.0000') === '2x', 'multiplier 2.0000 → 2x');
  check(formatBarterMultiplier('1.5000') === '1.5x', 'multiplier 1.5000 → 1.5x');
  check(buildAgreementDetails(null).length === 0, 'no agreement → no agreement lines (never invented)');
  const rows = buildAgreementDetails({
    unitPriceCents: '500000',
    currency: 'ARS',
    barterMultiplier: '2.0000',
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
  });
  check(
    rows.map((r) => r.label).join('|') ===
      'Valor reconocido por uso|Moneda|Multiplicador de canje|Vigencia del acuerdo',
    'agreement lines: valor / moneda / canje / vigencia',
  );
  check(rows[3]!.value === '01/01/2026 – 31/12/2026', 'agreement vigency is a calendar range');
  const pendingNoAgreement = buildDiscountLifecycleContent({
    event: 'pending',
    aspect: 'create',
    isCourtesy: true,
    title: 'X',
    agreement: { unitPriceCents: '1', currency: 'ARS', barterMultiplier: '1', validFrom: '2026-01-01', validTo: null },
  });
  check(
    !pendingNoAgreement.details.some((d) => d.label === 'Moneda'),
    'pending never renders the agreement (it is only resolved at approval)',
  );
}

async function ownerPending() {
  console.log('\n=== OWNER: request received / pending approval (no QR yet) ===\n');
  const { db, svc } = world();
  await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  await svc.flush();

  check(svc.notifications.length === 1, 'exactly one owner notification at request time');
  const n = svc.notifications[0]!;
  check(n.userId === 'owner-a' && n.userEmail === 'owner-a@example.com', 'sent to the owner of the local');
  check(n.kind === 'GASTRO_DISCOUNT_PENDING_REVIEW', 'kind = pending review');
  check(/pendiente de aprobación/i.test(n.body), 'says it is pending approval');
  check(/ningún QR/i.test(n.body), 'says no QR was sent yet');
  const d = labels(n);
  check(d['Local'] === 'Local prof-a', 'shows the local');
  check(d['Campaña'] === 'Cena de cortesía', 'shows the campaign name');
  check(d['Destinatarios'] === '3', 'shows the recipient count');
  check(d['Estado'] === 'Pendiente de aprobación', 'shows estado');
  check(Boolean(d['Vigencia']) && d['Vigencia']!.includes('2027'), 'shows the vigencia');
  const html = renderLifecycle(n);
  check(!/qrserver|Código QR|<img/i.test(html.html), 'pending email contains NO QR');
  check(!/Valor reconocido/.test(html.text), 'pending email shows no commercial agreement');
  check(db.claims.every((c) => c.emailSentAt == null) && svc.emailLog.length === 0, 'no recipient email yet');
}

async function ownerApprovedAndAgreement() {
  console.log('\n=== OWNER: approved + CURRENT agreement ===\n');
  const { db, svc } = world();
  db.agreements.add('prof-a');
  await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  await svc.flush();
  svc.notifications.length = 0;
  const d0 = db.discounts[0]!;
  await svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', d0.id);
  await svc.flush();

  check(svc.notifications.length === 1, 'one owner notification on approval');
  const n = svc.notifications[0]!;
  check(n.kind === 'GASTRO_DISCOUNT_APPROVED_BY_ADMIN' || /aprobad/i.test(n.title), 'approval notification');
  const d = labels(n);
  check(d['Local'] === 'Local prof-a', 'approved: local');
  check(d['Campaña'] === 'Cena de cortesía', 'approved: campaign name');
  check(d['Destinatarios'] === '3', 'approved: recipient count');
  check(d['Estado'] === 'Aprobada', 'approved: estado');
  check(Boolean(d['Vigencia']), 'approved: vigencia');
  check(/\$\s?5\.000/.test(d['Valor reconocido por uso'] ?? ''), `agreement: valor por validación (${d['Valor reconocido por uso']})`);
  check(d['Moneda'] === 'ARS', 'agreement: moneda');
  check(d['Multiplicador de canje'] === '2x', 'agreement: multiplicador de canje');
  check(d['Vigencia del acuerdo'] === 'Desde 01/01/2026, sin fecha de fin', 'agreement: vigencia del acuerdo');
  const html = renderLifecycle(n);
  check(
    html.html.includes('Valor reconocido por uso') && html.html.includes('Multiplicador de canje'),
    'agreement lines rendered in the email HTML',
  );
  check(html.text.includes('Moneda: ARS') && html.text.includes('Multiplicador de canje: 2x'), 'agreement lines in plain text');

  const persisted = JSON.stringify({ d: db.discounts, c: db.campaigns });
  check(
    !/unitPriceCents|barterMultiplier|agreementId/.test(persisted),
    'agreement NOT persisted as a second snapshot on discount/campaign',
  );

  // Changing the CURRENT agreement is reflected next time (resolved at notification time).
  const w = world();
  w.db.agreements.add('prof-a');
  w.db.agreementTerms = { ...w.db.agreementTerms, unitPriceCents: '900000', barterMultiplier: '1.5000' };
  await w.svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  await w.svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', w.db.discounts[0]!.id);
  await w.svc.flush();
  const n2 = w.svc.notifications.find((x) => /aprobad/i.test(x.title))!;
  check(labels(n2)['Multiplicador de canje'] === '1.5x', 'agreement is the CURRENT one at approval time');
}

async function ownerRejected() {
  console.log('\n=== OWNER: rejected (reason only if stored) ===\n');
  const { db, svc } = world();
  await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  await svc.flush();
  svc.notifications.length = 0;
  const d0 = db.discounts[0]!;
  await svc.admin.reject(TENANT, 'admin', 'ADMIN', 'prof-a', d0.id, 'No cumple las bases');
  await svc.flush();
  const n = svc.notifications[0]!;
  check(n.kind === 'GASTRO_DISCOUNT_REJECTED_BY_ADMIN' || /rechazad/i.test(n.title), 'rejection notification');
  check(/No cumple las bases/.test(n.body), 'rejection body carries the stored reason');
  check(labels(n)['Motivo'] === 'No cumple las bases' && labels(n)['Estado'] === 'Rechazada', 'details: motivo + estado');
  check(!/Valor reconocido/.test(renderLifecycle(n).text), 'rejected shows no agreement');
  check(svc.emailLog.length === 0, 'rejected: no recipient email');

  // Without an explicit reason, only an already-persisted rejectionReason is shown.
  const w = world();
  await w.svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  const w0 = w.db.discounts[0]!;
  w0.status = 'REJECTED';
  w0.rejectionReason = null;
  w.svc.lifecycle.notifyDiscountRejected(TENANT, w0.id, 'Cena de cortesía', 'create');
  await w.svc.flush();
  const none = w.svc.notifications.at(-1)!;
  check(!/Motivo/.test(none.body) && labels(none)['Motivo'] === undefined, 'no stored reason → no "Motivo" (never invented)');
  w0.rejectionReason = 'Motivo guardado';
  w.svc.notifications.length = 0;
  // New referenceKey is irrelevant here (sink is captured, idempotency lives in deliver()).
  w.svc.lifecycle.notifyDiscountRejected(TENANT, w0.id, 'Cena de cortesía', 'create');
  await w.svc.flush();
  check(/Motivo guardado/.test(w.svc.notifications[0]!.body), 'stored rejectionReason is used when none is passed');
}

async function normalDiscountApprovalAgreement() {
  console.log('\n=== NORMAL DISCOUNT approval renders the same agreement ===\n');
  const { db, svc } = world();
  db.agreements.add('prof-a');
  db.discounts.push({
    id: 'cmnormal000000001',
    tenantId: TENANT,
    eventId: 'evt-prof-a',
    gastroProfileId: 'prof-a',
    code: 'N-1',
    type: 'PERCENT',
    value: 20,
    displayTitle: '20% en pizzas',
    summary: 'Pizzas',
    detail: 'Pizzas',
    displayDescription: 'Pizzas',
    validityMode: 'DATE_RANGE',
    validWeekday: null,
    validFrom: new Date('2026-10-01T03:00:00.000Z'),
    validTo: new Date(FUTURE_TO),
    discountDate: new Date(FUTURE_TO),
    status: 'PENDING_REVIEW',
    visibility: 'PUBLIC',
    qrToken: null,
    displayImageUrls: ['https://example.com/a.png'],
    submittedImageUrls: ['https://example.com/a.png'],
    createdByOrigin: 'GASTRO',
    pendingUpdate: null,
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
  });
  await svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', 'cmnormal000000001');
  await svc.flush();
  const n = svc.notifications.at(-1)!;
  const d = labels(n);
  check(/aprobad/i.test(n.title), 'discount approval notification');
  check(d['Descuento'] === '20% en pizzas' && d['Beneficio'] === '20%', 'discount: name + benefit');
  check(
    /\$\s?5\.000/.test(d['Valor reconocido por uso'] ?? '') &&
      d['Moneda'] === 'ARS' &&
      d['Multiplicador de canje'] === '2x' &&
      Boolean(d['Vigencia del acuerdo']),
    'discount approval renders the same agreement lines as a courtesy',
  );
  check(!/unitPriceCents/.test(JSON.stringify(db.discounts)), 'discount does not persist the agreement either');
}

async function recipientDelivery() {
  console.log('\n=== USER: delivery email has shortCode; failed delivery retry ===\n');
  const { db, svc } = world();
  db.agreements.add('prof-a');
  await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  const d0 = db.discounts[0]!;
  const failing = db.build({ failEmailFor: ['b@example.com'] });
  await failing.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', d0.id);

  check(failing.emailLog.length === 2, 'approval delivers to the 2 reachable recipients');
  const a = db.claims.find((c) => c.email === 'a@example.com')!;
  const mail = failing.emailLog.find((m) => m.to === 'a@example.com')!;
  const shown = formatGastroClaimShortCodeForDisplay(a.shortCode);
  check(mail.templateId === 'GASTRO_DISCOUNT_QR_COURTESY', 'recipient template = courtesy QR');
  check(mail.variables.shortCode === shown, 'recipient email variables carry the shortCode');
  const r = renderEmailTemplate({ templateId: mail.templateId as never, variables: mail.variables });
  check(r.html.includes(shown) && r.text.includes(shown), 'shortCode is clearly shown (HTML + text), not only in the QR');
  check(r.html.includes('qrserver') && r.text.includes('Local prof-a'), 'individual QR + local present');
  check(/Vigencia|Válido hasta/.test(r.html), 'vigencia present');
  check(mail.variables.userName === a.recipientName || typeof mail.variables.userName === 'string', 'recipient name present');
  check(
    !r.html.includes(d0.qrToken ?? 'no-master') && mail.variables.qrImageUrl.includes(encodeURIComponent(a.qrToken)),
    'QR is the individual claim QR (no master token)',
  );

  const b = db.claims.find((c) => c.email === 'b@example.com')!;
  check(b.emailSentAt == null && Boolean(b.emailSendError), 'failed recipient keeps emailSendError and no emailSentAt');
  const sentBefore = db.claims.filter((c) => c.emailSentAt).map((c) => c.id);

  const retry = db.build();
  await retry.admin.redeliverCourtesy(TENANT, 'admin', 'ADMIN', 'prof-a', d0.id);
  check(retry.emailLog.length === 1 && retry.emailLog[0]!.to === 'b@example.com', 'retry mails ONLY the pending recipient');
  check(retry.emailLog[0]!.variables.shortCode === formatGastroClaimShortCodeForDisplay(b.shortCode), 'retry email has shortCode');
  check(b.emailSentAt != null && b.emailSendError == null, 'after retry: emailSentAt set, error cleared');
  check(
    db.claims.filter((c) => c.emailSentAt).length === 3 && sentBefore.every((id) => db.claims.find((c) => c.id === id)!.emailSentAt),
    'already-delivered claims untouched',
  );
  check(db.claims.length === 3 && new Set(db.claims.map((c) => c.shortCode)).size === 3, 'claims not duplicated');
}

async function metrics() {
  console.log('\n=== METRICS: retained ≠ delivered/active; used; cancelled ===\n');
  const { db, svc } = world();
  db.agreements.add('prof-a');
  await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  const d0 = db.discounts[0]!;

  const pending = await svc.metrics.buildSummaryForDiscount(TENANT, d0.id);
  check(
    pending.metrics.retainedClaims === 3 &&
      pending.metrics.availableClaims === 0 &&
      pending.metrics.deliveredClaims === 0 &&
      pending.metrics.totalClaims === 3,
    'pending: retained 3 · available 0 · delivered 0 (total 3)',
  );
  const adminPending = await svc.admin.getDiscountMetrics(TENANT, 'prof-a', d0.id);
  check(
    adminPending.retainedClaimsCount === 3 && adminPending.availableClaimsCount === 0,
    'admin metrics: retained 3, available 0',
  );
  const opPending = await svc.metrics.getOperationalMetrics(TENANT, 'prof-a', d0.id);
  check(
    opPending.retainedClaims === 3 && opPending.availableClaims === 0 && opPending.cancelledClaims === 0,
    'operational metrics: retained 3, available 0',
  );
  const profPending = await svc.profileMetrics.getMetricsForProfile(TENANT, 'admin', 'ADMIN', 'prof-a');
  check(profPending.totalClaims === 0, 'profile totalClaims excludes retained claims');

  const failing = db.build({ failEmailFor: ['b@example.com'] });
  await failing.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', d0.id);
  const live = await svc.metrics.buildSummaryForDiscount(TENANT, d0.id);
  check(
    live.metrics.retainedClaims === 0 && live.metrics.availableClaims === 3 && live.metrics.deliveredClaims === 2,
    'approved: retained 0 · available 3 · delivered 2 (one email failed, not "delivered")',
  );
  check(live.metrics.emailSentCount === 2 && live.metrics.emailFailedCount === 1, 'email counters: 2 sent / 1 failed');
  const profLive = await svc.profileMetrics.getMetricsForProfile(TENANT, 'admin', 'ADMIN', 'prof-a');
  check(profLive.totalClaims === 3, 'profile totalClaims counts them once approved');

  // Used
  const a = db.claims.find((c) => c.email === 'a@example.com')!;
  const scan = await svc.scanner.validate(TENANT, 'admin', 'ADMIN', { qrPayload: db.qrFor(a) } as never);
  check(scan.status === 'VALID', 'scan of a delivered claim redeems it');
  const used = await svc.metrics.buildSummaryForDiscount(TENANT, d0.id);
  check(
    used.metrics.usedClaims === 1 && used.metrics.availableClaims === 2 && used.metrics.deliveredClaims === 1,
    'used 1 · available 2 · delivered 1 (used claim leaves delivered/active)',
  );
  const opUsed = await svc.metrics.getOperationalMetrics(TENANT, 'prof-a', d0.id);
  check(opUsed.usageCount === 1 && opUsed.availableClaims === 2, 'operational: used 1 · available 2');

  // Cancelled
  await svc.metrics.updateDiscountStatus(TENANT, d0.id, { status: 'CANCELLED' }, { id: 'admin', role: 'ADMIN' }, { profileId: 'prof-a' });
  const cancelled = await svc.metrics.buildSummaryForDiscount(TENANT, d0.id);
  check(
    cancelled.metrics.cancelledClaims === 2 &&
      cancelled.metrics.usedClaims === 1 &&
      cancelled.metrics.availableClaims === 0 &&
      cancelled.metrics.deliveredClaims === 0,
    'cancelled 2 · used 1 · available 0 · delivered 0',
  );
  const adminCancelled = await svc.admin.getDiscountMetrics(TENANT, 'prof-a', d0.id);
  check(adminCancelled.availableClaimsCount === 0 && adminCancelled.cancelledClaimsCount === 2, 'admin metrics: cancelled 2 · available 0');
}

async function ownerCancelPending() {
  console.log('\n=== OWNER: cancel own PENDING request ===\n');
  const { db, svc } = world();
  db.agreements.add('prof-a');
  await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  const d0 = db.discounts[0]!;
  const owner = { id: 'owner-a', role: 'GASTRO_OWNER' };

  const foreign = await errorOf(() =>
    svc.metrics.updateDiscountStatus(TENANT, d0.id, { status: 'CANCELLED' }, { id: 'owner-b', role: 'GASTRO_OWNER' }, { profileId: 'prof-b' }),
  );
  check(foreign instanceof ForbiddenException && d0.status === 'PENDING_REVIEW', 'owner of another local cannot cancel it');

  const res = await svc.metrics.updateDiscountStatus(TENANT, d0.id, { status: 'CANCELLED' }, owner, { profileId: 'prof-a' });
  check(d0.status === 'CANCELLED', 'owner cancels own pending request → CANCELLED (not REJECTED)');
  check(db.claims.length === 3 && db.claims.every((c) => c.status === 'CANCELLED'), 'retained claims → CANCELLED');
  check(db.claims.every((c) => c.emailSentAt == null) && svc.emailLog.length === 0, 'no delivery email');
  check(res.metrics.cancelledClaims === 3 && res.metrics.retainedClaims === 0 && res.metrics.availableClaims === 0, 'metrics: cancelled 3 · retained 0 · available 0');
  check(
    db.audits.some((a) => a.action === 'GASTRO_DISCOUNT_CANCELLED' && a.metadata?.pendingRequestWithdrawn === true && a.metadata?.cancelledClaims === 3),
    'audit records the withdrawn request',
  );

  const approve = await errorOf(() => svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', d0.id));
  check(approve instanceof BadRequestException && d0.status === 'CANCELLED', 'ADMIN cannot approve a cancelled request');
  check(svc.emailLog.length === 0 && db.claims.every((c) => c.status === 'CANCELLED'), 'approval attempt does not deliver/reactivate');
  const react = await errorOf(() => svc.metrics.updateDiscountStatus(TENANT, d0.id, { status: 'ACTIVE' }, owner, { profileId: 'prof-a' }));
  check(react instanceof BadRequestException && d0.status === 'CANCELLED', 'no reactivation (CANCELLED is terminal)');
  const again = await errorOf(() => svc.metrics.updateDiscountStatus(TENANT, d0.id, { status: 'CANCELLED' }, owner, { profileId: 'prof-a' }));
  check(again === null || again instanceof BadRequestException, 'cancelling again is harmless');
  const scan = await svc.scanner.validate(TENANT, 'admin', 'ADMIN', { qrPayload: db.qrFor(db.claims[0]!) } as never);
  check(scan.status !== 'VALID', `a cancelled claim cannot redeem (got ${scan.status})`);

  // Concurrent approval wins → the owner cancel must not undo it.
  const race = world();
  race.db.agreements.add('prof-a');
  await race.svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  const r0 = race.db.discounts[0]!;
  await race.svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', r0.id);
  const late = await errorOf(() =>
    race.svc.metrics.updateDiscountStatus(TENANT, r0.id, { status: 'CANCELLED' }, owner, { profileId: 'prof-a' }),
  );
  check(late === null && r0.status === 'CANCELLED', 'after approval the normal courtesy cancel still applies (existing G8.2 behaviour)');

  // Normal (non-courtesy) pending discounts keep their lifecycle: owner cannot cancel them.
  const n = world();
  n.db.discounts.push({
    id: 'cmnormal000000009', tenantId: TENANT, gastroProfileId: 'prof-a', status: 'PENDING_REVIEW',
    visibility: 'PUBLIC', validityMode: 'DATE_RANGE', displayTitle: 'N', createdAt: new Date(), updatedAt: new Date(),
  });
  const blocked = await errorOf(() =>
    n.svc.metrics.updateDiscountStatus(TENANT, 'cmnormal000000009', { status: 'CANCELLED' }, owner, { profileId: 'prof-a' }),
  );
  check(blocked instanceof BadRequestException, 'normal pending discount cancel is out of scope (unchanged)');
}

async function adminCreatedCourtesy() {
  console.log('\n=== ADMIN-created courtesy: owner informed with the agreement ===\n');
  const { db, svc } = world();
  db.agreements.add('prof-a');
  await svc.courtesy.sendCourtesy(TENANT, 'admin', 'ADMIN', sendBody());
  await svc.flush();
  const n = svc.notifications.at(-1);
  check(Boolean(n) && /aprobad/i.test(n!.title) && labels(n!)['Multiplicador de canje'] === '2x', 'admin-created courtesy notifies the owner with the CURRENT agreement');
  check(svc.emailLog.length === 3 && svc.emailLog.every((m) => Boolean(m.variables.shortCode)), 'recipients emailed with shortCode');
}

async function main() {
  unit();
  await ownerPending();
  await ownerApprovedAndAgreement();
  await ownerRejected();
  await normalDiscountApprovalAgreement();
  await recipientDelivery();
  await metrics();
  await ownerCancelPending();
  await adminCreatedCourtesy();

  if (state.failures > 0) {
    console.error(`\n${state.failures} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll G8.8 courtesy notification / email / metrics / cancel checks passed.\n');
}

main().catch((e) => {
  console.error('UNEXPECTED:', e);
  process.exit(1);
});

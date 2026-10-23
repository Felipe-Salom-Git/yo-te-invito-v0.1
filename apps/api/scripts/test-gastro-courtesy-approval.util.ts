/**
 * G8.3 — Courtesy approval + commercial agreement gate (behavioural, in-memory fake Prisma).
 *
 * Covers: owner create → PENDING_REVIEW + retained claims (atomic), retained claims unusable
 * (scanner QR + shortCode, /me, public claim view), no delivery before approval, agreement gate
 * on approve (owner) and on create (admin), reject → claims unusable + terminal, cross-profile
 * isolation, legacy ACTIVE courtesies untouched, no master QR, no follower alert.
 *
 * Run: pnpm --filter api run test:gastro-courtesy-approval
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ErrorCode } from '@yo-te-invito/shared';
import {
  FakeCourtesyDb,
  TENANT,
  codeOf,
  errorOf,
  makeChecker,
  sendBody,
} from './lib/courtesy-fake-db';

const { check, state } = makeChecker();

function world() {
  const db = new FakeCourtesyDb();
  db.addProfile('prof-a');
  db.addProfile('prof-b');
  db.addOwner('owner-a', 'prof-a');
  db.addOwner('owner-b', 'prof-b');
  db.addUser('u-a', 'a@example.com');
  return { db, svc: db.build() };
}

async function ownerCreatesPending() {
  console.log('\n=== OWNER: create → pending + retained claims, nothing delivered ===\n');
  const { db, svc } = world();
  const res = await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  const d = db.discounts[0]!;

  check(d.status === 'PENDING_REVIEW', 'owner courtesy is born PENDING_REVIEW (not ACTIVE)');
  check(d.visibility === 'COURTESY_ONLY', 'visibility = COURTESY_ONLY');
  check(d.gastroProfileId === 'prof-a' && d.tenantId === TENANT, 'gastroProfileId + tenant correct');
  check(d.createdByOrigin === 'GASTRO' && d.createdByUserId === 'owner-a', 'createdByOrigin GASTRO + createdByUserId');
  check(d.qrToken === null, 'no master qrToken');
  check(db.campaigns.length === 1 && db.campaigns[0]!.discountId === d.id, 'campaign created and linked');
  check(db.claims.length === 3, 'one retained claim per recipient (frozen audience)');
  check(
    db.claims.every(
      (c) => c.type === 'COURTESY' && c.status === 'ACTIVE' && c.discountId === d.id && c.tenantId === TENANT,
    ),
    'claims: type COURTESY, scoped to tenant + discount',
  );
  check(db.claims.every((c) => c.emailSentAt == null), 'no claim has been emailed');
  check(svc.emailLog.length === 0, 'no email delivery before approval');
  check(res.pendingApproval === true && res.discountStatus === 'PENDING_REVIEW', 'response says pending approval');
  check(res.sentCount === 0 && res.createdCount === 3, 'response: sent 0, created 3');
  check(db.txCount === 1, 'discount + campaign + claims created in a single transaction');
  check(
    db.audits.some((a) => a.action === 'GASTRO_DISCOUNT_COURTESY_CREATED' && a.after?.retainedClaims === 3),
    'audit records the retained claims',
  );
  check(
    !db.audits.some((a) => a.action === 'GASTRO_DISCOUNT_COURTESY_SENT'),
    'no "SENT" audit before approval',
  );
  check(svc.alerts.length === 0, 'no follower alert at creation');

  // Atomicity: a failure while creating claims leaves nothing behind.
  const w2 = world();
  w2.db.failClaimCreateAt = 2;
  const err = await errorOf(() => w2.svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody()));
  check(err !== null, 'claim creation failure surfaces');
  check(
    w2.db.discounts.length === 0 && w2.db.campaigns.length === 0 && w2.db.claims.length === 0,
    'transaction rolled back: no discount/campaign/partial claims',
  );
}

async function retainedClaimsUnusable() {
  console.log('\n=== Retained claims are unusable (backend-side) ===\n');
  const { db, svc } = world();
  await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  const claim = db.claims.find((c) => c.email === 'a@example.com')!;

  const byQr = await svc.scanner.validate(TENANT, 'admin', 'ADMIN', { qrPayload: db.qrFor(claim) } as never);
  check(byQr.status !== 'VALID', `scanner QR of a retained claim is NOT valid (got ${byQr.status})`);
  const byCode = await svc.scanner.validate(TENANT, 'admin', 'ADMIN', { qrPayload: claim.shortCode } as never);
  check(byCode.status !== 'VALID', `scanner shortCode of a retained claim is NOT valid (got ${byCode.status})`);
  check(db.validations.length === 0, 'no validation (redemption) created');
  check(db.claims.every((c) => c.status === 'ACTIVE' && c.usedAt == null), 'claims not consumed');

  const me = await svc.me.listForUser(TENANT, 'u-a');
  check(me.data.length === 0, '/me/descuentos hides the retained courtesy');

  const err = await errorOf(() => svc.publicSvc.getClaimView(TENANT, claim.id, claim.accessToken));
  check(err instanceof NotFoundException, 'public claim view (even with accessToken) → 404 while retained');

  db.discounts[0]!.status = 'COMMISSION_NEGOTIATION';
  const me2 = await svc.me.listForUser(TENANT, 'u-a');
  check(me2.data.length === 0, '/me hides it during COMMISSION_NEGOTIATION too');

  db.discounts[0]!.status = 'PENDING_REVIEW';
  const act = await errorOf(() =>
    svc.metrics.updateDiscountStatus(TENANT, db.discounts[0]!.id, { status: 'ACTIVE' }, { id: 'owner-a', role: 'GASTRO_OWNER' }, { profileId: 'prof-a' }),
  );
  check(act instanceof BadRequestException && db.discounts[0]!.status === 'PENDING_REVIEW', 'owner cannot self-activate a pending courtesy');
}

async function agreementGate() {
  console.log('\n=== ADMIN approve: CURRENT agreement gate ===\n');
  {
    const { db, svc } = world();
    await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
    const id = db.discounts[0]!.id;
    const err = await errorOf(() => svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', id));
    check(err instanceof BadRequestException && codeOf(err) === ErrorCode.BENEFIT_AGREEMENT_NOT_FOUND, 'no CURRENT agreement → BENEFIT_AGREEMENT_NOT_FOUND');
    check(db.discounts[0]!.status === 'PENDING_REVIEW', 'courtesy stays pending');
    check(db.claims.every((c) => c.emailSentAt == null) && svc.emailLog.length === 0, 'no delivery when approval is blocked');
    check(db.claims.length === 3, 'claims untouched');
  }
  {
    const { db, svc } = world();
    db.agreements.add('prof-a');
    await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
    const d = db.discounts[0]!;
    const detail = (await svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', d.id)) as Record<string, any>;
    check(d.status === 'ACTIVE', 'CURRENT agreement → approve → ACTIVE');
    check(d.qrToken === null, 'approval does NOT mint a master QR for the courtesy');
    check(svc.alerts.length === 0, 'approval does NOT alert followers about a private courtesy');
    check(db.claims.length === 3, 'approval does not create claims (frozen audience)');
    check(
      db.audits.some((a) => a.action === 'GASTRO_DISCOUNT_APPROVED' && a.after?.courtesy === true),
      'approval audited (courtesy)',
    );
    check(detail.visibility === 'COURTESY_ONLY' && detail.courtesy?.recipientCount === 3, 'detail exposes courtesy context for admin');
    check(!d.displayImageUrls || d.displayImageUrls.length === 0, 'courtesy approved without publication images');
  }
  {
    const { db, svc } = world();
    db.agreements.add('prof-b');
    await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
    const err = await errorOf(() => svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', db.discounts[0]!.id));
    check(codeOf(err) === ErrorCode.BENEFIT_AGREEMENT_NOT_FOUND, "Local B's agreement does not unlock Local A's courtesy");
  }
  {
    const { db, svc } = world();
    db.agreements.add('prof-a');
    await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
    db.discounts[0]!.validTo = new Date('2020-01-01T00:00:00.000Z');
    const err = await errorOf(() => svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', db.discounts[0]!.id));
    check(codeOf(err) === ErrorCode.GASTRO_COURTESY_EXPIRED_AT_APPROVAL, 'expired courtesy cannot be approved');
    check(db.discounts[0]!.status === 'PENDING_REVIEW', 'stays pending (admin must reject)');
  }
  {
    const { db, svc } = world();
    db.agreements.add('prof-a');
    await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
    const id = db.discounts[0]!.id;
    await svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', id);
    const sentAfterFirst = svc.emailLog.length;
    const err = await errorOf(() => svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', id));
    check(err instanceof BadRequestException, 'repeat approve refused (already processed)');
    check(svc.emailLog.length === sentAfterFirst && db.claims.length === 3, 'repeat approve: no duplicate email, no duplicate claim');
  }
}

async function adminCreate() {
  console.log('\n=== ADMIN-created courtesy: no review step, agreement still required ===\n');
  {
    const { db, svc } = world();
    const err = await errorOf(() => svc.courtesy.sendCourtesy(TENANT, 'admin-1', 'ADMIN', sendBody()));
    check(err instanceof BadRequestException && codeOf(err) === ErrorCode.BENEFIT_AGREEMENT_NOT_FOUND, 'ADMIN create without CURRENT agreement → blocked');
    check(db.discounts.length === 0 && db.claims.length === 0 && svc.emailLog.length === 0, 'nothing created / delivered (no silent exception)');
  }
  {
    const { db, svc } = world();
    db.agreements.add('prof-a');
    const res = await svc.courtesy.sendCourtesy(TENANT, 'admin-1', 'ADMIN', sendBody());
    const d = db.discounts[0]!;
    check(d.status === 'ACTIVE' && d.createdByOrigin === 'ADMIN', 'ADMIN create + agreement → ACTIVE (no PENDING_REVIEW)');
    check(d.qrToken === null, 'admin courtesy has no master QR');
    check(res.pendingApproval === false && res.sentCount === 3, 'ADMIN create delivers right away (3 emails)');
    check(db.claims.length === 3 && db.claims.every((c) => c.emailSentAt != null), 'claims created and marked delivered');
  }
}

async function rejectFlow() {
  console.log('\n=== REJECT: claims unusable, no delivery, terminal ===\n');
  const { db, svc } = world();
  db.agreements.add('prof-a');
  await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  const d = db.discounts[0]!;
  const claim = db.claims.find((c) => c.email === 'a@example.com')!;
  await svc.admin.reject(TENANT, 'admin', 'ADMIN', 'prof-a', d.id, 'No aplica');
  check(d.status === 'REJECTED' && d.rejectionReason === 'No aplica', 'courtesy → REJECTED');
  check(db.claims.length === 3 && db.claims.every((c) => c.status === 'CANCELLED'), 'all retained claims → CANCELLED (unusable)');
  check(svc.emailLog.length === 0, 'reject sends no delivery email');
  check(
    db.audits.some((a) => a.action === 'GASTRO_DISCOUNT_REJECTED' && a.after?.cancelledClaims === 3),
    'audit records cancelled claims',
  );
  const scan = await svc.scanner.validate(TENANT, 'admin', 'ADMIN', { qrPayload: db.qrFor(claim) } as never);
  check(scan.status !== 'VALID', `scanner refuses a rejected courtesy claim (got ${scan.status})`);
  const me = await svc.me.listForUser(TENANT, 'u-a');
  check(me.data.length === 0, '/me never shows a rejected courtesy');
  const react = await errorOf(() =>
    svc.metrics.updateDiscountStatus(TENANT, d.id, { status: 'ACTIVE' }, { id: 'admin', role: 'ADMIN' }, { profileId: 'prof-a' }),
  );
  check(react instanceof BadRequestException && d.status === 'REJECTED', 'no reactivation shortcut after rejection');
  const approveAgain = await errorOf(() => svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', d.id));
  check(approveAgain instanceof BadRequestException && d.status === 'REJECTED', 'cannot approve a rejected courtesy');
  const rejectAgain = await errorOf(() => svc.admin.reject(TENANT, 'admin', 'ADMIN', 'prof-a', d.id, 'again'));
  check(rejectAgain instanceof BadRequestException, 'cannot reject twice');
}

async function crossProfile() {
  console.log('\n=== CROSS PROFILE: Local A courtesy vs operation against Local B ===\n');
  const { db, svc } = world();
  db.agreements.add('prof-a');
  db.agreements.add('prof-b');
  await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  const d = db.discounts[0]!;

  const a1 = await errorOf(() => svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-b', d.id));
  check(a1 instanceof NotFoundException, 'approve routed through Local B → 404');
  const a2 = await errorOf(() => svc.admin.reject(TENANT, 'admin', 'ADMIN', 'prof-b', d.id, 'x'));
  check(a2 instanceof NotFoundException, 'reject routed through Local B → 404');
  const a3 = await errorOf(() => svc.admin.redeliverCourtesy(TENANT, 'admin', 'ADMIN', 'prof-b', d.id));
  check(a3 instanceof NotFoundException, 'redeliver routed through Local B → 404');
  check(d.status === 'PENDING_REVIEW' && db.claims.every((c) => c.status === 'ACTIVE'), 'Local A courtesy untouched');
  check(svc.emailLog.length === 0, 'nothing delivered');

  const a4 = await errorOf(() => svc.admin.approve('other-tenant', 'admin', 'ADMIN', 'prof-a', d.id));
  check(a4 !== null && d.status === 'PENDING_REVIEW', 'other tenant cannot approve');

  const a5 = await errorOf(() => svc.courtesy.sendCourtesy(TENANT, 'owner-b', 'GASTRO_OWNER', sendBody({ gastroProfileId: 'prof-a' })));
  check(a5 !== null && db.discounts.length === 1, 'owner of B cannot request a courtesy for A');
}

async function legacyCompat() {
  console.log('\n=== LEGACY: pre-G8.3 ACTIVE courtesies stay valid ===\n');
  const { db, svc } = world();
  const legacy = db.addLegacyActiveCourtesy('prof-a', ['a@example.com']);
  const claim = legacy.claims[0]!;

  check(legacy.discount.status === 'ACTIVE', 'legacy courtesy is still ACTIVE (no retroactive pending)');
  const me = await svc.me.listForUser(TENANT, 'u-a');
  check(me.data.length === 1 && me.data[0]!.status === 'ACTIVE', 'legacy claim still visible in /me');
  const view = await svc.publicSvc.getClaimView(TENANT, claim.id, claim.accessToken);
  check(view.status === 'ACTIVE', 'legacy public claim view still works');
  const scan = await svc.scanner.validate(TENANT, 'admin', 'ADMIN', { qrPayload: db.qrFor(claim) } as never);
  check(scan.status === 'VALID', `legacy claim still redeems (got ${scan.status})`);
  check(db.validations.length === 1 && db.claims[0]!.status === 'USED', 'legacy redemption recorded');
  check(!db.agreements.has('prof-a'), '(no agreement exists for the legacy local, and it still works)');
}

async function main() {
  await ownerCreatesPending();
  await retainedClaimsUnusable();
  await agreementGate();
  await adminCreate();
  await rejectFlow();
  await crossProfile();
  await legacyCompat();

  if (state.failures > 0) {
    console.error(`\n${state.failures} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll G8.3 courtesy approval checks passed.\n');
}

main().catch((e) => {
  console.error('UNEXPECTED:', e);
  process.exit(1);
});

/**
 * G8.4 — Courtesy delivery post-approval (behavioural, in-memory fake Prisma).
 *
 * Covers: approval releases the EXISTING retained claims (no new claims, no recalculated
 * audience), delivery uses each claim's own QR (never the master token), idempotency,
 * email failure isolation + retry, /me hidden before / visible after approval, cancel after
 * approval (unused cancelled, used preserved), cross-profile / tenant isolation.
 *
 * Run: pnpm --filter api run test:gastro-courtesy-delivery
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { buildGastroDiscountQrPayload } from '@yo-te-invito/shared';
import {
  FakeCourtesyDb,
  TENANT,
  errorOf,
  makeChecker,
  sendBody,
} from './lib/courtesy-fake-db';

const { check, state } = makeChecker();

function world(opts: { failEmailFor?: string[]; emailConfigured?: boolean } = {}) {
  const db = new FakeCourtesyDb();
  db.addProfile('prof-a');
  db.addProfile('prof-b');
  db.addOwner('owner-a', 'prof-a');
  db.agreements.add('prof-a');
  db.agreements.add('prof-b');
  db.addUser('u-a', 'a@example.com');
  db.addUser('u-late', 'late@example.com');
  const svc = db.build(opts);
  return { db, svc };
}

async function approvalReleasesExistingClaims() {
  console.log('\n=== Approval releases the retained claims (no recreate, no recalculation) ===\n');
  const { db, svc } = world();
  // Followers exist at request time; a NEW follower appears before approval.
  db.addUser('u-f1', 'f1@example.com');
  db.follows.push({ tenantId: TENANT, gastroProfileId: 'prof-a', userId: 'u-f1' });
  await svc.courtesy.sendCourtesy(
    TENANT,
    'owner-a',
    'GASTRO_OWNER',
    sendBody({ manualEmails: ['a@example.com', 'b@example.com'], sendToFollowers: true }),
  );
  const d = db.discounts[0]!;
  check(db.claims.length === 3, 'audience frozen at request: 2 manual + 1 follower');
  const idsBefore = db.claims.map((c) => c.id).sort();
  const tokensBefore = db.claims.map((c) => `${c.qrToken}:${c.shortCode}`).sort();

  // Audience changes while waiting for review.
  db.addUser('u-f2', 'f2@example.com');
  db.follows.push({ tenantId: TENANT, gastroProfileId: 'prof-a', userId: 'u-f2' });
  db.follows = db.follows.filter((f) => f.userId !== 'u-f1');

  check(svc.emailLog.length === 0, 'nothing delivered while pending');

  const detail = (await svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', d.id)) as Record<string, any>;
  check(d.status === 'ACTIVE', 'approved → ACTIVE');
  check(JSON.stringify(db.claims.map((c) => c.id).sort()) === JSON.stringify(idsBefore), 'same claims (not recreated, no duplicates)');
  check(db.claims.length === 3, 'audience NOT recalculated: new follower not added, unfollowed not removed');
  check(!db.claims.some((c) => c.email === 'f2@example.com'), 'user who followed after the request gets nothing');
  check(JSON.stringify(db.claims.map((c) => `${c.qrToken}:${c.shortCode}`).sort()) === JSON.stringify(tokensBefore), 'claim QR/shortCode unchanged by approval');
  check(svc.emailLog.length === 3, 'delivery scheduled: one email per frozen recipient');
  check(db.claims.every((c) => c.emailSentAt != null && c.emailSendError == null), 'each claim marked delivered');
  check(detail.courtesyDelivery?.sent === 3 && detail.courtesyDelivery?.failed === 0, 'approve response reports delivery summary');
  check(
    db.audits.some((a) => a.action === 'GASTRO_DISCOUNT_COURTESY_SENT' && a.metadata?.trigger === 'APPROVAL' && a.metadata?.sentCount === 3),
    'delivery audited',
  );
}

async function emailContent() {
  console.log('\n=== Email: canonical template + individual claim QR (never master) ===\n');
  const { db, svc } = world();
  await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  const d = db.discounts[0]!;
  // Even if a (legacy/buggy) master token existed, it must never be mailed.
  d.qrToken = 'f'.repeat(48);
  await svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', d.id);

  check(svc.emailLog.every((m) => m.templateId === 'GASTRO_DISCOUNT_QR_COURTESY'), 'template GASTRO_DISCOUNT_QR_COURTESY');
  for (const claim of db.claims) {
    const mail = svc.emailLog.find((m) => m.to === claim.email)!;
    const qrUrl = decodeURIComponent(String(mail.variables.qrImageUrl));
    check(
      mail.variables.qrCode === claim.qrToken && qrUrl.includes(buildGastroDiscountQrPayload(d.id, claim.qrToken)),
      `${claim.email} receives ITS claim QR`,
    );
    check(!qrUrl.includes(d.qrToken) && mail.variables.qrCode !== d.qrToken, `${claim.email} email never carries discount.qrToken`);
    check(String(mail.variables.claimUrl).includes(claim.id) && String(mail.variables.claimUrl).includes(claim.accessToken), `${claim.email} gets its own claim link`);
    check(mail.variables.discountLabel === '20% en cena' && mail.variables.discountTitle === 'Cena de cortesía', 'campaign label/title used');
  }
}

async function idempotency() {
  console.log('\n=== Idempotency ===\n');
  const { db, svc } = world();
  await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  const d = db.discounts[0]!;
  await svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', d.id);
  check(svc.emailLog.length === 3, 'first approval: 3 emails');

  const again = await errorOf(() => svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', d.id));
  check(again instanceof BadRequestException, 'repeated approve refused');
  check(svc.emailLog.length === 3 && db.claims.length === 3, 'repeated approve: no duplicate email / claim');

  const redo = (await svc.admin.redeliverCourtesy(TENANT, 'admin', 'ADMIN', 'prof-a', d.id)) as Record<string, any>;
  check(redo.courtesyDelivery.attempted === 0 && redo.courtesyDelivery.skippedAlreadySent === 3, 'redeliver skips already-delivered claims');
  check(svc.emailLog.length === 3, 'redeliver does not re-send delivered claims');

  const direct = await svc.delivery.deliverCampaign(TENANT, d.id, { actorId: 'admin', actorRole: 'ADMIN', trigger: 'REDELIVER' });
  check(direct.attempted === 0 && svc.emailLog.length === 3, 'delivery service itself is idempotent');
}

async function emailFailure() {
  console.log('\n=== Email failure: no revert, no duplicates, retry only the failed ===\n');
  const { db, svc } = world({ failEmailFor: ['b@example.com'] });
  await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  const d = db.discounts[0]!;
  const detail = (await svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', d.id)) as Record<string, any>;
  check(d.status === 'ACTIVE', 'approval NOT reverted by an email failure');
  check(db.claims.length === 3, 'no new claims created');
  check(detail.courtesyDelivery.sent === 2 && detail.courtesyDelivery.failed === 1, 'summary: 2 sent, 1 failed');
  const b = db.claims.find((c) => c.email === 'b@example.com')!;
  check(b.emailSentAt == null && b.emailSendError === 'smtp down' && b.status === 'ACTIVE', 'failed claim keeps its error and stays usable/ACTIVE');
  check(detail.courtesy?.pendingDeliveryCount === 1 && detail.courtesy?.deliveredCount === 2, 'admin sees 1 pending delivery');

  // Retry once SMTP recovers: only the failed claim is mailed.
  const svc2 = db.build();
  const redo = (await svc2.admin.redeliverCourtesy(TENANT, 'admin', 'ADMIN', 'prof-a', d.id)) as Record<string, any>;
  check(redo.courtesyDelivery.attempted === 1 && redo.courtesyDelivery.sent === 1 && redo.courtesyDelivery.skippedAlreadySent === 2, 'retry targets only the failed claim');
  check(svc2.emailLog.length === 1 && svc2.emailLog[0]!.to === 'b@example.com', 'only b@example.com is re-mailed (no duplicates for the others)');
  check(b.emailSentAt != null && b.emailSendError == null && db.claims.length === 3, 'failed claim recovered; still 3 claims');

  // Not configured: nothing sent, error recorded, approval stays.
  const w2 = world({ emailConfigured: false });
  await w2.svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  const d2 = w2.db.discounts[0]!;
  const det2 = (await w2.svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', d2.id)) as Record<string, any>;
  check(d2.status === 'ACTIVE' && det2.courtesyDelivery.sent === 0 && det2.courtesyDelivery.emailConfigured === false, 'email not configured: approval stays, nothing sent');
  check(w2.db.claims.every((c) => c.emailSentAt == null && c.emailSendError), 'error recorded on each claim for retry');

  // sendClaimEmail throwing must not escape the batch.
  const w3 = world();
  await w3.svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  const d3 = w3.db.discounts[0]!;
  const original = w3.svc.delivery['claimEmail'].sendClaimEmail.bind(w3.svc.delivery['claimEmail']);
  let n = 0;
  w3.svc.delivery['claimEmail'].sendClaimEmail = async (input) => {
    n += 1;
    if (n === 1) throw new Error('boom');
    return original(input);
  };
  const det3 = (await w3.svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', d3.id)) as Record<string, any>;
  check(d3.status === 'ACTIVE' && det3.courtesyDelivery.failed === 1 && det3.courtesyDelivery.sent === 2, 'a thrown send error is contained; the rest are delivered');
}

async function meVisibility() {
  console.log('\n=== /me: hidden before approval, visible after ===\n');
  const { db, svc } = world();
  await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  const d = db.discounts[0]!;
  check((await svc.me.listForUser(TENANT, 'u-a')).data.length === 0, 'before approval: hidden');
  await svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', d.id);
  const after = await svc.me.listForUser(TENANT, 'u-a');
  check(after.data.length === 1 && after.data[0]!.type === 'COURTESY' && after.data[0]!.status === 'ACTIVE', 'after approval: visible as an ACTIVE courtesy');
  const mine = db.claims.find((c) => c.email === 'a@example.com')!;
  check(after.data[0]!.qrCode === mine.qrToken && after.data[0]!.shortCode === mine.shortCode, 'user sees its own QR + shortCode');
  check((await svc.me.listForUser(TENANT, 'u-late')).data.length === 0, 'a user outside the frozen audience sees nothing');
  const scan = await svc.scanner.validate(TENANT, 'admin', 'ADMIN', { qrPayload: db.qrFor(mine) } as never);
  check(scan.status === 'VALID', 'after approval the claim redeems via QR');
  const scan2 = await svc.scanner.validate(TENANT, 'admin', 'ADMIN', { qrPayload: db.claims.find((c) => c.email === 'b@example.com')!.shortCode } as never);
  check(scan2.status === 'VALID', 'after approval another claim redeems via shortCode');
  check(db.validations.length === 2 && db.validations.every((v) => v.claimId), 'each redemption tied to its own claim (never claimless/master)');
  const view = await svc.publicSvc.getClaimView(TENANT, mine.id, mine.accessToken);
  check(view.status === 'USED', 'public claim view reachable after approval');

  // Rejection/cancel of a different request.
  const w2 = world();
  await w2.svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  await w2.svc.admin.reject(TENANT, 'admin', 'ADMIN', 'prof-a', w2.db.discounts[0]!.id, 'no');
  check((await w2.svc.me.listForUser(TENANT, 'u-a')).data.length === 0, 'after rejection: still hidden');
}

async function cancelAfterApproval() {
  console.log('\n=== Cancel after approval (G8.2 behaviour preserved) ===\n');
  const { db, svc } = world();
  await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  const d = db.discounts[0]!;
  await svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', d.id);
  const a = db.claims.find((c) => c.email === 'a@example.com')!;
  const scan = await svc.scanner.validate(TENANT, 'admin', 'ADMIN', { qrPayload: db.qrFor(a) } as never);
  check(scan.status === 'VALID' && a.status === 'USED', 'claim A redeemed');

  await svc.admin.cancel(TENANT, 'admin', 'ADMIN', 'prof-a', d.id, 'cierre');
  const b = db.claims.find((c) => c.email === 'b@example.com')!;
  const c = db.claims.find((c) => c.email === 'c@example.com')!;
  check(d.status === 'CANCELLED', 'campaign cancelled');
  check(b.status === 'CANCELLED' && c.status === 'CANCELLED', 'unused claims → CANCELLED');
  check(a.status === 'USED' && a.usedAt != null && db.validations.length === 1, 'used claim preserved (history intact)');
  check(db.claims.length === 3, 'nothing deleted');
  const after = await svc.scanner.validate(TENANT, 'admin', 'ADMIN', { qrPayload: db.qrFor(b) } as never);
  check(after.status !== 'VALID', `cancelled claim no longer redeems (got ${after.status})`);
  const noDelivery = await svc.delivery.deliverCampaign(TENANT, d.id, { actorId: 'admin', actorRole: 'ADMIN', trigger: 'REDELIVER' });
  check(noDelivery.attempted === 0, 'a cancelled campaign never delivers');
  const redo = await errorOf(() => svc.admin.redeliverCourtesy(TENANT, 'admin', 'ADMIN', 'prof-a', d.id));
  check(redo instanceof BadRequestException, 'redeliver refused for a cancelled courtesy');
}

async function pendingNeverDelivers() {
  console.log('\n=== Delivery guards ===\n');
  const { db, svc } = world();
  await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  const d = db.discounts[0]!;
  const direct = await svc.delivery.deliverCampaign(TENANT, d.id, { actorId: 'admin', actorRole: 'ADMIN', trigger: 'REDELIVER' });
  check(direct.attempted === 0 && svc.emailLog.length === 0, 'delivery service refuses a PENDING courtesy');
  const redo = await errorOf(() => svc.admin.redeliverCourtesy(TENANT, 'admin', 'ADMIN', 'prof-a', d.id));
  check(redo instanceof BadRequestException && svc.emailLog.length === 0, 'redeliver refused while pending');
}

async function isolation() {
  console.log('\n=== Cross-profile / tenant isolation ===\n');
  const { db, svc } = world();
  await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  const d = db.discounts[0]!;
  await svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', d.id);
  // Local B has its own approved courtesy for overlapping emails.
  await svc.courtesy.sendCourtesy(TENANT, 'admin', 'ADMIN', sendBody({ gastroProfileId: 'prof-b' }));
  const dB = db.discounts.find((x) => x.gastroProfileId === 'prof-b')!;
  const claimsA = db.claims.filter((c) => c.discountId === d.id);
  const claimsB = db.claims.filter((c) => c.discountId === dB.id);
  check(claimsA.length === 3 && claimsB.length === 3, 'each local owns its own claims');
  check(claimsA.every((c) => !claimsB.some((x) => x.qrToken === c.qrToken || x.shortCode === c.shortCode)), 'claims never share QR / shortCode across locals');

  const wrong = await errorOf(() => svc.admin.redeliverCourtesy(TENANT, 'admin', 'ADMIN', 'prof-b', d.id));
  check(wrong instanceof NotFoundException, 'redeliver A via Local B → 404');
  const other = await svc.delivery.deliverCampaign('other-tenant', d.id, { actorId: 'admin', actorRole: 'ADMIN', trigger: 'REDELIVER' });
  check(other.attempted === 0, 'other tenant cannot trigger delivery');

  // Local A's cancel does not touch Local B's claims.
  await svc.admin.cancel(TENANT, 'admin', 'ADMIN', 'prof-a', d.id, 'x');
  check(claimsB.every((c) => c.status === 'ACTIVE') && claimsA.every((c) => c.status === 'CANCELLED'), 'cancelling A leaves B claims untouched');
}

async function main() {
  await approvalReleasesExistingClaims();
  await emailContent();
  await idempotency();
  await emailFailure();
  await meVisibility();
  await cancelAfterApproval();
  await pendingNeverDelivers();
  await isolation();

  if (state.failures > 0) {
    console.error(`\n${state.failures} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll G8.4 courtesy delivery checks passed.\n');
}

main().catch((e) => {
  console.error('UNEXPECTED:', e);
  process.exit(1);
});

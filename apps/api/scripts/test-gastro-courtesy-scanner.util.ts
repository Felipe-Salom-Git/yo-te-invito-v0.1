/**
 * G8.5 — Scanner courtesy hardening (behavioural, in-memory fake Prisma).
 *
 * The courtesy reuses the discount scanner (no second scanner). This suite closes it formally:
 * QR + manual shortCode, ACTIVE / pending / rejected / cancelled / used / legacy ACTIVE,
 * cross-profile (SCANNER bound to Local A vs courtesy of Local B), master QR on COURTESY_ONLY,
 * and the benefit label (never "0%").
 *
 * Run: pnpm --filter api run test:gastro-courtesy-scanner
 */
import { ForbiddenException } from '@nestjs/common';
import { buildGastroDiscountQrPayload } from '@yo-te-invito/shared';
import { FakeCourtesyDb, TENANT, errorOf, makeChecker, sendBody } from './lib/courtesy-fake-db';

const { check, state } = makeChecker();

function world() {
  const db = new FakeCourtesyDb();
  db.addProfile('prof-a');
  db.addProfile('prof-b');
  db.addOwner('owner-a', 'prof-a');
  db.agreements.add('prof-a');
  db.agreements.add('prof-b');
  const svc = db.build();
  return { db, svc, scannerA: db.scannerFor('prof-a'), scannerB: db.scannerFor('prof-b') };
}

const scan = (
  scanner: ReturnType<FakeCourtesyDb['scannerFor']>,
  payload: string,
  role: 'SCANNER' | 'ADMIN' = 'SCANNER',
) => scanner.validate(TENANT, 'scanner-user', role, { qrPayload: payload } as never);

async function activeCourtesy() {
  console.log('\n=== ACTIVE courtesy: QR + manual shortCode, same local ===\n');
  const { db, svc, scannerA } = world();
  await svc.courtesy.sendCourtesy(TENANT, 'admin', 'ADMIN', sendBody());
  const [a, b] = db.claims;
  check(db.discounts[0]!.status === 'ACTIVE', 'admin courtesy is ACTIVE');

  const viaQr = await scan(scannerA, db.qrFor(a!));
  check(viaQr.status === 'VALID', 'individual claim QR → VALID');
  check(a!.status === 'USED' && a!.usedAt != null, 'claim marked USED');
  check(db.validations.length === 1 && db.validations[0]!.claimId === a!.id, 'validation tied to the claim');
  check(viaQr.discount?.kind === 'COURTESY', 'result flagged as courtesy');
  check(viaQr.discount?.valueLabel === '20% en cena', 'benefit = campaign label');
  check(viaQr.discount?.valueLabel !== '0%', 'never "0%"');

  const manual = `${b!.shortCode.slice(0, 3)}-${b!.shortCode.slice(3)}`.toLowerCase();
  const viaCode = await scan(scannerA, manual);
  check(viaCode.status === 'VALID', 'manual shortCode ("abc-123", lowercase, hyphen) → VALID, same as QR');
  check(b!.status === 'USED' && db.validations.length === 2, 'shortCode redemption also tied to its claim');
  check(viaCode.discount?.valueLabel === '20% en cena', 'manual path returns the same benefit label');
  check(
    db.validations.every((v) => v.claimId != null && v.userId !== undefined),
    'no claimless (master) validation created',
  );

  const plain = await scan(scannerA, a!.shortCode);
  check(plain.status === 'ALREADY_USED', 'second use via shortCode → ALREADY_USED');
}

async function usedBlocksSecond() {
  console.log('\n=== USED: second validation blocked (QR and shortCode) ===\n');
  const { db, svc, scannerA } = world();
  await svc.courtesy.sendCourtesy(TENANT, 'admin', 'ADMIN', sendBody());
  const c = db.claims[0]!;
  check((await scan(scannerA, db.qrFor(c))).status === 'VALID', 'first QR scan VALID');
  check((await scan(scannerA, db.qrFor(c))).status === 'ALREADY_USED', 'second QR scan → ALREADY_USED');
  check((await scan(scannerA, c.shortCode)).status === 'ALREADY_USED', 'shortCode of a used claim → ALREADY_USED');
  check(db.validations.length === 1, 'only one validation ever recorded');
}

async function pendingRejectedCancelled() {
  console.log('\n=== Pending / rejected / cancelled ===\n');
  const { db, svc, scannerA } = world();
  await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  const d = db.discounts[0]!;
  const [a, b] = db.claims;
  check(d.status === 'PENDING_REVIEW' && a!.status === 'ACTIVE', 'retained claim: ACTIVE under PENDING_REVIEW');
  const qr = await scan(scannerA, db.qrFor(a!));
  const code = await scan(scannerA, b!.shortCode);
  check(qr.status === 'INACTIVE', `pending: QR rejected (got ${qr.status})`);
  check(code.status === 'INACTIVE', `pending: shortCode rejected (got ${code.status})`);
  check(db.validations.length === 0 && a!.status === 'ACTIVE', 'pending: nothing redeemed, claim untouched');

  // Rejected parent (claims cancelled by the reject flow).
  await svc.admin.reject(TENANT, 'admin', 'ADMIN', 'prof-a', d.id, 'no');
  check(d.status === 'REJECTED', 'parent REJECTED');
  const rq = await scan(scannerA, db.qrFor(a!));
  const rc = await scan(scannerA, b!.shortCode);
  check(rq.status !== 'VALID' && rc.status !== 'VALID', 'rejected: QR and shortCode never VALID');

  // Defence in depth: even an ACTIVE claim under a REJECTED parent is blocked by the parent.
  a!.status = 'ACTIVE';
  const forced = await scan(scannerA, db.qrFor(a!));
  check(forced.status === 'INACTIVE', `rejected parent blocks a still-ACTIVE claim (got ${forced.status})`);
  check(db.validations.length === 0, 'rejected: no validation recorded');

  // Cancelled claim.
  const w2 = world();
  await w2.svc.courtesy.sendCourtesy(TENANT, 'admin', 'ADMIN', sendBody());
  const claim = w2.db.claims[0]!;
  claim.status = 'CANCELLED';
  const cq = await scan(w2.scannerA, w2.db.qrFor(claim));
  const cc = await scan(w2.scannerA, claim.shortCode);
  check(cq.status === 'INACTIVE' && cc.status === 'INACTIVE', 'cancelled claim: QR + shortCode → INACTIVE');
  check(w2.db.validations.length === 0, 'cancelled: nothing recorded');

  // Cancelled campaign (parent + claims).
  const w3 = world();
  await w3.svc.courtesy.sendCourtesy(TENANT, 'admin', 'ADMIN', sendBody());
  await w3.svc.admin.cancel(TENANT, 'admin', 'ADMIN', 'prof-a', w3.db.discounts[0]!.id, 'cierre');
  const after = await scan(w3.scannerA, w3.db.qrFor(w3.db.claims[0]!));
  check(after.status !== 'VALID', `cancelled campaign: claim never VALID (got ${after.status})`);

  // Approval releases it.
  const w4 = world();
  await w4.svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  const claim4 = w4.db.claims[0]!;
  check((await scan(w4.scannerA, w4.db.qrFor(claim4))).status === 'INACTIVE', 'before approval: blocked');
  await w4.svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', w4.db.discounts[0]!.id);
  check((await scan(w4.scannerA, w4.db.qrFor(claim4))).status === 'VALID', 'after approval: VALID');
}

async function crossProfile() {
  console.log('\n=== Cross-profile: Scanner A vs courtesy of Local B ===\n');
  const { db, svc, scannerA, scannerB } = world();
  await svc.courtesy.sendCourtesy(TENANT, 'admin', 'ADMIN', sendBody({ gastroProfileId: 'prof-b' }));
  const claim = db.claims[0]!;
  check(db.discounts[0]!.gastroProfileId === 'prof-b', 'courtesy belongs to Local B');

  const viaQr = await errorOf(() => scan(scannerA, db.qrFor(claim)));
  check(viaQr instanceof ForbiddenException, 'Scanner A + QR of B → REJECT (forbidden)');
  const viaCode = await errorOf(() => scan(scannerA, claim.shortCode));
  check(viaCode instanceof ForbiddenException, 'Scanner A + shortCode of B → REJECT (forbidden)');
  check(
    claim.status === 'ACTIVE' && db.validations.length === 0,
    'cross-profile attempt consumed nothing',
  );

  const ok = await scan(scannerB, claim.shortCode);
  check(ok.status === 'VALID', 'Scanner B (own local) redeems the same shortCode');
}

async function tenantAndUnknown() {
  console.log('\n=== Unknown / other-tenant shortCode ===\n');
  const { db, svc, scannerA } = world();
  await svc.courtesy.sendCourtesy(TENANT, 'admin', 'ADMIN', sendBody());
  const claim = db.claims[0]!;
  const unknown = await scan(scannerA, 'ZZZZZZ');
  check(unknown.status === 'INVALID', 'unknown shortCode → INVALID');
  const other = await scannerA.validate('other-tenant', 'scanner-user', 'SCANNER', {
    qrPayload: claim.shortCode,
  } as never);
  check(other.status === 'INVALID', 'shortCode from another tenant → INVALID');
}

async function masterQr() {
  console.log('\n=== Master QR on COURTESY_ONLY ===\n');
  const { db, svc, scannerA } = world();
  await svc.courtesy.sendCourtesy(TENANT, 'admin', 'ADMIN', sendBody());
  const d = db.discounts[0]!;
  d.qrToken = 'a'.repeat(48); // legacy row carrying a discount-level token
  const master = await scan(scannerA, buildGastroDiscountQrPayload(d.id, d.qrToken));
  check(master.status === 'INVALID', 'legacy master token on COURTESY_ONLY → REJECT');
  check(db.validations.length === 0, 'no claimless validation created');
  const again = await scan(scannerA, buildGastroDiscountQrPayload(d.id, d.qrToken));
  check(again.status === 'INVALID' && db.validations.length === 0, 'repeatable master scan never redeems');

  // A public discount keeps the master path and its benefit label.
  d.visibility = 'PUBLIC';
  d.type = 'PERCENT';
  d.value = 10;
  d.displayTitle = 'Promo';
  const publicMaster = await scan(scannerA, buildGastroDiscountQrPayload(d.id, d.qrToken));
  check(publicMaster.status === 'VALID', 'PUBLIC discount master QR still works (non-courtesy untouched)');
  check(
    publicMaster.discount?.valueLabel === '10%' && publicMaster.discount?.kind === 'DISCOUNT',
    'public discount: formatted value, kind DISCOUNT',
  );
}

async function legacyActive() {
  console.log('\n=== Legacy ACTIVE courtesy (pre-G8.3) ===\n');
  const { db, scannerA } = world();
  const { claims } = db.addLegacyActiveCourtesy('prof-a', ['l1@example.com', 'l2@example.com']);
  const viaQr = await scan(scannerA, db.qrFor(claims[0]!));
  check(viaQr.status === 'VALID', 'legacy ACTIVE claim → VALID via QR');
  check(viaQr.discount?.valueLabel === '2x1', 'legacy courtesy shows its campaign label');
  const viaCode = await scan(scannerA, claims[1]!.shortCode);
  check(viaCode.status === 'VALID', 'legacy claim (non-charset shortCode) → VALID via manual entry');
}

async function main() {
  await activeCourtesy();
  await usedBlocksSecond();
  await pendingRejectedCancelled();
  await crossProfile();
  await tenantAndUnknown();
  await masterQr();
  await legacyActive();

  if (state.failures > 0) {
    console.error(`\n${state.failures} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll G8.5 courtesy scanner checks passed.\n');
}

main().catch((e) => {
  console.error('UNEXPECTED:', e);
  process.exit(1);
});

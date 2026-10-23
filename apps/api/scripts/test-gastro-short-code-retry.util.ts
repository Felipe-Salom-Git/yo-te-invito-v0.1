/**
 * G8.6 — Gastro claim short code: 6 chars, charset, P2002 retry (shortCode only), legacy untouched.
 *
 * Unit checks on the generator/retry helper + behavioural checks through the REAL services
 * (courtesy create, public claim) over the in-memory fake Prisma. No PostgreSQL needed.
 *
 * Run: pnpm --filter api run test:gastro-short-code-retry
 */
import { Prisma } from '@prisma/client';
import {
  GASTRO_CLAIM_SHORT_CODE_CHARSET,
  GASTRO_CLAIM_SHORT_CODE_LENGTH,
  GASTRO_CLAIM_SHORT_CODE_MAX_ATTEMPTS,
  GastroShortCodeCollisionError,
  allocateGastroClaimShortCode,
  formatGastroClaimShortCodeForDisplay,
  generateGastroClaimShortCode,
  isShortCodeUniqueViolation,
  retryOnShortCodeCollision,
} from '../src/common/gastro-claim-short-code.util';
import { FakeCourtesyDb, FUTURE_TO, TENANT, errorOf, makeChecker, sendBody } from './lib/courtesy-fake-db';

const { check, state } = makeChecker();

const p2002 = (target: string[] | string | undefined) =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: target === undefined ? undefined : { target },
  });

function generator() {
  console.log('\n=== Generator: 6 chars, allowed charset, same generator for everything ===\n');
  const codes = Array.from({ length: 2000 }, () => generateGastroClaimShortCode());
  check(GASTRO_CLAIM_SHORT_CODE_LENGTH === 6, 'length constant is 6 (not shortened)');
  check(GASTRO_CLAIM_SHORT_CODE_CHARSET.length === 32, 'alphabet of 32');
  check(codes.every((c) => c.length === 6), '2000 generated codes are 6 chars');
  const re = new RegExp(`^[${GASTRO_CLAIM_SHORT_CODE_CHARSET}]{6}$`);
  check(codes.every((c) => re.test(c)), 'all chars come from the allowed charset');
  check(!codes.some((c) => /[01OI]/.test(c)), 'no ambiguous characters (0/O/1/I)');
  check(new Set(codes).size > 1990, 'codes are effectively random (≥1990 distinct of 2000)');
  check(formatGastroClaimShortCodeForDisplay('K7M428') === 'K7M-428', 'display format XXX-XXX');
}

function legacyUntouched() {
  console.log('\n=== Legacy codes are never rewritten ===\n');
  check(formatGastroClaimShortCodeForDisplay('a1b2c3d4e5') === 'A1B2C3D4E5', 'legacy hex (>6) display = normalized, not split');
  check(formatGastroClaimShortCodeForDisplay('a1b2c3d4e5f60718') === 'A1B2C3D4E5F60718', 'long legacy hex untouched');
  check(generateGastroClaimShortCode().length === 6 && 'a1b2c3d4e5'.length > 6, 'generator affects only new claims');
}

function classification() {
  console.log('\n=== Which P2002 counts as a shortCode collision ===\n');
  check(isShortCodeUniqueViolation(p2002(['shortCode'])), 'target ["shortCode"] → collision');
  check(isShortCodeUniqueViolation(p2002('GastroDiscountClaim_shortCode_key')), 'constraint name *_shortCode_key → collision');
  check(!isShortCodeUniqueViolation(p2002(['qrToken'])), 'qrToken conflict → NOT a shortCode collision');
  check(!isShortCodeUniqueViolation(p2002(['accessToken'])), 'accessToken conflict → NOT');
  check(!isShortCodeUniqueViolation(p2002(['discountId', 'email'])), '(discountId,email) → NOT');
  check(!isShortCodeUniqueViolation(p2002(['courtesyCampaignId', 'email'])), '(courtesyCampaignId,email) → NOT');
  check(!isShortCodeUniqueViolation(p2002('GastroDiscountClaim_discountId_email_key')), 'composite constraint name → NOT');
  check(!isShortCodeUniqueViolation(p2002(['shortCode', 'email'])), 'composite including shortCode → NOT (not the plain shortCode constraint)');
  check(!isShortCodeUniqueViolation(p2002(undefined)), 'P2002 without meta.target → NOT (cannot prove it is shortCode)');
  check(
    !isShortCodeUniqueViolation(
      new Prisma.PrismaClientKnownRequestError('x', { code: 'P2025', clientVersion: 't', meta: { target: ['shortCode'] } }),
    ),
    'other Prisma code → NOT',
  );
  check(!isShortCodeUniqueViolation(new Error('shortCode')), 'plain Error → NOT');
  check(!isShortCodeUniqueViolation(null), 'null → NOT');
}

async function retryHelper() {
  console.log('\n=== retryOnShortCodeCollision ===\n');
  let calls = 0;
  const ok = await retryOnShortCodeCollision(async (attempt) => {
    calls += 1;
    if (attempt < 3) throw p2002(['shortCode']);
    return `done-${attempt}`;
  });
  check(ok === 'done-3' && calls === 3, 'collision twice → third attempt succeeds');

  calls = 0;
  const exhausted = await errorOf(() =>
    retryOnShortCodeCollision(async () => {
      calls += 1;
      throw p2002(['shortCode']);
    }),
  );
  check(exhausted instanceof GastroShortCodeCollisionError, 'persistent collision → GastroShortCodeCollisionError');
  check(calls === GASTRO_CLAIM_SHORT_CODE_MAX_ATTEMPTS && GASTRO_CLAIM_SHORT_CODE_MAX_ATTEMPTS === 5, 'bounded: exactly 5 attempts, never infinite');
  check((exhausted as GastroShortCodeCollisionError).attempts === 5, 'error reports the attempts');

  calls = 0;
  const custom = await errorOf(() =>
    retryOnShortCodeCollision(async () => {
      calls += 1;
      throw p2002(['shortCode']);
    }, 2),
  );
  check(custom instanceof GastroShortCodeCollisionError && calls === 2, 'maxAttempts is respected');

  calls = 0;
  const other = p2002(['qrToken']);
  const propagated = await errorOf(() =>
    retryOnShortCodeCollision(async () => {
      calls += 1;
      throw other;
    }),
  );
  check(propagated === other && calls === 1, 'non-shortCode P2002 propagates immediately (same error, no retry)');

  calls = 0;
  const boom = new Error('db down');
  const generic = await errorOf(() =>
    retryOnShortCodeCollision(async () => {
      calls += 1;
      throw boom;
    }),
  );
  check(generic === boom && calls === 1, 'generic errors propagate untouched');

  calls = 0;
  await retryOnShortCodeCollision(async () => {
    calls += 1;
    return 1;
  });
  check(calls === 1, 'success path runs once');
}

async function allocate() {
  console.log('\n=== allocate (pre-check) still skips existing codes ===\n');
  const taken = new Set<string>();
  const db = {
    gastroDiscountClaim: {
      findUnique: async ({ where }: { where: { shortCode: string } }) =>
        taken.has(where.shortCode) ? { id: 'x' } : null,
    },
  };
  const code = await allocateGastroClaimShortCode(db);
  check(code.length === 6, 'allocate returns a 6-char code');
  const always = { gastroDiscountClaim: { findUnique: async () => ({ id: 'x' }) } };
  check((await errorOf(() => allocateGastroClaimShortCode(always))) !== null, 'allocate gives up (bounded) when everything looks taken');
}

function world() {
  const db = new FakeCourtesyDb();
  db.addProfile('prof-a');
  db.addOwner('owner-a', 'prof-a');
  db.agreements.add('prof-a');
  return { db, svc: db.build() };
}

async function courtesyCreate() {
  console.log('\n=== Courtesy create through the real service ===\n');
  // One collision in the middle of the recipient loop → whole attempt rolled back and retried.
  const a = world();
  a.db.claimCreateFaults.push({ target: ['shortCode'] });
  await a.svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody());
  check(a.db.txCount === 2, 'collision → transaction retried once');
  check(a.db.discounts.length === 1 && a.db.campaigns.length === 1, 'retry left exactly one discount + one campaign');
  check(a.db.claims.length === 3, 'exactly one claim per recipient (no duplicates, no orphans)');
  check(new Set(a.db.claims.map((c) => c.shortCode)).size === 3, 'shortCodes unique');
  check(a.db.claims.every((c) => /^[2-9A-HJ-NP-Z]{6}$/.test(c.shortCode)), 'new codes are 6 chars from the charset');

  // Persistent collision → bounded, nothing persisted.
  const b = world();
  for (let i = 0; i < 10; i++) b.db.claimCreateFaults.push({ target: ['shortCode'] });
  const err = await errorOf(() => b.svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody()));
  check(err instanceof GastroShortCodeCollisionError, 'persistent collision → clear error');
  check(b.db.txCount === 5, 'courtesy create tried exactly 5 times');
  check(b.db.discounts.length === 0 && b.db.campaigns.length === 0 && b.db.claims.length === 0, 'nothing persisted after exhausting retries');

  // Other unique conflicts are not hidden.
  const c = world();
  c.db.claimCreateFaults.push({ target: ['courtesyCampaignId', 'email'] });
  const dup = await errorOf(() => c.svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody()));
  check(dup instanceof Prisma.PrismaClientKnownRequestError && dup.code === 'P2002', 'non-shortCode P2002 propagates from courtesy create');
  check(c.db.txCount === 1, 'and is NOT retried');
  check(c.db.claims.length === 0 && c.db.discounts.length === 0, 'rolled back');

  // Same generator serves ADMIN courtesies (delivered right away).
  const d = world();
  d.db.claimCreateFaults.push({ target: ['shortCode'] });
  await d.svc.courtesy.sendCourtesy(TENANT, 'admin', 'ADMIN', sendBody());
  check(d.db.claims.length === 3 && d.svc.emailLog.length === 3, 'admin courtesy also retries and then delivers once per claim');
}

async function publicClaim() {
  console.log('\n=== Public discount claim through the real service (same generator) ===\n');
  const mk = () => {
    const db = new FakeCourtesyDb();
    db.addProfile('prof-a');
    db.discounts.push({
      id: 'cmpubdisc0000000001',
      tenantId: TENANT,
      eventId: 'evt-prof-a',
      gastroProfileId: 'prof-a',
      code: 'PUB',
      type: 'PERCENT',
      value: 10,
      displayTitle: 'Promo',
      summary: 'Promo',
      detail: 'Promo',
      validityMode: 'DATE_RANGE',
      validWeekday: null,
      validFrom: new Date('2026-01-01T00:00:00.000Z'),
      validTo: new Date(FUTURE_TO),
      discountDate: new Date(FUTURE_TO),
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      qrToken: 'm'.repeat(48),
    });
    return { db, svc: db.build() };
  };

  const a = mk();
  a.db.claimCreateFaults.push({ target: ['shortCode'] }, { target: ['shortCode'] });
  const res = await a.svc.publicSvc.claim(TENANT, 'cmpubdisc0000000001', 'u@example.com');
  check(a.db.claims.length === 1 && res.claimId === a.db.claims[0]!.id, 'public claim created after 2 collisions');
  check(a.db.claims[0]!.type === 'PUBLIC_REQUEST' && a.db.claims[0]!.shortCode.length === 6, 'PUBLIC_REQUEST with a 6-char shortCode');

  const b = mk();
  b.db.claimCreateFaults.push({ target: ['qrToken'] });
  const err = await errorOf(() => b.svc.publicSvc.claim(TENANT, 'cmpubdisc0000000001', 'u@example.com'));
  check(err instanceof Prisma.PrismaClientKnownRequestError && b.db.claims.length === 0, 'public claim: non-shortCode P2002 propagates');

  const c = mk();
  for (let i = 0; i < 10; i++) c.db.claimCreateFaults.push({ target: ['shortCode'] });
  const exhausted = await errorOf(() => c.svc.publicSvc.claim(TENANT, 'cmpubdisc0000000001', 'u@example.com'));
  check(exhausted instanceof GastroShortCodeCollisionError && c.db.claims.length === 0, 'public claim: bounded retries then clear error');
}

async function exposure() {
  console.log('\n=== shortCode is available where it will be rendered (no foreign claims) ===\n');
  const { db, svc } = world();
  db.addUser('u-a', 'a@example.com');
  await svc.courtesy.sendCourtesy(TENANT, 'admin', 'ADMIN', sendBody());
  const mine = db.claims.find((c) => c.email === 'a@example.com')!;
  const me = await svc.me.listForUser(TENANT, 'u-a');
  check(me.data.length === 1 && me.data[0]!.shortCode === mine.shortCode, '/me exposes the user\'s own shortCode');
  check(me.data.every((i) => i.shortCode !== db.claims[1]!.shortCode), '/me never exposes another claim\'s shortCode');
  const view = await svc.publicSvc.getClaimView(TENANT, mine.id, mine.accessToken);
  check(view.shortCode === mine.shortCode, 'public claim view (coupon renderer) exposes its shortCode');
  const scanner = db.scannerFor('prof-a');
  const res = await scanner.validate(TENANT, 'scan', 'SCANNER', { qrPayload: db.qrFor(mine) } as never);
  check(
    res.discount?.shortCode === formatGastroClaimShortCodeForDisplay(mine.shortCode),
    'scanner result shows the scanned claim\'s own shortCode (display format)',
  );
  check(!JSON.stringify(res).includes(db.claims[1]!.shortCode), 'scanner result carries no other claim\'s shortCode');
}

async function main() {
  generator();
  legacyUntouched();
  classification();
  await retryHelper();
  await allocate();
  await courtesyCreate();
  await publicClaim();
  await exposure();

  if (state.failures > 0) {
    console.error(`\n${state.failures} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll G8.6 short code checks passed.\n');
}

main().catch((e) => {
  console.error('UNEXPECTED:', e);
  process.exit(1);
});

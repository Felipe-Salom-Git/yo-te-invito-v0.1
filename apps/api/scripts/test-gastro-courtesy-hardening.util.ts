/**
 * G8.1 — Courtesy hardening (behavioural, fake Prisma; no DB required).
 *
 * Covers: publicEventId guard (admin path), validFrom<=validTo, createdByOrigin/UserId,
 * tenant + gastroProfileId scoping, owner cannot fund (D2), cross-profile rejection.
 *
 * Run: pnpm --filter api run test:gastro-courtesy-hardening
 */

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { GastroCourtesyDiscountsService } from '../src/modules/gastro/gastro-courtesy-discounts.service';

let failures = 0;
function check(cond: boolean, msg: string) {
  if (!cond) {
    failures += 1;
    console.error('FAIL:', msg);
  } else {
    console.log('OK:', msg);
  }
}

async function rejects<T extends Error>(
  fn: () => Promise<unknown>,
  ctor: new (...a: never[]) => T,
  includes?: string,
): Promise<boolean> {
  try {
    await fn();
    return false;
  } catch (e) {
    if (!(e instanceof ctor)) return false;
    if (!includes) return true;
    return JSON.stringify((e as BadRequestException).getResponse()).includes(includes);
  }
}

type ProfileRow = { id: string; tenantId: string; displayName: string; status: string; publicEventId: string | null };

function build(opts: {
  profiles: ProfileRow[];
  memberships?: Array<{ userId: string; profileId: string }>;
}) {
  const created = {
    discounts: [] as Array<Record<string, unknown>>,
    campaigns: [] as Array<Record<string, unknown>>,
    claims: [] as Array<Record<string, unknown>>,
  };
  const lookups: Array<{ model: string; where: Record<string, unknown> }> = [];
  let sent = 0;

  const tx = {
    gastroDiscount: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        created.discounts.push(data);
        return { id: 'disc-1', ...data };
      },
    },
    gastroCourtesyCampaign: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        created.campaigns.push(data);
        return { id: 'camp-1', ...data };
      },
    },
    gastroDiscountClaim: {
      findUnique: async () => null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        created.claims.push(data);
        return { id: `claim-${created.claims.length}`, ...data };
      },
    },
  };

  const prisma = {
    gastroProfile: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        lookups.push({ model: 'gastroProfile', where });
        return (
          opts.profiles.find(
            (p) => p.id === where.id && p.tenantId === where.tenantId && p.status === where.status,
          ) ?? null
        );
      },
    },
    userGastroMembership: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        lookups.push({ model: 'userGastroMembership', where });
        const m = (opts.memberships ?? []).find(
          (x) => x.userId === where.userId && x.profileId === where.profileId,
        );
        if (!m) return null;
        const profile = opts.profiles.find((p) => p.id === m.profileId && p.status === 'ACTIVE');
        return profile ? { profile } : null;
      },
    },
    user: { findFirst: async () => null },
    userGastroFollow: { findMany: async () => [], count: async () => 0 },
    $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  };

  const svc = new GastroCourtesyDiscountsService(
    prisma as never,
    { hasGastroAccess: async () => true } as never,
    { logAction: async () => undefined } as never,
    { isConfigured: () => true } as never,
    { debitForGastroCourtesyCampaign: async () => ({ entry: { id: 'e', amountCents: 1n } }) } as never,
    // G8.3: CURRENT agreement is resolved for ADMIN-created courtesies.
    { resolveApplicable: async () => ({ agreement: { id: 'agr-1' } }) } as never,
    // G8.4: delivery is a separate step (only ADMIN-created courtesies deliver at creation).
    {
      deliverCampaign: async () => {
        sent += 1;
        return { attempted: 1, sent: 1, failed: 0, skippedAlreadySent: 0, emailConfigured: true, failures: [] };
      },
    } as never,
  );

  return { svc, created, lookups, sentCount: () => sent };
}

const TENANT = 't1';
const FUTURE_TO = '2027-06-30T23:59:59.000Z';
const body = (over: Record<string, unknown> = {}) =>
  ({
    gastroProfileId: 'prof-a',
    title: 'Cena de cortesía',
    discountLabel: '20% en cena',
    validTo: FUTURE_TO,
    manualEmails: ['guest@example.com'],
    sendToFollowers: false,
    ...over,
  }) as never;

const PROFILE_A: ProfileRow = { id: 'prof-a', tenantId: TENANT, displayName: 'Local A', status: 'ACTIVE', publicEventId: 'evt-a' };
const PROFILE_B: ProfileRow = { id: 'prof-b', tenantId: TENANT, displayName: 'Local B', status: 'ACTIVE', publicEventId: 'evt-b' };
const PROFILE_NO_EVENT: ProfileRow = { id: 'prof-x', tenantId: TENANT, displayName: 'Sin ficha', status: 'ACTIVE', publicEventId: null };
const PROFILE_OTHER_TENANT: ProfileRow = { id: 'prof-t2', tenantId: 't2', displayName: 'Otro tenant', status: 'ACTIVE', publicEventId: 'evt-t2' };

async function main() {
  console.log('\n=== B7: admin path requires publicEventId ===\n');
  {
    const { svc, created } = build({ profiles: [PROFILE_NO_EVENT] });
    const ok = await rejects(
      () => svc.sendCourtesy(TENANT, 'admin-1', 'ADMIN', body({ gastroProfileId: 'prof-x' })),
      BadRequestException,
      'ficha pública',
    );
    check(ok, 'ADMIN + local without publicEventId → 400 (not a Prisma 500)');
    check(created.discounts.length === 0, 'nothing created for local without publicEventId');
  }

  console.log('\n=== B6: validFrom <= validTo ===\n');
  {
    const { svc, created } = build({ profiles: [PROFILE_A] });
    const ok = await rejects(
      () =>
        svc.sendCourtesy(
          TENANT,
          'admin-1',
          'ADMIN',
          body({ validFrom: '2027-08-15T00:00:00.000Z', validTo: FUTURE_TO }),
        ),
      BadRequestException,
      'inicio',
    );
    check(ok, 'validFrom after validTo → 400');
    check(created.discounts.length === 0, 'nothing created with inverted window');
  }

  console.log('\n=== B8: createdByOrigin / createdByUserId ===\n');
  {
    const { svc, created } = build({
      profiles: [PROFILE_A],
      memberships: [{ userId: 'owner-1', profileId: 'prof-a' }],
    });
    const res = await svc.sendCourtesy(TENANT, 'owner-1', 'GASTRO_OWNER', body());
    const d = created.discounts[0]!;
    check(d.createdByOrigin === 'GASTRO' && d.createdByUserId === 'owner-1', 'owner courtesy → origin GASTRO + createdByUserId');
    check(d.visibility === 'COURTESY_ONLY', 'courtesy discount is COURTESY_ONLY');
    check(d.tenantId === TENANT && d.gastroProfileId === 'prof-a' && d.eventId === 'evt-a', 'scoped by tenantId + gastroProfileId + that local event');
    check(res.createdCount === 1 && created.claims.length === 1, 'one claim created');
    const c = created.claims[0]!;
    check(c.tenantId === TENANT && c.discountId === 'disc-1' && c.type === 'COURTESY', 'claim scoped to tenant + discount, type COURTESY');
  }
  {
    const { svc, created } = build({ profiles: [PROFILE_A] });
    await svc.sendCourtesy(TENANT, 'admin-1', 'ADMIN', body());
    const d = created.discounts[0]!;
    check(d.createdByOrigin === 'ADMIN' && d.createdByUserId === 'admin-1', 'admin courtesy → origin ADMIN + createdByUserId');
  }

  console.log('\n=== Scope: Local A vs Local B / tenant ===\n');
  {
    const { svc, created } = build({
      profiles: [PROFILE_A, PROFILE_B],
      memberships: [{ userId: 'owner-1', profileId: 'prof-a' }],
    });
    const ok = await rejects(
      () => svc.sendCourtesy(TENANT, 'owner-1', 'GASTRO_OWNER', body({ gastroProfileId: 'prof-b' })),
      ForbiddenException,
    );
    check(ok, 'owner of A cannot send courtesies for local B');
    check(created.discounts.length === 0, 'no courtesy created for foreign local');
  }
  {
    const { svc, created } = build({
      profiles: [PROFILE_A, PROFILE_B],
      memberships: [
        { userId: 'owner-1', profileId: 'prof-a' },
        { userId: 'owner-1', profileId: 'prof-b' },
      ],
    });
    await svc.sendCourtesy(TENANT, 'owner-1', 'GASTRO_OWNER', body({ gastroProfileId: 'prof-b' }));
    const d = created.discounts[0]!;
    check(d.gastroProfileId === 'prof-b' && d.eventId === 'evt-b', 'owner of A+B sending for B creates it under B (not default A)');
  }
  {
    const { svc, created } = build({ profiles: [PROFILE_OTHER_TENANT] });
    const rejected = await rejects(
      () => svc.sendCourtesy(TENANT, 'admin-1', 'ADMIN', body({ gastroProfileId: 'prof-t2' })),
      Error,
    );
    check(rejected, 'ADMIN of tenant t1 cannot send for a local of tenant t2');
    check(created.discounts.length === 0, 'no courtesy created across tenants');
  }

  console.log('\n=== D2: owner cannot spend Courtesy Credit ===\n');
  {
    const { svc, created } = build({
      profiles: [PROFILE_A],
      memberships: [{ userId: 'owner-1', profileId: 'prof-a' }],
    });
    const ok = await rejects(
      () =>
        svc.sendCourtesy(
          TENANT,
          'owner-1',
          'GASTRO_OWNER',
          body({ funding: { source: 'COURTESY_CREDIT', imputedValueCents: '100000' } }),
        ),
      ForbiddenException,
      'BENEFIT_CREDIT_FUNDING_ADMIN_ONLY',
    );
    check(ok, 'GASTRO_OWNER funding with Courtesy Credit → 403 admin-only');
    check(created.discounts.length === 0, 'nothing created when owner attempts funding');
  }
  {
    const { svc } = build({ profiles: [PROFILE_A] });
    const res = await svc.sendCourtesy(
      TENANT,
      'admin-1',
      'ADMIN',
      body({ funding: { source: 'COURTESY_CREDIT', imputedValueCents: '100000' } }),
    );
    check(res.fundedFromCourtesyCredit === true, 'ADMIN can fund a campaign with Courtesy Credit');
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll G8.1 courtesy hardening checks passed.\n');
}

main().catch((e) => {
  console.error('UNEXPECTED:', e);
  process.exit(1);
});

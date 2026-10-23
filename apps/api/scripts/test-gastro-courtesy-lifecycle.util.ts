/**
 * G8.2 — Courtesy lifecycle isolation (behavioural, fake Prisma; no DB required).
 *
 * Covers:
 *  - cancelled/reactivated courtesy NEVER obtains a qrToken (master QR)
 *  - cancelled courtesy is terminal; cancelling cancels ACTIVE claims (owner + admin paths)
 *  - courtesies are immutable via generic edit (type/value/visibility cannot drift)
 *  - scanner master-QR path is closed for COURTESY_ONLY, still open for PUBLIC
 *  - legacy pending edits cannot change a courtesy's nature
 *  - tenant + gastroProfileId scoping on status changes
 *
 * Run: pnpm --filter api run test:gastro-courtesy-lifecycle
 */

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  buildGastroDiscountQrPayload,
  buildPendingUpdatePayload,
  ErrorCode,
} from '@yo-te-invito/shared';
import { GastroDiscountMetricsService } from '../src/modules/gastro/gastro-discount-metrics.service';
import { GastroPortalDiscountsService } from '../src/modules/gastro/gastro-portal-discounts.service';
import { AdminGastroService } from '../src/modules/admin/admin-gastro.service';
import { ScannerGastroDiscountService } from '../src/scanner/scanner-gastro-discount.service';

let failures = 0;
function check(cond: boolean, msg: string) {
  if (!cond) {
    failures += 1;
    console.error('FAIL:', msg);
  } else {
    console.log('OK:', msg);
  }
}

async function errorOf(fn: () => Promise<unknown>): Promise<Error | null> {
  try {
    await fn();
    return null;
  } catch (e) {
    return e as Error;
  }
}
const codeOf = (e: Error | null): string | undefined =>
  e && 'getResponse' in e
    ? ((e as BadRequestException).getResponse() as { code?: string }).code
    : undefined;

const TENANT = 't1';
const FUTURE = new Date('2027-06-30T23:59:59.000Z');

function discountRow(over: Record<string, unknown> = {}) {
  return {
    id: 'cmdisc0000000001',
    tenantId: TENANT,
    eventId: 'evt-a',
    gastroProfileId: 'prof-a',
    code: 'CRS-AAAA',
    type: 'PERCENT',
    value: 0,
    displayTitle: 'Cena de cortesía',
    summary: '20% en cena',
    detail: '20% en cena',
    displayDescription: '20% en cena',
    validityMode: 'DATE_RANGE',
    validWeekday: null,
    validFrom: new Date('2026-10-01T00:00:00.000Z'),
    validTo: FUTURE,
    discountDate: FUTURE,
    status: 'ACTIVE',
    visibility: 'COURTESY_ONLY',
    qrToken: null,
    qrGeneratedAt: null,
    adminNotes: null,
    rejectionReason: null,
    emailSentAt: null,
    emailSendError: null,
    lastEmailAttemptAt: null,
    submittedImageUrls: [],
    displayImageUrls: [],
    createdByOrigin: 'GASTRO',
    archivedAt: null,
    pendingUpdate: null,
    pendingUpdateSubmittedAt: null,
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    ...over,
  };
}

// ---------------------------------------------------------------------------
// GastroDiscountMetricsService.updateDiscountStatus (owner + admin status route)
// ---------------------------------------------------------------------------
function buildMetrics(row: ReturnType<typeof discountRow>) {
  const calls = {
    discountUpdates: [] as Array<{ where: unknown; data: Record<string, unknown> }>,
    claimUpdateMany: [] as Array<{ where: Record<string, unknown>; data: Record<string, unknown> }>,
    audits: [] as Array<Record<string, unknown>>,
  };
  const tx = {
    gastroDiscount: {
      update: async ({ where, data }: { where: unknown; data: Record<string, unknown> }) => {
        calls.discountUpdates.push({ where, data });
        return { ...row, ...data };
      },
    },
    gastroDiscountClaim: {
      updateMany: async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        calls.claimUpdateMany.push(args);
        return { count: 3 };
      },
    },
  };
  const prisma = {
    gastroDiscount: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        if (where.id !== row.id || where.tenantId !== row.tenantId) return null;
        if (where.gastroProfileId && where.gastroProfileId !== row.gastroProfileId) return null;
        return { ...row, gastroProfile: { id: row.gastroProfileId, displayName: 'Local' } };
      },
      update: tx.gastroDiscount.update,
    },
    gastroDiscountClaim: tx.gastroDiscountClaim,
    $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  };
  const audit = {
    logAction: async (a: Record<string, unknown>) => {
      calls.audits.push(a);
    },
  };
  const svc = new GastroDiscountMetricsService(prisma as never, audit as never);
  (svc as unknown as { buildSummaryForDiscount: () => Promise<unknown> }).buildSummaryForDiscount =
    async () => ({ ok: true });
  return { svc, calls };
}

async function metricsTests() {
  console.log('\n=== Status: reactivation never mints a master QR (CRITICAL) ===\n');

  // Cancelled courtesy → ACTIVE must be rejected (terminal) and never mint a qrToken.
  {
    const { svc, calls } = buildMetrics(discountRow({ status: 'CANCELLED' }));
    const err = await errorOf(() =>
      svc.updateDiscountStatus(TENANT, 'cmdisc0000000001', { status: 'ACTIVE' }, { id: 'u1', role: 'GASTRO_OWNER' }, { profileId: 'prof-a' }),
    );
    check(err instanceof BadRequestException, 'cancelled courtesy → reactivate rejected (400)');
    check(codeOf(err) === ErrorCode.GASTRO_COURTESY_CANCELLED_TERMINAL, 'error code GASTRO_COURTESY_CANCELLED_TERMINAL');
    check(calls.discountUpdates.length === 0, 'no discount update on terminal reactivation');
    check(!calls.discountUpdates.some((u) => 'qrToken' in u.data), 'no qrToken written');
  }
  // Admin route (same service) is also blocked.
  {
    const { svc, calls } = buildMetrics(discountRow({ status: 'CANCELLED' }));
    const err = await errorOf(() =>
      svc.updateDiscountStatus(TENANT, 'cmdisc0000000001', { status: 'ACTIVE' }, { id: 'admin', role: 'ADMIN' }, { profileId: 'prof-a' }),
    );
    check(codeOf(err) === ErrorCode.GASTRO_COURTESY_CANCELLED_TERMINAL, 'ADMIN cannot reactivate a cancelled courtesy either');
    check(calls.discountUpdates.length === 0, 'no update on admin terminal reactivation');
  }
  // Defense in depth: even an ACTIVE→ACTIVE call on a courtesy w/o token must not mint one.
  {
    const { svc, calls } = buildMetrics(discountRow({ status: 'ACTIVE', qrToken: null }));
    await svc.updateDiscountStatus(TENANT, 'cmdisc0000000001', { status: 'ACTIVE' }, { id: 'u1', role: 'GASTRO_OWNER' }, { profileId: 'prof-a' });
    const written = calls.discountUpdates[0]!.data;
    check(written.status === 'ACTIVE' && !('qrToken' in written) && !('qrGeneratedAt' in written), 'courtesy activation writes no qrToken/qrGeneratedAt');
  }
  // Defense in depth: APPROVED courtesy → ACTIVE does not mint a master QR either.
  {
    const { svc, calls } = buildMetrics(discountRow({ status: 'APPROVED', qrToken: null }));
    await svc.updateDiscountStatus(TENANT, 'cmdisc0000000001', { status: 'ACTIVE' }, { id: 'admin', role: 'ADMIN' }, { profileId: 'prof-a' });
    check(!('qrToken' in calls.discountUpdates[0]!.data), 'APPROVED courtesy → ACTIVE does not mint a master QR');
  }
  // Regression: PUBLIC discount still gets its master QR on (re)activation.
  {
    const { svc, calls } = buildMetrics(discountRow({ visibility: 'PUBLIC', status: 'CANCELLED', qrToken: null, code: 'PND-1' }));
    await svc.updateDiscountStatus(TENANT, 'cmdisc0000000001', { status: 'ACTIVE' }, { id: 'u1', role: 'GASTRO_OWNER' }, { profileId: 'prof-a' });
    const written = calls.discountUpdates[0]!.data;
    check(typeof written.qrToken === 'string' && (written.qrToken as string).length === 48, 'PUBLIC reactivation still generates the master QR (unchanged)');
  }
  // Regression: PUBLIC discount with existing token keeps it (no overwrite).
  {
    const { svc, calls } = buildMetrics(discountRow({ visibility: 'PUBLIC', status: 'CANCELLED', qrToken: 'cccccccccccccccccccccccccccccccc' }));
    await svc.updateDiscountStatus(TENANT, 'cmdisc0000000001', { status: 'ACTIVE' }, { id: 'u1', role: 'GASTRO_OWNER' }, { profileId: 'prof-a' });
    check(!('qrToken' in calls.discountUpdates[0]!.data), 'PUBLIC reactivation keeps the existing token (not rewritten)');
  }

  console.log('\n=== Status: cancelling a courtesy cancels its claims ===\n');
  {
    const { svc, calls } = buildMetrics(discountRow({ status: 'ACTIVE' }));
    await svc.updateDiscountStatus(TENANT, 'cmdisc0000000001', { status: 'CANCELLED' }, { id: 'u1', role: 'GASTRO_OWNER' }, { profileId: 'prof-a' });
    check(calls.discountUpdates[0]?.data.status === 'CANCELLED', 'courtesy discount → CANCELLED');
    const c = calls.claimUpdateMany[0];
    check(!!c, 'claims updated in the cancel transaction');
    check(
      c?.where.tenantId === TENANT && c?.where.discountId === 'cmdisc0000000001' && c?.where.type === 'COURTESY',
      'claim update scoped by tenantId + discountId + type COURTESY',
    );
    check(JSON.stringify(c?.where.status) === JSON.stringify({ in: ['ACTIVE'] }), 'only ACTIVE claims are cancelled (USED stays USED)');
    check(c?.data.status === 'CANCELLED', 'claims → CANCELLED');
    const audit = calls.audits[0]!;
    check(
      (audit.metadata as { cancelledClaims?: number } | undefined)?.cancelledClaims === 3,
      'audit records how many claims were cancelled',
    );
  }
  {
    const { svc, calls } = buildMetrics(discountRow({ visibility: 'PUBLIC', status: 'ACTIVE', qrToken: 'dddddddddddddddddddddddddddddddd' }));
    await svc.updateDiscountStatus(TENANT, 'cmdisc0000000001', { status: 'CANCELLED' }, { id: 'u1', role: 'GASTRO_OWNER' }, { profileId: 'prof-a' });
    check(calls.discountUpdates[0]?.data.status === 'CANCELLED', 'PUBLIC discount → CANCELLED (unchanged)');
    check(calls.claimUpdateMany.length === 0, 'PUBLIC cancel does NOT touch claims (unchanged semantics)');
  }

  console.log('\n=== Scope: tenant + gastroProfileId ===\n');
  {
    const { svc, calls } = buildMetrics(discountRow({ status: 'ACTIVE' }));
    const err = await errorOf(() =>
      svc.updateDiscountStatus(TENANT, 'cmdisc0000000001', { status: 'CANCELLED' }, { id: 'u1', role: 'GASTRO_OWNER' }, { profileId: 'prof-b' }),
    );
    check(err instanceof ForbiddenException, 'local B cannot cancel a courtesy of local A');
    check(calls.claimUpdateMany.length === 0 && calls.discountUpdates.length === 0, 'nothing mutated across locals');
  }
  {
    const { svc, calls } = buildMetrics(discountRow({ status: 'ACTIVE' }));
    const err = await errorOf(() =>
      svc.updateDiscountStatus('other-tenant', 'cmdisc0000000001', { status: 'CANCELLED' }, { id: 'u1', role: 'ADMIN' }, { profileId: 'prof-a' }),
    );
    check(err !== null, 'other tenant cannot cancel the courtesy');
    check(calls.claimUpdateMany.length === 0, 'claims untouched across tenants');
  }
}

// ---------------------------------------------------------------------------
// GastroPortalDiscountsService (generic edit + response mapping)
// ---------------------------------------------------------------------------
async function portalTests() {
  console.log('\n=== Generic edit: courtesies are immutable ===\n');
  const updates: Array<Record<string, unknown>> = [];
  const make = (row: ReturnType<typeof discountRow>) => {
    const prisma = {
      gastroDiscount: {
        findFirst: async () => ({ ...row, courtesyCampaign: null }),
        update: async ({ data }: { data: Record<string, unknown> }) => {
          updates.push(data);
          return { ...row, ...data };
        },
      },
    };
    return new GastroPortalDiscountsService(
      prisma as never,
      { hasGastroAccess: async () => true } as never,
      { assertCanOperateProfile: async () => ({ id: 'prof-a' }) } as never,
      {} as never,
      { logAction: async () => undefined } as never,
      { notifyDiscountPending: () => undefined } as never,
    );
  };

  for (const [label, body] of [
    ['type', { type: 'FIXED' }],
    ['value', { value: 50 }],
    ['title only', { title: 'Nuevo título' }],
    ['validityMode', { validityMode: 'WEEKLY_RECURRING', validWeekday: 'MONDAY' }],
  ] as const) {
    updates.length = 0;
    const err = await errorOf(() =>
      make(discountRow({ status: 'ACTIVE' })).updateMyDiscount(TENANT, 'u1', 'GASTRO_OWNER', 'cmdisc0000000001', body as never),
    );
    check(
      err instanceof BadRequestException && codeOf(err) === ErrorCode.GASTRO_COURTESY_IMMUTABLE,
      `courtesy edit (${label}) → GASTRO_COURTESY_IMMUTABLE`,
    );
    check(updates.length === 0, `courtesy edit (${label}) writes nothing`);
  }
  {
    updates.length = 0;
    const err = await errorOf(() =>
      make(discountRow({ status: 'CANCELLED' })).updateMyDiscount(TENANT, 'u1', 'GASTRO_OWNER', 'cmdisc0000000001', { value: 50 } as never),
    );
    check(codeOf(err) === ErrorCode.GASTRO_COURTESY_IMMUTABLE && updates.length === 0, 'cancelled courtesy cannot be edited back into a discount');
  }
  // Regression: a PUBLIC pending discount is still editable.
  {
    updates.length = 0;
    await make(discountRow({ visibility: 'PUBLIC', status: 'PENDING_REVIEW', code: 'PND-1' })).updateMyDiscount(
      TENANT,
      'u1',
      'GASTRO_OWNER',
      'cmdisc0000000001',
      { title: 'Editado' } as never,
    );
    check(updates.length === 1 && updates[0]!.displayTitle === 'Editado', 'PUBLIC discount edit still works (unchanged)');
  }

  console.log('\n=== Response: no master QR exposed for courtesies ===\n');
  {
    const svc = make(discountRow());
    const courtesy = svc.mapDiscount({
      ...discountRow({ qrToken: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', status: 'ACTIVE' }),
      courtesyCampaign: { id: 'c1', title: 'Cena', discountLabel: '20% en cena' },
    } as never);
    check(courtesy.qrToken === null && courtesy.qrPayload === null, 'courtesy response never exposes qrToken/qrPayload (even legacy)');
    check(courtesy.visibility === 'COURTESY_ONLY' && courtesy.courtesyCampaign?.discountLabel === '20% en cena', 'courtesy response exposes visibility + campaign label');
    const pub = svc.mapDiscount(discountRow({ visibility: 'PUBLIC', qrToken: 'dddddddddddddddddddddddddddddddd', status: 'ACTIVE' }) as never);
    check(pub.qrToken === 'dddddddddddddddddddddddddddddddd' && pub.qrPayload !== null, 'PUBLIC response still exposes its QR (unchanged)');
    check(pub.visibility === 'PUBLIC' && pub.courtesyCampaign === null, 'PUBLIC response visibility = PUBLIC');
  }
}

// ---------------------------------------------------------------------------
// Scanner: master QR path
// ---------------------------------------------------------------------------
async function scannerTests() {
  console.log('\n=== Scanner: master QR closed for courtesies ===\n');
  const build = (row: ReturnType<typeof discountRow>) => {
    const validations: Array<Record<string, unknown>> = [];
    const prisma = {
      gastroDiscount: {
        findFirst: async () => ({
          ...row,
          gastroProfile: { displayName: 'Local A' },
          event: { category: 'gastro', deletedAt: null },
        }),
      },
      gastroDiscountClaim: { findFirst: async () => null, findUnique: async () => null },
      gastroDiscountValidation: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          validations.push(data);
          return data;
        },
      },
    };
    const svc = new ScannerGastroDiscountService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      { logAction: async () => undefined } as never,
    );
    return { svc, validations };
  };
  const qr = buildGastroDiscountQrPayload('cmdisc0000000001', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');

  {
    const { svc, validations } = build(discountRow({ qrToken: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', status: 'ACTIVE' }));
    const res = await svc.validate(TENANT, 'admin', 'ADMIN', { qrPayload: qr } as never);
    check(res.status === 'INVALID', 'courtesy discount-level QR → INVALID (even with a legacy qrToken)');
    check(validations.length === 0, 'no claimless validation created for a courtesy');
  }
  {
    const { svc, validations } = build(discountRow({ visibility: 'PUBLIC', code: 'PND-1', qrToken: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', status: 'ACTIVE' }));
    const res = await svc.validate(TENANT, 'admin', 'ADMIN', { qrPayload: qr } as never);
    check(res.status === 'VALID' && validations.length === 1, 'PUBLIC master QR still validates (unchanged)');
  }
}

// ---------------------------------------------------------------------------
// AdminGastroService (cancel, sendQr, legacy pending edit)
// ---------------------------------------------------------------------------
async function adminTests() {
  console.log('\n=== Admin: cancel / sendQr / legacy pending edit ===\n');
  const build = (row: ReturnType<typeof discountRow>) => {
    const calls = {
      discountUpdates: [] as Array<Record<string, unknown>>,
      claimUpdateMany: [] as Array<Record<string, unknown>>,
      campaignUpdateMany: [] as Array<Record<string, unknown>>,
      audits: [] as Array<Record<string, unknown>>,
      emails: 0,
    };
    const tx = {
      gastroDiscount: {
        update: async ({ data }: { data: Record<string, unknown> }) => {
          calls.discountUpdates.push(data);
          return { ...row, ...data };
        },
      },
      gastroDiscountClaim: {
        updateMany: async (args: Record<string, unknown>) => {
          calls.claimUpdateMany.push(args);
          return { count: 2 };
        },
      },
      gastroCourtesyCampaign: {
        updateMany: async (args: Record<string, unknown>) => {
          calls.campaignUpdateMany.push(args);
          return { count: 1 };
        },
      },
    };
    const prisma = {
      gastroProfile: { findFirst: async () => ({ id: row.gastroProfileId }) },
      gastroDiscount: {
        findFirst: async () => ({ ...row, gastroProfile: { id: row.gastroProfileId, contactEmail: 'owner@example.com' } }),
        update: tx.gastroDiscount.update,
      },
      auditLog: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          calls.audits.push(data);
        },
      },
      $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
    };
    const svc = new AdminGastroService(
      prisma as never,
      { isConfigured: () => true, send: async () => { calls.emails += 1; return true; } } as never,
      { notifyFollowersOfNewActiveDiscount: async () => undefined } as never,
      { notifyDiscountApproved: () => undefined, notifyDiscountRejected: () => undefined } as never,
      {} as never,
    );
    const hack = svc as unknown as Record<string, unknown>;
    hack.resolveDiscountProfileId = async (_t: string, r: { gastroProfileId: string }) => r.gastroProfileId;
    hack.getDiscountDetail = async () => ({ ok: true });
    return { svc, calls };
  };

  // cancel courtesy → claims cancelled
  {
    const { svc, calls } = build(discountRow({ status: 'ACTIVE' }));
    await svc.cancel(TENANT, 'admin', 'ADMIN', 'prof-a', 'cmdisc0000000001', 'motivo');
    const c = calls.claimUpdateMany[0] as { where: Record<string, unknown>; data: Record<string, unknown> } | undefined;
    check(
      !!c && c.where.tenantId === TENANT && c.where.discountId === 'cmdisc0000000001' && c.where.type === 'COURTESY' && c.data.status === 'CANCELLED',
      'admin cancel of a courtesy cancels its claims (tenant + discount + COURTESY scoped)',
    );
  }
  // cancel public → claims untouched
  {
    const { svc, calls } = build(discountRow({ visibility: 'PUBLIC', code: 'PND-1', status: 'ACTIVE' }));
    await svc.cancel(TENANT, 'admin', 'ADMIN', 'prof-a', 'cmdisc0000000001', 'motivo');
    check(calls.claimUpdateMany.length === 0 && calls.discountUpdates[0]?.status === 'CANCELLED', 'admin cancel of a PUBLIC discount leaves claims alone (unchanged)');
  }
  // sendQrEmail refuses courtesies, even with a legacy token
  {
    const { svc, calls } = build(discountRow({ status: 'ACTIVE', qrToken: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }));
    const err = await errorOf(() => svc.sendQrEmail(TENANT, 'admin', 'ADMIN', 'prof-a', 'cmdisc0000000001'));
    check(err instanceof BadRequestException, 'admin sendQrEmail refuses a courtesy (400)');
    check(calls.emails === 0, 'no master QR emailed for a courtesy');
  }
  // legacy pending edit cannot change a courtesy's nature
  {
    const pending = buildPendingUpdatePayload({
      title: 'Título editado',
      summary: 's',
      detail: 'd',
      imageUrls: [],
      type: 'FIXED',
      value: 99,
      validityMode: 'WEEKLY_RECURRING',
      validWeekday: 'MONDAY',
      validFrom: null,
      validTo: null,
      discountDate: null,
    });
    const { svc, calls } = build(discountRow({ status: 'ACTIVE', pendingUpdate: pending }));
    await svc.approvePendingEdit(TENANT, 'admin', 'ADMIN', 'prof-a', 'cmdisc0000000001');
    const data = calls.discountUpdates[0]!;
    check(data.displayTitle === 'Título editado', 'legacy pending edit still updates the text');
    check(
      !('type' in data) && !('value' in data) && !('validityMode' in data) && !('validFrom' in data) && !('validTo' in data),
      'legacy pending edit cannot change type/value/validity of a courtesy',
    );
    const camp = calls.campaignUpdateMany[0] as { where: Record<string, unknown>; data: Record<string, unknown> } | undefined;
    check(camp?.data.title === 'Título editado' && camp?.where.tenantId === TENANT, 'campaign title mirrors the approved edit (tenant scoped)');
  }
  // Regression: pending edit on PUBLIC discount still applies everything.
  {
    const pending = buildPendingUpdatePayload({
      title: 'Público editado',
      summary: 's',
      detail: 'd',
      imageUrls: [],
      type: 'PERCENT',
      value: 15,
      validityMode: 'DATE_RANGE',
      validWeekday: null,
      validFrom: '2026-11-01T00:00:00.000Z',
      validTo: '2026-12-01T00:00:00.000Z',
      discountDate: '2026-12-01T00:00:00.000Z',
    });
    const { svc, calls } = build(discountRow({ visibility: 'PUBLIC', code: 'PND-1', status: 'ACTIVE', qrToken: 'dddddddddddddddddddddddddddddddd', pendingUpdate: pending }));
    await svc.approvePendingEdit(TENANT, 'admin', 'ADMIN', 'prof-a', 'cmdisc0000000001');
    const data = calls.discountUpdates[0]!;
    check(data.value === 15 && data.type === 'PERCENT' && 'validTo' in data, 'PUBLIC pending edit still applies type/value/validity (unchanged)');
    check(calls.campaignUpdateMany.length === 0, 'PUBLIC pending edit does not touch campaigns');
  }
}

async function main() {
  await metricsTests();
  await portalTests();
  await scannerTests();
  await adminTests();

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll G8.2 courtesy lifecycle checks passed.\n');
}

main().catch((e) => {
  console.error('UNEXPECTED:', e);
  process.exit(1);
});

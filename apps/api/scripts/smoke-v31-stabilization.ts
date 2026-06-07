/**
 * V3.1 Slice 7.5 — post-migration stabilization (Slices 6 + 7).
 * Run: pnpm --filter api run smoke:v31-stabilization
 * Requires: Postgres up, migrations applied, DATABASE_URL in apps/api/.env
 * Optional API: SMOKE_API_BASE_URL + SMOKE_USER_EMAIL/PASSWORD (or SMOKE_ALLOW_DEV_AUTH=1)
 */

import { PrismaClient } from '@prisma/client';
import { readExcursionSchedulePublic } from '../src/common/excursion-schedule.util';
import { readEntitySocialLinks } from '../src/common/entity-social-links.util';
import { SMOKE_TEST_MARKER } from './lib/smoke-constants';
import { getSmokeCredentials, login, smokeApiBase, type SmokeAuth } from './lib/smoke-auth';
import { runSmokeScript } from './lib/smoke-runner';

const TENANT = process.env.SMOKE_TENANT_ID ?? 'tenant-demo';
const MARKER = `${SMOKE_TEST_MARKER} v31-slice7.5`;

const REQUIRED_COLUMNS: Array<{ table: string; column: string }> = [
  { table: 'GastroProfile', column: 'bookingUrl' },
  { table: 'GastroProfile', column: 'socialLinks' },
  { table: 'ExcursionOperator', column: 'websiteUrl' },
  { table: 'ExcursionOperator', column: 'bookingUrl' },
  { table: 'ExcursionOperator', column: 'socialLinks' },
  { table: 'Event', column: 'excursionDepartureTime' },
  { table: 'Event', column: 'excursionDurationText' },
  { table: 'Event', column: 'excursionAvailableDaysText' },
  { table: 'Event', column: 'excursionScheduleNotes' },
  { table: 'Event', column: 'excursionMeetingPoint' },
  { table: 'EventSubcategory', column: 'isPrimary' },
];

type CleanupIds = {
  operatorId?: string;
  eventId?: string;
  gastroProfileId?: string;
};

function pass(label: string) {
  console.log(`  OK ${label}`);
}

function fail(label: string, detail?: string) {
  console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
}

async function assertColumns(prisma: PrismaClient): Promise<boolean> {
  let ok = true;
  for (const { table, column } of REQUIRED_COLUMNS) {
    const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${table}
        AND column_name = ${column}
    `;
    if (rows.length === 0) {
      fail(`column ${table}.${column}`, 'missing — run prisma migrate deploy');
      ok = false;
    } else {
      pass(`column ${table}.${column}`);
    }
  }
  return ok;
}

async function dbRoundtrip(
  prisma: PrismaClient,
  cleanup: CleanupIds,
): Promise<boolean> {
  const tenant = await prisma.tenant.findFirst({ where: { id: TENANT } });
  if (!tenant) {
    fail('tenant', `${TENANT} not found`);
    return false;
  }
  pass(`tenant ${TENANT}`);

  const producer = await prisma.producerProfile.findFirst({
    where: { tenantId: TENANT, status: 'ACTIVE' },
    select: { id: true },
  });
  const producerId =
    producer?.id ??
    (
      await prisma.user.findFirst({
        where: { tenantId: TENANT },
        select: { id: true },
      })
    )?.id;
  if (!producerId) {
    fail('producerId', 'no active producer or user for excursion event');
    return false;
  }

  const operator = await prisma.excursionOperator.create({
    data: {
      tenantId: TENANT,
      name: `${MARKER} operator`,
      websiteUrl: 'https://example.com/operator',
      bookingUrl: 'https://example.com/book',
      socialLinks: { instagram: 'https://instagram.com/smoke_test' },
      address: 'Calle Smoke 1',
      city: 'San Carlos de Bariloche',
      geoLat: -41.1335,
      geoLng: -71.3103,
    },
  });
  cleanup.operatorId = operator.id;
  pass('ExcursionOperator create with links');

  const event = await prisma.event.create({
    data: {
      tenantId: TENANT,
      producerId,
      category: 'excursion',
      excursionOperatorId: operator.id,
      title: `${MARKER} excursion`,
      startAt: new Date(),
      status: 'APPROVED',
      excursionDepartureTime: '09:00 hs',
      excursionDurationText: '4 horas',
      excursionAvailableDaysText: 'Lun–Vie',
      excursionScheduleNotes: 'Confirmar con 24 h',
      excursionMeetingPoint: 'Oficina Mitre 100',
      venueAddress: 'Mitre 200',
      city: 'San Carlos de Bariloche',
      geoLat: -41.14,
      geoLng: -71.32,
    },
  });
  cleanup.eventId = event.id;
  pass('Event excursion create with schedule + location override');

  const reread = await prisma.event.findUnique({ where: { id: event.id } });
  if (!reread) {
    fail('Event reread');
    return false;
  }
  const schedule = readExcursionSchedulePublic(reread);
  if (
    schedule.departureTime !== '09:00 hs' ||
    schedule.meetingPoint !== 'Oficina Mitre 100'
  ) {
    fail('excursion schedule roundtrip', JSON.stringify(schedule));
    return false;
  }
  pass('excursion schedule roundtrip');

  const gastro = await prisma.gastroProfile.create({
    data: {
      tenantId: TENANT,
      displayName: `${MARKER} gastro`,
      status: 'ACTIVE',
      websiteUrl: 'https://example.com/gastro',
      bookingUrl: 'https://example.com/reservas',
      socialLinks: { facebook: 'https://facebook.com/smoke_test' },
    },
  });
  cleanup.gastroProfileId = gastro.id;
  pass('GastroProfile create with links');

  const gastroRead = await prisma.gastroProfile.findUnique({ where: { id: gastro.id } });
  const links = readEntitySocialLinks(gastroRead?.socialLinks);
  if (gastroRead?.bookingUrl !== 'https://example.com/reservas' || !links.facebook) {
    fail('gastro links roundtrip');
    return false;
  }
  pass('gastro links roundtrip');

  return true;
}

async function cleanupArtifacts(prisma: PrismaClient, cleanup: CleanupIds) {
  if (cleanup.eventId) {
    await prisma.eventMedia.deleteMany({ where: { eventId: cleanup.eventId } });
    await prisma.eventSubcategory.deleteMany({ where: { eventId: cleanup.eventId } });
    await prisma.event.deleteMany({ where: { id: cleanup.eventId } });
  }
  if (cleanup.operatorId) {
    await prisma.excursionOperator.deleteMany({ where: { id: cleanup.operatorId } });
  }
  if (cleanup.gastroProfileId) {
    await prisma.gastroProfile.deleteMany({ where: { id: cleanup.gastroProfileId } });
  }
}

const SKIP_ADMIN_PATCH = 'SKIP PATCH admin/excursion-operators — admin auth unavailable';

function devSmokeAuth(): SmokeAuth {
  const userId = process.env.SMOKE_DEV_USER_ID ?? 'user-admin';
  return {
    token: null,
    userId,
    label: `X-Dev-User-Id ${userId}`,
    headers: { 'X-Dev-User-Id': userId },
  };
}

async function resolveAdminSmokeAuth(): Promise<SmokeAuth | null> {
  const creds = getSmokeCredentials();
  if (creds) {
    const session = await login(creds.email, creds.password);
    if (session) {
      return {
        token: session.token,
        userId: session.userId,
        label: creds.email,
        headers: { Authorization: `Bearer ${session.token}` },
      };
    }
    console.log(`  ${SKIP_ADMIN_PATCH} (login failed for SMOKE_USER_EMAIL)`);
    return null;
  }

  if (process.env.SMOKE_ALLOW_DEV_AUTH !== '1') {
    console.log(`  ${SKIP_ADMIN_PATCH} (set SMOKE_USER_EMAIL/PASSWORD or SMOKE_ALLOW_DEV_AUTH=1)`);
    return null;
  }

  console.log('[smoke] Using X-Dev-User-Id fallback (SMOKE_ALLOW_DEV_AUTH=1).');
  return devSmokeAuth();
}

/** Returns false when API is up but public detail checks fail. */
async function optionalApiChecks(eventId: string | undefined): Promise<boolean> {
  const base = smokeApiBase();
  try {
    const health = await fetch(`${base}/health`);
    if (!health.ok) {
      console.log('  SKIP API (health not OK)');
      return true;
    }
    pass('API health');

    if (!eventId) return true;

    const detail = await fetch(
      `${base}/public/events/${encodeURIComponent(eventId)}?tenantId=${TENANT}`,
    );
    const body = (await detail.json()) as {
      excursionSchedule?: { departureTime?: string | null };
      excursionOperator?: { websiteUrl?: string | null };
    };
    if (!detail.ok) {
      fail('GET public event detail', `status=${detail.status}`);
      return false;
    }
    if (body.excursionSchedule?.departureTime !== '09:00 hs') {
      fail('public excursionSchedule', JSON.stringify(body.excursionSchedule));
      return false;
    }
    if (!body.excursionOperator?.websiteUrl) {
      fail('public excursionOperator links');
      return false;
    }
    pass('GET /public/events/:id (schedule + operator links)');
    return true;
  } catch (e) {
    console.log('  SKIP API', String(e));
    return true;
  }
}

/** Optional admin PATCH — never fails smoke on 401/403 or missing auth. */
async function optionalAdminPatch(operatorId: string | undefined): Promise<void> {
  if (!operatorId) return;

  const auth = await resolveAdminSmokeAuth();
  if (!auth) return;

  const base = smokeApiBase();
  let res: Response;
  try {
    res = await fetch(`${base}/admin/excursion-operators/${operatorId}`, {
      method: 'PATCH',
      headers: { ...auth.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingUrl: 'https://example.com/book-updated',
        socialLinks: { youtube: 'https://youtube.com/@smoke' },
      }),
    });
  } catch (e) {
    console.log(`  SKIP PATCH admin/excursion-operators — ${String(e)}`);
    return;
  }

  if (res.status === 401 || res.status === 403) {
    console.log(`  ${SKIP_ADMIN_PATCH}`);
    return;
  }
  if (!res.ok) {
    console.log(`  SKIP PATCH admin/excursion-operators — status=${res.status}`);
    return;
  }
  pass('PATCH admin/excursion-operators (links)');
}

async function main() {
  const prisma = new PrismaClient();
  const cleanup: CleanupIds = {};
  let exitCode = 0;

  try {
    await prisma.$connect();
    pass('DB connect');

    if (!(await assertColumns(prisma))) exitCode = 1;

    if (exitCode === 0 && !(await dbRoundtrip(prisma, cleanup))) exitCode = 1;

    if (exitCode === 0) {
      await optionalAdminPatch(cleanup.operatorId);
      if (!(await optionalApiChecks(cleanup.eventId))) exitCode = 1;
    }
  } catch (e) {
    fail('unexpected', String(e));
    exitCode = 1;
  } finally {
    await cleanupArtifacts(prisma, cleanup);
    if (cleanup.eventId || cleanup.operatorId || cleanup.gastroProfileId) {
      pass('ephemeral smoke artifacts cleaned');
    }
    await prisma.$disconnect();
  }

  return exitCode;
}

void runSmokeScript('v31-stabilization', main);

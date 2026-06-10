/**
 * V3.1 Etapa 6 Slice 6.2 — Ticket list PDF permissions smoke.
 * Run: pnpm --filter api run smoke:v31-ticket-list-pdf-permissions
 */

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaClient, Role, UserStatus } from '@prisma/client';
import { TicketListExportService } from '../src/modules/tickets/ticket-list-export.service';
import { ScannerAccountsService } from '../src/modules/scanner-accounts/scanner-accounts.service';
import { ProfilesAuthorizationService } from '../src/common/profiles-authorization.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { SMOKE_TEST_MARKER } from './lib/smoke-constants';
import { runSmokeScript } from './lib/smoke-runner';

const TENANT = process.env.SMOKE_TENANT_ID ?? 'tenant-demo';
const MARKER = `${SMOKE_TEST_MARKER} v31-ticket-list-pdf-perms`;

type Cleanup = { userIds: string[]; scannerAccountIds: string[] };

function pass(label: string) {
  console.log(`  OK ${label}`);
}

function fail(label: string, detail?: string) {
  console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
}

async function expectForbidden(fn: () => Promise<unknown>, label: string): Promise<boolean> {
  try {
    await fn();
    fail(`${label} should be forbidden`);
    return false;
  } catch (e) {
    if (e instanceof ForbiddenException) {
      pass(label);
      return true;
    }
    fail(label, e instanceof Error ? e.message : String(e));
    return false;
  }
}

async function smokePermissions(prisma: PrismaService, cleanup: Cleanup): Promise<boolean> {
  const exportSvc = new TicketListExportService(
    prisma,
    new AuditService(prisma),
    new ScannerAccountsService(
      prisma,
      new ProfilesAuthorizationService(prisma),
      new AuditService(prisma),
    ),
  );

  const producers = await prisma.producerProfile.findMany({
    where: { tenantId: TENANT, status: 'ACTIVE' },
    include: { memberships: { where: { status: 'ACTIVE' }, take: 1 } },
    take: 2,
  });
  if (producers.length < 1 || !producers[0]?.memberships[0]) {
    fail('producers');
    return false;
  }
  const producerA = producers[0]!;
  const producerB = producers[1];

  const eventA = await prisma.event.findFirst({
    where: {
      tenantId: TENANT,
      producerProfileId: producerA.id,
      tickets: { some: {} },
      deletedAt: null,
    },
  });
  if (!eventA) {
    fail('event A with tickets');
    return false;
  }

  let ok = true;

  const stdUser = await prisma.user.create({
    data: {
      tenantId: TENANT,
      email: `${MARKER}-user@${Date.now()}.test`,
      firstName: 'Std',
      lastName: 'User',
      role: Role.USER,
      status: UserStatus.ACTIVE,
      passwordHash: 'x',
    },
  });
  cleanup.userIds.push(stdUser.id);

  ok =
    (await expectForbidden(
      () =>
        exportSvc.exportPdfForProducer(
          { id: stdUser.id, tenantId: TENANT, role: Role.USER },
          eventA.id,
        ),
      'USER blocked',
    )) && ok;

  if (producerB?.memberships[0]) {
    ok =
      (await expectForbidden(
        () =>
          exportSvc.exportPdfForProducer(
            {
              id: producerB.memberships[0]!.userId,
              tenantId: TENANT,
              role: Role.PRODUCER_OWNER,
            },
            eventA.id,
          ),
        'Producer B blocked on event A',
      )) && ok;
  }

  const scannerUser = await prisma.user.create({
    data: {
      tenantId: TENANT,
      email: `${MARKER}-scanner@${Date.now()}.test`,
      firstName: 'Scan',
      lastName: 'User',
      role: Role.SCANNER,
      status: UserStatus.ACTIVE,
      passwordHash: 'x',
    },
  });
  cleanup.userIds.push(scannerUser.id);

  const account = await prisma.scannerAccount.create({
    data: {
      tenantId: TENANT,
      scannerUserId: scannerUser.id,
      parentUserId: producerA.memberships[0]!.userId,
      parentProfileType: 'PRODUCER',
      parentProfileId: producerA.id,
    },
  });
  cleanup.scannerAccountIds.push(account.id);

  try {
    await exportSvc.exportPdfForScanner(
      { id: scannerUser.id, tenantId: TENANT, role: Role.SCANNER },
      eventA.id,
    );
    pass('scanner linked can export');
  } catch (e) {
    fail('scanner export', e instanceof Error ? e.message : String(e));
    ok = false;
  }

  await prisma.scannerAccount.update({
    where: { id: account.id },
    data: { isActive: false },
  });

  ok =
    (await expectForbidden(
      () =>
        exportSvc.exportPdfForScanner(
          { id: scannerUser.id, tenantId: TENANT, role: Role.SCANNER },
          eventA.id,
        ),
      'inactive scanner blocked (SCANNER_INACTIVE)',
    )) && ok;

  try {
    await exportSvc.exportPdfForProducer(
      { id: producerA.memberships[0]!.userId, tenantId: TENANT, role: Role.PRODUCER_OWNER },
      'nonexistent-event-id',
    );
    fail('not found should throw');
    ok = false;
  } catch (e) {
    if (e instanceof NotFoundException) pass('nonexistent event NOT_FOUND');
    else {
      fail('not found', e instanceof Error ? e.message : String(e));
      ok = false;
    }
  }

  return ok;
}

async function cleanupAll(prisma: PrismaClient, cleanup: Cleanup) {
  if (cleanup.scannerAccountIds.length) {
    await prisma.scannerAccount.deleteMany({ where: { id: { in: cleanup.scannerAccountIds } } });
  }
  if (cleanup.userIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: cleanup.userIds } } });
  }
}

async function main(): Promise<number> {
  const prisma = new PrismaClient();
  const prismaService = prisma as unknown as PrismaService;
  const cleanup: Cleanup = { scannerAccountIds: [], userIds: [] };
  let exitCode = 0;

  console.log('\n=== V3.1 ticket list PDF permissions smoke ===\n');

  try {
    await prisma.$connect();
    pass('DB connect');
    if (!(await smokePermissions(prismaService, cleanup))) exitCode = 1;
  } catch (e) {
    fail('unexpected', String(e));
    exitCode = 1;
  } finally {
    await cleanupAll(prisma, cleanup);
    await prisma.$disconnect();
  }

  if (exitCode === 0) console.log('\nAll checks passed.\n');
  return exitCode;
}

void runSmokeScript('v31-ticket-list-pdf-permissions', main);

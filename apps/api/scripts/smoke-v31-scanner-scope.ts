/**
 * V3.1 Etapa 5 Slices 5.6–5.7 — Scanner scope + scan-targets smoke.
 * Run: pnpm --filter api run smoke:v31-scanner-scope
 */

import { PrismaClient, Role, UserStatus } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import { ScannerAccountsService } from '../src/modules/scanner-accounts/scanner-accounts.service';
import { ScannerService } from '../src/scanner/scanner.service';
import { ProfilesAuthorizationService } from '../src/common/profiles-authorization.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { SMOKE_TEST_MARKER } from './lib/smoke-constants';
import { runSmokeScript } from './lib/smoke-runner';

const TENANT = process.env.SMOKE_TENANT_ID ?? 'tenant-demo';
const MARKER = `${SMOKE_TEST_MARKER} v31-scanner-scope`;

type Cleanup = {
  scannerAccountIds: string[];
  userIds: string[];
};

function pass(label: string) {
  console.log(`  OK ${label}`);
}

function fail(label: string, detail?: string) {
  console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
}

async function smokeScope(prisma: PrismaService, cleanup: Cleanup): Promise<boolean> {
  const accounts = new ScannerAccountsService(
    prisma,
    new ProfilesAuthorizationService(prisma),
    new AuditService(prisma),
  );
  const scanner = new ScannerService(prisma, accounts);
  let ok = true;

  const producer = await prisma.producerProfile.findFirst({
    where: { tenantId: TENANT, status: 'ACTIVE' },
    include: { memberships: { where: { status: 'ACTIVE' }, take: 1 } },
  });
  if (!producer?.memberships[0]) {
    fail('seed producer');
    return false;
  }

  const otherProducer = await prisma.producerProfile.findFirst({
    where: { tenantId: TENANT, status: 'ACTIVE', id: { not: producer.id } },
  });

  const eventOwn = await prisma.event.findFirst({
    where: {
      tenantId: TENANT,
      deletedAt: null,
      producerProfileId: producer.id,
      ticketTypes: { some: {} },
    },
    select: { id: true },
  });
  const eventOther = otherProducer
    ? await prisma.event.findFirst({
        where: {
          tenantId: TENANT,
          deletedAt: null,
          producerProfileId: otherProducer.id,
          ticketTypes: { some: {} },
        },
        select: { id: true },
      })
    : null;

  const scannerUser = await prisma.user.create({
    data: {
      tenantId: TENANT,
      email: `${MARKER}-scanner@${Date.now()}.test`,
      firstName: 'Scope',
      lastName: 'Scanner',
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
      parentUserId: producer.memberships[0]!.userId,
      parentProfileType: 'PRODUCER',
      parentProfileId: producer.id,
    },
  });
  cleanup.scannerAccountIds.push(account.id);

  const targets = await accounts.getScanTargetsForScanner({
    id: scannerUser.id,
    tenantId: TENANT,
    role: 'SCANNER',
  });
  if (targets.parentProfileId !== producer.id) {
    fail('scan-targets parentProfileId');
    ok = false;
  } else {
    pass('scan-targets for linked producer');
  }
  if (eventOwn && !targets.events.some((e) => e.id === eventOwn.id)) {
    fail('scan-targets includes own event');
    ok = false;
  } else if (eventOwn) {
    pass('scan-targets lists producer events');
  }

  if (eventOwn) {
    try {
      await scanner.getEventTickets(TENANT, scannerUser.id, eventOwn.id);
      pass('getEventTickets own event');
    } catch {
      fail('getEventTickets own event');
      ok = false;
    }
  }

  if (eventOther) {
    try {
      await scanner.getEventTickets(TENANT, scannerUser.id, eventOther.id);
      fail('getEventTickets foreign event should be forbidden');
      ok = false;
    } catch (e) {
      if (e instanceof ForbiddenException) pass('foreign event tickets forbidden');
      else {
        fail('foreign event tickets forbidden', String(e));
        ok = false;
      }
    }
  }

  const gastro = await prisma.gastroProfile.findFirst({
    where: { tenantId: TENANT, status: 'ACTIVE' },
  });
  if (gastro) {
    const gastroScanner = await prisma.user.create({
      data: {
        tenantId: TENANT,
        email: `${MARKER}-gastro@${Date.now()}.test`,
        firstName: 'Gastro',
        lastName: 'Scanner',
        role: Role.SCANNER,
        status: UserStatus.ACTIVE,
        passwordHash: 'x',
      },
    });
    cleanup.userIds.push(gastroScanner.id);
    const gastroAccount = await prisma.scannerAccount.create({
      data: {
        tenantId: TENANT,
        scannerUserId: gastroScanner.id,
        parentUserId: gastroScanner.id,
        parentProfileType: 'GASTRO',
        parentProfileId: gastro.id,
      },
    });
    cleanup.scannerAccountIds.push(gastroAccount.id);

    const gastroTargets = await accounts.getScanTargetsForScanner({
      id: gastroScanner.id,
      tenantId: TENANT,
      role: 'SCANNER',
    });
    if (gastroTargets.discounts.length >= 0) {
      pass('gastro scan-targets response');
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

  console.log('\n=== V3.1 scanner scope smoke ===\n');

  try {
    await prisma.$connect();
    pass('DB connect');
    if (!(await smokeScope(prismaService, cleanup))) exitCode = 1;
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

void runSmokeScript('v31-scanner-scope', main);

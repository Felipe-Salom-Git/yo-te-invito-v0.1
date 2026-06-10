/**
 * V3.1 Etapa 5 Slice 5.1 — Scanner account ownership smoke.
 * Run: pnpm --filter api run smoke:v31-scanner-accounts
 */

import { PrismaClient, Role, UserStatus } from '@prisma/client';
import { ScannerAccountsService } from '../src/modules/scanner-accounts/scanner-accounts.service';
import { ProfilesAuthorizationService } from '../src/common/profiles-authorization.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { SMOKE_TEST_MARKER } from './lib/smoke-constants';
import { runSmokeScript } from './lib/smoke-runner';

const TENANT = process.env.SMOKE_TENANT_ID ?? 'tenant-demo';
const MARKER = `${SMOKE_TEST_MARKER} v31-scanner-accounts`;

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

async function assertSchema(prisma: PrismaClient): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ScannerAccount'
  `;
  if (rows.length === 0) {
    fail('table ScannerAccount');
    return false;
  }
  pass('table ScannerAccount');
  return true;
}

async function smokeOwnership(
  prisma: PrismaService,
  cleanup: Cleanup,
): Promise<boolean> {
  const service = new ScannerAccountsService(
    prisma,
    new ProfilesAuthorizationService(prisma),
    new AuditService(prisma),
  );
  let ok = true;

  const producer = await prisma.producerProfile.findFirst({
    where: { tenantId: TENANT, status: 'ACTIVE' },
    include: {
      memberships: { where: { status: 'ACTIVE' }, take: 1 },
    },
  });
  if (!producer?.memberships[0]) {
    fail('seed producer profile + membership for smoke');
    return false;
  }
  const parentUserId = producer.memberships[0]!.userId;

  const scannerUser = await prisma.user.create({
    data: {
      tenantId: TENANT,
      email: `${MARKER}-scanner@${Date.now()}.test`,
      firstName: 'Smoke',
      lastName: 'Scanner',
      role: Role.SCANNER,
      status: UserStatus.ACTIVE,
      passwordHash: 'x',
    },
  });
  cleanup.userIds.push(scannerUser.id);

  const admin = await prisma.user.findFirst({
    where: { tenantId: TENANT, role: Role.ADMIN, deletedAt: null },
  });
  if (!admin) {
    fail('admin user for tenant');
    return false;
  }

  const linked = await service.linkScannerAccountAdmin(
    { id: admin.id, tenantId: TENANT, role: 'ADMIN' },
    {
      scannerUserId: scannerUser.id,
      parentProfileType: 'PRODUCER',
      parentProfileId: producer.id,
    },
  );
  cleanup.scannerAccountIds.push(linked.id);
  pass(`link scanner → producer ${producer.id}`);

  const producerList = await service.listForProducer({
    id: parentUserId,
    tenantId: TENANT,
    role: 'PRODUCER_OWNER',
  });
  if (!producerList.data.some((r) => r.scannerUserId === scannerUser.id)) {
    fail('producer list includes linked scanner');
    ok = false;
  } else {
    pass('producer lists own scanners');
  }

  const otherUser = await prisma.user.findFirst({
    where: {
      tenantId: TENANT,
      role: Role.USER,
      deletedAt: null,
      id: { not: parentUserId },
    },
  });
  if (otherUser) {
    try {
      await service.listForProducer({
        id: otherUser.id,
        tenantId: TENANT,
        role: 'USER',
      });
      fail('standard user should not list producer scanners');
      ok = false;
    } catch {
      pass('standard user forbidden from producer scanners');
    }
  }

  const self = await service.getSelfForScanner({
    id: scannerUser.id,
    tenantId: TENANT,
    role: 'SCANNER',
  });
  if (!self || self.parentProfileId !== producer.id) {
    fail('scanner self account');
    ok = false;
  } else {
    pass('scanner GET self account');
  }

  const active = await service.getActiveAccountForScanner(TENANT, scannerUser.id);
  if (!active || active.parentProfileId !== producer.id) {
    fail('getActiveAccountForScanner');
    ok = false;
  } else {
    pass('active account resolver');
  }

  try {
    await service.linkScannerAccountAdmin(
      { id: admin.id, tenantId: TENANT, role: 'ADMIN' },
      {
        scannerUserId: scannerUser.id,
        parentProfileType: 'PRODUCER',
        parentProfileId: producer.id,
      },
    );
    fail('duplicate link should conflict');
    ok = false;
  } catch {
    pass('duplicate link rejected');
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

  console.log('\n=== V3.1 scanner accounts smoke ===\n');

  try {
    await prisma.$connect();
    pass('DB connect');

    if (!(await assertSchema(prisma))) exitCode = 1;
    if (exitCode === 0 && !(await smokeOwnership(prismaService, cleanup))) exitCode = 1;
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

void runSmokeScript('v31-scanner-accounts', main);

/**
 * V3.1 Etapa 6 Slice 6.1 — Ticket list PDF export smoke.
 * Run: pnpm --filter api run smoke:v31-ticket-list-pdf
 */

import { PrismaClient, Role } from '@prisma/client';
import { TicketListExportService } from '../src/modules/tickets/ticket-list-export.service';
import { ScannerAccountsService } from '../src/modules/scanner-accounts/scanner-accounts.service';
import { ProfilesAuthorizationService } from '../src/common/profiles-authorization.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { runSmokeScript } from './lib/smoke-runner';

const TENANT = process.env.SMOKE_TENANT_ID ?? 'tenant-demo';

function pass(label: string) {
  console.log(`  OK ${label}`);
}

function fail(label: string, detail?: string) {
  console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
}

async function smokePdf(prisma: PrismaService): Promise<boolean> {
  const exportSvc = new TicketListExportService(
    prisma,
    new AuditService(prisma),
    new ScannerAccountsService(
      prisma,
      new ProfilesAuthorizationService(prisma),
      new AuditService(prisma),
    ),
  );

  const producer = await prisma.producerProfile.findFirst({
    where: { tenantId: TENANT, status: 'ACTIVE' },
    include: { memberships: { where: { status: 'ACTIVE' }, take: 1 } },
  });
  if (!producer?.memberships[0]) {
    fail('seed producer');
    return false;
  }

  const event = await prisma.event.findFirst({
    where: {
      tenantId: TENANT,
      deletedAt: null,
      producerProfileId: producer.id,
      tickets: { some: {} },
    },
  });
  if (!event) {
    fail('event with tickets');
    return false;
  }

  const ownerId = producer.memberships[0]!.userId;
  let ok = true;

  try {
    const { buffer, filename } = await exportSvc.exportPdfForProducer(
      { id: ownerId, tenantId: TENANT, role: Role.PRODUCER_OWNER },
      event.id,
    );
    if (buffer.length < 500) {
      fail('pdf buffer size');
      ok = false;
    } else {
      pass(`producer PDF (${buffer.length} bytes, ${filename})`);
    }
    const header = buffer.subarray(0, 5).toString('utf8');
    if (!header.startsWith('%PDF')) {
      fail('pdf magic bytes');
      ok = false;
    } else {
      pass('valid PDF header');
    }
  } catch (e) {
    fail('producer export', e instanceof Error ? e.message : String(e));
    ok = false;
  }

  const audit = await prisma.auditLog.findFirst({
    where: {
      tenantId: TENANT,
      entityId: event.id,
      action: 'TICKET_LIST_EXPORTED',
    },
    orderBy: { createdAt: 'desc' },
  });
  if (audit) pass('audit TICKET_LIST_EXPORTED');
  else {
    fail('audit log');
    ok = false;
  }

  return ok;
}

async function main(): Promise<number> {
  const prisma = new PrismaClient();
  const prismaService = prisma as unknown as PrismaService;
  let exitCode = 0;

  console.log('\n=== V3.1 ticket list PDF smoke ===\n');

  try {
    await prisma.$connect();
    pass('DB connect');
    if (!(await smokePdf(prismaService))) exitCode = 1;
  } catch (e) {
    fail('unexpected', String(e));
    exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }

  if (exitCode === 0) console.log('\nAll checks passed.\n');
  return exitCode;
}

void runSmokeScript('v31-ticket-list-pdf', main);

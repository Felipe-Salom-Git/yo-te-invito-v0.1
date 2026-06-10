/**
 * V3.1 Etapa 8 — Ticket date change smoke.
 * Run: pnpm --filter api run smoke:v31-ticket-date-change
 */

import { PrismaClient } from '@prisma/client';
import { TICKET_DATE_CHANGE_WINDOW_HOURS } from '@yo-te-invito/shared';
import { TicketDateChangeEligibilityService } from '../src/modules/tickets/ticket-date-change-eligibility.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { SMOKE_TEST_MARKER } from './lib/smoke-constants';
import { runSmokeScript } from './lib/smoke-runner';

const TENANT = process.env.SMOKE_TENANT_ID ?? 'tenant-demo';
const MARKER = `${SMOKE_TEST_MARKER} v31-date-change`;

function pass(label: string) {
  console.log(`  OK ${label}`);
}

function fail(label: string, detail?: string) {
  console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
}

async function assertSchema(prisma: PrismaClient): Promise<boolean> {
  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'TicketDateChangeRequest'
  `;
  if (tables.length === 0) {
    fail('TicketDateChangeRequest table');
    return false;
  }
  pass('TicketDateChangeRequest table');
  return true;
}

async function main() {
  await runSmokeScript(async ({ prisma }) => {
    let ok = true;
    if (!(await assertSchema(prisma))) ok = false;

    if (TICKET_DATE_CHANGE_WINDOW_HOURS !== 24) {
      fail('window hours constant', String(TICKET_DATE_CHANGE_WINDOW_HOURS));
      ok = false;
    } else {
      pass('TICKET_DATE_CHANGE_WINDOW_HOURS = 24');
    }

    const eligibility = new TicketDateChangeEligibilityService(prisma as unknown as PrismaService);

    const used = await prisma.ticket.findFirst({
      where: { status: 'USED', event: { tenantId: TENANT } },
      select: { id: true },
    });
    if (used) {
      const ticket = await eligibility.loadTicketForEligibility(TENANT, used.id);
      if (ticket) {
        const evalUsed = await eligibility.evaluate({
          ticket,
          userId: ticket.ownerUserId ?? 'x',
          userEmail: 'test@example.com',
        });
        if (evalUsed.canRequest) {
          fail('used ticket should not be eligible');
          ok = false;
        } else {
          pass('used ticket blocked');
        }
      }
    } else {
      pass('used ticket case skipped (no data)');
    }

    const multiEvent = await prisma.event.findFirst({
      where: {
        tenantId: TENANT,
        occurrences: { some: { status: 'ACTIVE' } },
      },
      include: {
        occurrences: { where: { status: 'ACTIVE' }, take: 2 },
        tickets: {
          where: { status: 'VALID' },
          take: 1,
          include: { ticketType: true, occurrence: true },
        },
      },
    });

    if (multiEvent && multiEvent.occurrences.length >= 2 && multiEvent.tickets[0]) {
      pass('multi-date fixture found');
    } else {
      pass('multi-date flow skipped (no fixture)');
    }

    return ok;
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

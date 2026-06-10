/**
 * V3.1 Etapa 9 — Ticket transfer flow smoke (eligibility + templates).
 * Run: pnpm --filter api run smoke:v31-ticket-transfer-flow
 * Full E2E with HTTP: pnpm --filter api run smoke:user-portal (transfer section)
 */

import { TICKET_TRANSFER_BLOCK_REASON } from '@yo-te-invito/shared';
import { TicketTransferEligibilityService } from '../src/modules/tickets/ticket-transfer-eligibility.service';
import { isEmailTemplateId } from '../src/email/templates/email-template.types';
import { runSmokeScript } from './lib/smoke-runner';

function pass(label: string) {
  console.log(`  OK ${label}`);
}

function fail(label: string, detail?: string) {
  console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  await runSmokeScript('v31-ticket-transfer-flow', async () => {
    let ok = true;
    const eligibility = new TicketTransferEligibilityService({} as never);

    const templates = [
      'TICKET_TRANSFER_RECEIVED',
      'TICKET_TRANSFER_ACCEPTED',
      'TICKET_TRANSFER_REJECTED',
      'TICKET_TRANSFER_CANCELLED',
      'TICKET_TRANSFER_EXPIRED',
    ] as const;
    for (const id of templates) {
      if (!isEmailTemplateId(id)) {
        fail(`email template ${id}`);
        ok = false;
      } else {
        pass(`email template ${id}`);
      }
    }

    const now = new Date();
    const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const past = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const validTicket = {
      id: 'smoke-ticket',
      status: 'VALID' as const,
      usedAt: null,
      revokedAt: null,
      ownerUserId: 'user-a',
      activeTransferOffer: null,
      event: {
        id: 'ev',
        status: 'APPROVED',
        startAt: future,
        endAt: future,
        deletedAt: null,
        tenantId: 'tenant-demo',
      },
      occurrence: null,
    };

    const ownerOk = eligibility.evaluate(validTicket, 'user-a');
    if (!ownerOk.transferable) {
      fail('VALID ticket transferable for owner', ownerOk.reasons.join(','));
      ok = false;
    } else {
      pass('VALID ticket transferable for owner');
    }

    const notOwner = eligibility.evaluate(validTicket, 'user-b');
    if (notOwner.transferable || !notOwner.reasons.includes(TICKET_TRANSFER_BLOCK_REASON.NOT_OWNER)) {
      fail('non-owner blocked');
      ok = false;
    } else {
      pass('non-owner blocked');
    }

    const used = eligibility.evaluate(
      { ...validTicket, status: 'USED', usedAt: past },
      'user-a',
    );
    if (used.transferable || !used.reasons.includes(TICKET_TRANSFER_BLOCK_REASON.TICKET_ALREADY_USED)) {
      fail('USED ticket blocked');
      ok = false;
    } else {
      pass('USED ticket blocked');
    }

    const expired = eligibility.evaluate(
      {
        ...validTicket,
        event: { ...validTicket.event, startAt: past, endAt: past },
      },
      'user-a',
    );
    if (expired.transferable || !expired.reasons.includes(TICKET_TRANSFER_BLOCK_REASON.TICKET_EXPIRED)) {
      fail('past event blocked');
      ok = false;
    } else {
      pass('past event blocked');
    }

    if (!ok) {
      throw new Error('smoke:v31-ticket-transfer-flow failed');
    }
    console.log('\nSmoke OK — run smoke:user-portal for HTTP transfer E2E');
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

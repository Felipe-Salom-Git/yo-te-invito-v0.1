/**
 * READ-ONLY benefit settlement integrity audit.
 * Run: pnpm --filter api run benefit-settlements:audit-integrity
 */

import { PrismaClient } from '@prisma/client';
import {
  checkCashOverpayment,
  checkNegativeCourtesyBalance,
  deriveIntegrityStatus,
  runBarterCreditDriftCheck,
} from '@yo-te-invito/shared';

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
  } catch (err) {
    console.log('DB integration: NO EJECUTADO — PostgreSQL no disponible');
    console.log(String(err));
    return;
  }

  const settlements = await prisma.benefitSettlement.findMany({
    where: { tenantId },
    include: { allocations: true, transfers: true },
    take: 500,
  });

  let ok = 0;
  let warnings = 0;
  let errors = 0;

  for (const row of settlements) {
    const issues = [];

    const overpay = checkCashOverpayment(row.allocations, row.transfers, row.id);
    if (overpay) issues.push(overpay);

    const barterIds = row.allocations.filter((a) => a.mode === 'BARTER').map((a) => a.id);
    if (barterIds.length) {
      const credits = await prisma.courtesyCreditLedgerEntry.findMany({
        where: { type: 'CREDIT_FROM_SETTLEMENT', sourceAllocationId: { in: barterIds } },
        select: { id: true, type: true, amountCents: true, sourceAllocationId: true },
      });
      issues.push(
        ...runBarterCreditDriftCheck({
          barterAllocations: row.allocations.map((a) => ({
            id: a.id,
            mode: a.mode,
            baseAmountCents: a.baseAmountCents,
            barterMultiplier: a.barterMultiplier.toString(),
          })),
          creditEntries: credits,
        }),
      );
    }

    const partnerScope =
      row.vertical === 'GASTRO' && row.gastroProfileId
        ? { gastroProfileId: row.gastroProfileId, excursionOperatorId: null }
        : row.vertical === 'ACTIVITY' && row.excursionOperatorId
          ? { gastroProfileId: null, excursionOperatorId: row.excursionOperatorId }
          : null;

    if (partnerScope) {
      const entries = await prisma.courtesyCreditLedgerEntry.findMany({
        where: {
          tenantId: row.tenantId,
          vertical: row.vertical,
          gastroProfileId: partnerScope.gastroProfileId,
          excursionOperatorId: partnerScope.excursionOperatorId,
        },
        select: { amountCents: true },
      });
      const negative = checkNegativeCourtesyBalance(entries, row.id);
      if (negative) issues.push(negative);
    }

    const status = deriveIntegrityStatus(issues);
    if (status === 'OK') ok += 1;
    else if (status === 'WARNING') warnings += 1;
    else errors += 1;
  }

  console.log(
    JSON.stringify(
      {
        checked: settlements.length,
        ok,
        warnings,
        errors,
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

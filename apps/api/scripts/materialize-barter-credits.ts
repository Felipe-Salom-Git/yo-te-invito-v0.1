/**
 * Reconcile BARTER allocations missing CREDIT_FROM_SETTLEMENT ledger entries.
 * Run: pnpm --filter api run benefit-settlements:materialize-barter-credits
 */

import { PrismaClient } from '@prisma/client';
import { CourtesyCreditLedgerService } from '../src/modules/courtesy-credit-ledger/courtesy-credit-ledger.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuditService } from '../src/modules/audit/audit.service';

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
  } catch (err) {
    console.error('NO EJECUTADO — PostgreSQL no disponible');
    console.error(err);
    process.exit(1);
  }

  const ledger = new CourtesyCreditLedgerService(
    prisma as unknown as PrismaService,
    { logAction: async () => {} } as unknown as AuditService,
  );

  const result = await ledger.reconcileMissingBarterCredits();
  console.log('Materialize BARTER credits reconciliation:');
  console.log(`  created: ${result.created}`);
  console.log(`  skipped: ${result.skipped}`);
  console.log(`  errors:  ${result.errors.length}`);
  for (const error of result.errors) {
    console.log(`    - ${error.allocationId}: ${error.message}`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

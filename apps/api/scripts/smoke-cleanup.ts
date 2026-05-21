/**
 * Remove smoke test artifacts from DB (does not touch felipe.e.salom@gmail.com content).
 *
 *   pnpm --filter api run smoke:cleanup              # dry-run
 *   pnpm --filter api run smoke:cleanup -- --confirm
 */

import { PrismaClient } from '@prisma/client';
import {
  cleanupSmokeArtifacts,
  countSmokeArtifacts,
  printSmokeCleanupSummary,
} from './lib/smoke-cleanup';

const prisma = new PrismaClient();

async function main() {
  const confirm = process.argv.includes('--confirm');
  const dryRun = !confirm;

  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SMOKE_CLEANUP !== 'true') {
    console.error('[smoke:cleanup] BLOCKED: NODE_ENV=production');
    console.error('Set ALLOW_PRODUCTION_SMOKE_CLEANUP=true only if intentional.');
    process.exit(1);
  }

  const counts = dryRun
    ? await countSmokeArtifacts(prisma)
    : await cleanupSmokeArtifacts(prisma, { dryRun: false });

  printSmokeCleanupSummary(counts, dryRun);

  if (dryRun) {
    console.log('\nDry-run only. Re-run with --confirm to delete.');
  } else {
    console.log('\nCleanup completed.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

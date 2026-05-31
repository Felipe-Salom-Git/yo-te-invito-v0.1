/**
 * Delete unreferenced GCS public objects (dry-run by default).
 *
 * Usage:
 *   pnpm --filter api run storage:cleanup-orphans              # dry-run
 *   pnpm --filter api run storage:cleanup-orphans -- --dry-run
 *   pnpm --filter api run storage:cleanup-orphans -- --confirm # deletes (review audit first!)
 *
 * Options:
 *   --min-age-hours=48   grace period for recent uploads (default 48)
 *   --limit=N            cap orphan scan (testing)
 *
 * Safety: only public/ in GCS_PUBLIC_BUCKET; skips young objects and unknown key layouts.
 */

import { PrismaClient } from '@prisma/client';
import {
  cleanupPublicBucketOrphans,
  parseOrphanCliOptions,
} from './lib/storage-orphans.util';

const prisma = new PrismaClient();

async function main() {
  const options = parseOrphanCliOptions(process.argv.slice(2));
  await cleanupPublicBucketOrphans(prisma, options);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

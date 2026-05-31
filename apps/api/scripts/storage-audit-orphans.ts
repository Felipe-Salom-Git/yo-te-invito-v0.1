/**
 * Read-only audit: GCS public bucket objects not referenced in PostgreSQL image fields.
 *
 * Usage:
 *   pnpm --filter api run storage:audit-orphans
 *   pnpm --filter api run storage:audit-orphans -- --min-age-hours=24 --limit=50
 *
 * Requires GCS_PUBLIC_BUCKET + credentials + DATABASE_URL.
 * Only lists gs://{GCS_PUBLIC_BUCKET}/public/* — never yti-prod-storage or backups/.
 */

import { PrismaClient } from '@prisma/client';
import {
  auditPublicBucketOrphans,
  parseOrphanCliOptions,
  printOrphanAuditReport,
} from './lib/storage-orphans.util';

const prisma = new PrismaClient();

async function main() {
  const options = parseOrphanCliOptions(process.argv.slice(2));
  const summary = await auditPublicBucketOrphans(prisma, options);
  printOrphanAuditReport(summary);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

/**
 * Migrate data:image/ URLs to GCS public URLs (dry-run by default).
 *
 * Usage:
 *   pnpm --filter api run storage:migrate-data-urls              # dry-run (default)
 *   pnpm --filter api run storage:migrate-data-urls -- --dry-run
 *   pnpm --filter api run storage:migrate-data-urls -- --confirm # apply (backup DB first!)
 *
 * Options:
 *   --tenant=tenant-demo   limit to one tenant
 *   --limit=N              cap findings processed (testing)
 *
 * Requires GCS_PUBLIC_BUCKET + credentials for --confirm.
 * Does not delete GCS objects or DB rows. Does not log base64.
 */

import { PrismaClient } from '@prisma/client';
import { migrateDataUrlFields, parseCliOptions } from './lib/storage-data-url.util';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--dry-run')) {
    // explicit dry-run flag (default anyway when --confirm absent)
  }
  const { tenantId, limit, confirm } = parseCliOptions(args);

  if (confirm) {
    console.warn('⚠️  --confirm will UPLOAD to GCS and UPDATE PostgreSQL.');
    console.warn('⚠️  Take a manual DB backup before continuing.\n');
  }

  await migrateDataUrlFields(prisma, { tenantId, limit, confirm });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

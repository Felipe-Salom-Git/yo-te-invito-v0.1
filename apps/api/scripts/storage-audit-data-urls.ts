/**
 * Read-only audit: detect data:image/ URLs in image fields (events, profiles, gastro, hotel, etc.).
 * Does not modify DB or GCS. Does not print base64 payloads.
 *
 * Usage:
 *   pnpm --filter api run storage:audit-data-urls
 *   pnpm --filter api run storage:audit-data-urls -- --tenant=tenant-demo
 *   pnpm --filter api run storage:audit-data-urls -- --limit=20
 */

import { PrismaClient } from '@prisma/client';
import {
  parseCliOptions,
  printAuditReport,
  scanDataUrlFields,
} from './lib/storage-data-url.util';

const prisma = new PrismaClient();

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const summary = await scanDataUrlFields(prisma, options);
  printAuditReport(summary);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

/**
 * Idempotent legal document catalog for tenant-demo.
 * Run: pnpm --filter api run seed:legal-documents
 */

import { PrismaClient } from '@prisma/client';
import { seedLegalDocumentsForTenant } from '../src/modules/legal/legal-documents.seed';

const prisma = new PrismaClient();
const TENANT_ID = process.env.LEGAL_SEED_TENANT_ID ?? 'tenant-demo';

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  if (!tenant) {
    console.error(`Tenant not found: ${TENANT_ID}`);
    process.exit(1);
  }

  const admin = await prisma.user.findFirst({
    where: { tenantId: TENANT_ID, role: 'ADMIN', deletedAt: null },
    select: { id: true },
  });

  const result = await seedLegalDocumentsForTenant(prisma, TENANT_ID, {
    auditActorId: admin?.id ?? 'seed-legal-documents',
    auditActorRole: admin ? 'ADMIN' : 'SYSTEM',
  });

  console.log(
    `Legal documents seed for ${TENANT_ID}: created=${result.created}, skipped=${result.skipped}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

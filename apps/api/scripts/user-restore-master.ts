/**
 * Enable all portal profiles + ADMIN for the master user (idempotent).
 * Run: pnpm --filter api run user:restore-master
 */

import { PrismaClient } from '@prisma/client';
import { enableMasterUserProfiles } from './lib/enable-master-user-profiles';

const EMAIL = (process.env.TEST_USER_EMAIL ?? 'felipe.e.salom@gmail.com').trim().toLowerCase();
const TENANT_ID = process.env.TENANT_ID ?? 'tenant-demo';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { tenantId: TENANT_ID, email: EMAIL, deletedAt: null },
  });

  if (!user) {
    console.error(`User not found: ${EMAIL}. Create the account first (register or manual).`);
    process.exit(1);
  }

  await enableMasterUserProfiles(prisma, {
    tenantId: TENANT_ID,
    userId: user.id,
    email: EMAIL,
  });

  console.log('\nDone. Mis Tickets is always available via USER base account.');
  console.log('Login at /login → /profiles → choose portal.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

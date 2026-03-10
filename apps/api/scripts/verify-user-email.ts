/**
 * Manually verify a user's email (bypass email link).
 * Run: cd apps/api && npx tsx scripts/verify-user-email.ts <email>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim()?.toLowerCase();
  if (!email) {
    console.log('Usage: npx tsx scripts/verify-user-email.ts <email>');
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
  });

  if (!user) {
    console.log(`Usuario no encontrado: ${email}`);
    process.exit(1);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    }),
    prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } }),
  ]);

  console.log(`Email verificado manualmente: ${email}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

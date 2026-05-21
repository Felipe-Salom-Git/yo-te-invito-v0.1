/**
 * Reset user password.
 * Run: pnpm --filter api run user:reset-password -- <email> <newPassword>
 */

import { PrismaClient } from '@prisma/client';
import { hashPassword } from './lib/password-crypto';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim()?.toLowerCase();
  const newPassword = process.argv[3];
  if (!email || !newPassword) {
    console.log('Usage: pnpm --filter api run user:reset-password -- <email> <newPassword>');
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
  });

  if (!user) {
    console.log(`Usuario no encontrado: ${email}`);
    process.exit(1);
  }

  const passwordHash = hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  console.log(`Contraseña actualizada para: ${email}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

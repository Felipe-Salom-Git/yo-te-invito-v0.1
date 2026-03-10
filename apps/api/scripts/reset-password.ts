/**
 * Reset user password.
 * Run: cd apps/api && npx tsx scripts/reset-password.ts <email> <newPassword>
 */

import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt.toString('hex')}:${hash}`;
}

async function main() {
  const email = process.argv[2]?.trim()?.toLowerCase();
  const newPassword = process.argv[3];
  if (!email || !newPassword) {
    console.log('Usage: npx tsx scripts/reset-password.ts <email> <newPassword>');
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

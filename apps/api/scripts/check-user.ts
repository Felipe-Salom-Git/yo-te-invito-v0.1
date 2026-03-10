/**
 * Check user by email and optionally verify them.
 * Run: cd apps/api && npx tsx scripts/check-user.ts <email>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim()?.toLowerCase();
  if (!email) {
    console.log('Usage: npx tsx scripts/check-user.ts <email>');
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  if (!user) {
    console.log(`Usuario no encontrado: ${email}`);
    const similar = await prisma.user.findMany({
      where: { email: { contains: email.split('@')[0], mode: 'insensitive' }, deletedAt: null },
      select: { email: true },
    });
    if (similar.length > 0) {
      console.log('Emails similares:', similar.map((u) => u.email).join(', '));
    }
    process.exit(1);
  }

  console.log('Usuario encontrado:');
  console.log(JSON.stringify(user, null, 2));
  console.log('\nEstado:', user.emailVerified ? 'Email verificado' : 'Email NO verificado');

  const token = await prisma.emailVerificationToken.findUnique({
    where: { userId: user.id },
  });
  if (token) {
    console.log('Token de verificación:', token.expiresAt < new Date() ? 'EXPIRADO' : 'Pendiente');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

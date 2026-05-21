/**
 * Inspect user by email (status, verification token, optional password check).
 * Run: pnpm --filter api run user:inspect -- <email> [--verify-password <pass>]
 */

import { PrismaClient } from '@prisma/client';
import { describePasswordHash, hashPassword, verifyPassword } from './lib/password-crypto';

const prisma = new PrismaClient();

function parseArgs(argv: string[]): { email?: string; passwords: string[] } {
  const passwords: string[] = [];
  let email: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--verify-password' && argv[i + 1]) {
      passwords.push(argv[++i]);
    } else if (!arg.startsWith('--')) {
      email = arg.trim().toLowerCase();
    }
  }

  return { email, passwords };
}

async function main() {
  const { email, passwords } = parseArgs(process.argv.slice(2));
  if (!email) {
    console.log('Usage: pnpm --filter api run user:inspect -- <email> [--verify-password <pass>]');
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
      passwordHash: true,
      tenantId: true,
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

  const { passwordHash, ...publicUser } = user;
  console.log('Usuario encontrado:');
  console.log(JSON.stringify(publicUser, null, 2));
  console.log('\nEstado:', user.emailVerified ? 'Email verificado' : 'Email NO verificado');

  const hashInfo = describePasswordHash(passwordHash);
  console.log(
    'Password hash:',
    hashInfo.present
      ? `length=${hashInfo.length}, format=${hashInfo.formatOk ? 'salt:hash OK' : 'INVALID'}`
      : 'missing',
  );

  const selfTest = hashPassword('__smoke_self_test__');
  console.log('Crypto self-test:', verifyPassword('__smoke_self_test__', selfTest) ? 'OK' : 'FAIL');

  for (const pass of passwords) {
    const ok = passwordHash ? verifyPassword(pass, passwordHash) : false;
    console.log(`Verify password "${pass.replace(/./g, '*')}":`, ok ? 'MATCH' : 'no match');
  }

  const token = await prisma.emailVerificationToken.findUnique({
    where: { userId: user.id },
  });
  if (token) {
    console.log('Token de verificación:', token.expiresAt < new Date() ? 'EXPIRADO' : 'Pendiente');
  }

  const maskedDb = process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@');
  if (maskedDb) console.log('DB:', maskedDb);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

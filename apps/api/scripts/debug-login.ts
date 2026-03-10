/**
 * Debug: verify user exists and password hash format.
 * Run: cd apps/api && npx tsx scripts/debug-login.ts felipe.e.salom@gmail.com
 */

import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [saltHex, hashHex] = storedHash.split(':');
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const hash = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(hash, Buffer.from(hashHex, 'hex'));
}

async function main() {
  const email = process.argv[2]?.trim()?.toLowerCase() || 'felipe.e.salom@gmail.com';

  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
  });

  if (!user) {
    console.log('Usuario no encontrado');
    process.exit(1);
  }

  console.log('User:', user.email, '| passwordHash length:', user.passwordHash?.length ?? 0);
  console.log('Hash format:', user.passwordHash?.includes(':') ? 'salt:hash OK' : 'INVALID');
  const testHash = hashPassword('demo');
  console.log('Self-test (hash then verify demo):', verifyPassword('demo', testHash));
  console.log('Verify "demo" vs stored:', user.passwordHash ? verifyPassword('demo', user.passwordHash) : false);
  console.log('Verify "12361224":', user.passwordHash ? verifyPassword('12361224', user.passwordHash) : false);
  console.log('DB:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

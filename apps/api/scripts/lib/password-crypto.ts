import * as crypto from 'crypto';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt.toString('hex')}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [saltHex, hashHex] = storedHash.split(':');
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const hash = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(hash, Buffer.from(hashHex, 'hex'));
}

export function describePasswordHash(storedHash: string | null | undefined): {
  present: boolean;
  formatOk: boolean;
  length: number;
} {
  const length = storedHash?.length ?? 0;
  const formatOk = Boolean(storedHash?.includes(':'));
  return { present: length > 0, formatOk, length };
}

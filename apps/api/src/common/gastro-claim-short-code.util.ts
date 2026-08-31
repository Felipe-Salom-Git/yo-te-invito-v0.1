import { randomInt } from 'crypto';
import { normalizeManualShortCode } from '@yo-te-invito/shared';

/** Unambiguous uppercase charset (no 0/O, 1/I). */
const CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/** Generate a 6-char gastro claim short code (stored normalized, display with hyphen). */
export function generateGastroClaimShortCode(): string {
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += CHARSET[randomInt(0, CHARSET.length)]!;
  }
  return out;
}

export function formatGastroClaimShortCodeForDisplay(stored: string): string {
  const normalized = normalizeManualShortCode(stored);
  if (normalized.length === 6) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
  }
  return normalized;
}

type ShortCodeLookup = {
  gastroDiscountClaim: {
    findUnique(args: {
      where: { shortCode: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
};

export async function allocateGastroClaimShortCode(db: ShortCodeLookup): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt++) {
    const code = generateGastroClaimShortCode();
    const existing = await db.gastroDiscountClaim.findUnique({
      where: { shortCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error('Failed to allocate unique gastro claim short code');
}

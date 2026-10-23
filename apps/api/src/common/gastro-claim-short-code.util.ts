import { randomInt } from 'crypto';
import { Prisma } from '@prisma/client';
import { normalizeManualShortCode } from '@yo-te-invito/shared';

/** Unambiguous uppercase charset (no 0/O, 1/I). 32 symbols. */
export const GASTRO_CLAIM_SHORT_CODE_CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/** Length of newly generated short codes. Legacy codes (hex, > 6 chars) are never rewritten. */
export const GASTRO_CLAIM_SHORT_CODE_LENGTH = 6;

/** Generate a 6-char gastro claim short code (stored normalized, display with hyphen). */
export function generateGastroClaimShortCode(): string {
  let out = '';
  for (let i = 0; i < GASTRO_CLAIM_SHORT_CODE_LENGTH; i++) {
    out += GASTRO_CLAIM_SHORT_CODE_CHARSET[randomInt(0, GASTRO_CLAIM_SHORT_CODE_CHARSET.length)]!;
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

/**
 * Generate a code and pre-check it is free. The pre-check only lowers the collision rate:
 * the `@unique` constraint is the real authority (see `retryOnShortCodeCollision`).
 */
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

// ---------------------------------------------------------------------------
// G8.6 — P2002 retry on shortCode collisions
// ---------------------------------------------------------------------------

/** Bounded: with a 32^6 (~1.07e9) space a real collision is rare; never retry forever. */
export const GASTRO_CLAIM_SHORT_CODE_MAX_ATTEMPTS = 5;

export class GastroShortCodeCollisionError extends Error {
  constructor(readonly attempts: number) {
    super(`Could not create a claim with a unique short code after ${attempts} attempts`);
    this.name = 'GastroShortCodeCollisionError';
  }
}

/**
 * True only when `err` is a Prisma unique violation (P2002) whose violated constraint is the
 * claim `shortCode`. Any other unique conflict (qrToken, accessToken, `(discountId, email)`,
 * `(courtesyCampaignId, email)`, …) is NOT a short-code collision and must propagate.
 *
 * Prisma reports `meta.target` as the list of fields (`['shortCode']`) or, on some
 * drivers/versions, as the constraint name (`GastroDiscountClaim_shortCode_key`).
 */
export function isShortCodeUniqueViolation(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') {
    return false;
  }
  const target = (err.meta as { target?: unknown } | undefined)?.target;
  if (Array.isArray(target)) {
    return target.length === 1 && target[0] === 'shortCode';
  }
  if (typeof target === 'string') {
    return /(^|_)shortCode(_|$)/i.test(target) && !/email|discountId|courtesyCampaignId/i.test(target);
  }
  return false;
}

/**
 * Run `operation` and, if it fails because the generated `shortCode` collided with an existing
 * one (P2002 on `shortCode` only), run it again so it generates a NEW code.
 *
 * `operation` must be safe to re-run from scratch: a single insert, or a whole `$transaction`
 * (a failed statement aborts a Postgres transaction, so retrying inside it is impossible —
 * the retry has to wrap the transaction). Other errors are rethrown untouched.
 */
export async function retryOnShortCodeCollision<T>(
  operation: (attempt: number) => Promise<T>,
  maxAttempts: number = GASTRO_CLAIM_SHORT_CODE_MAX_ATTEMPTS,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation(attempt);
    } catch (err) {
      if (!isShortCodeUniqueViolation(err)) throw err;
      if (attempt === maxAttempts) throw new GastroShortCodeCollisionError(maxAttempts);
    }
  }
  /* istanbul ignore next — loop always returns or throws */
  throw new GastroShortCodeCollisionError(maxAttempts);
}

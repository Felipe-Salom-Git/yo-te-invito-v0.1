/**
 * Benefit settlement money — BigInt cents as string in API/JSON (no float source of truth).
 * Legacy Payment/Payout remain Int; new settlement domain uses wider range.
 */

import { z } from 'zod';

/** Int32 max in cents — legacy Int columns; new domain must exceed this. */
export const LEGACY_INT32_MAX_CENTS = 2_147_483_647n;

export const moneyCentsStringSchema = z
  .string()
  .regex(/^\d+$/, 'money cents must be a non-negative integer string');

export type MoneyCentsString = z.infer<typeof moneyCentsStringSchema>;

export function parseMoneyCentsString(value: string): bigint {
  const parsed = moneyCentsStringSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error('invalid money cents string');
  }
  return BigInt(parsed.data);
}

export function moneyCentsToString(value: bigint): string {
  if (value < 0n) {
    throw new Error('money cents cannot be negative');
  }
  return value.toString();
}

export function assertPositiveMoneyCentsString(value: string): bigint {
  const cents = parseMoneyCentsString(value);
  if (cents <= 0n) {
    throw new Error('money cents must be positive');
  }
  return cents;
}

/** API input — string only to avoid JSON number precision loss. */
export const benefitUnitPriceCentsInputSchema = moneyCentsStringSchema.refine(
  (v) => {
    try {
      return BigInt(v) > 0n;
    } catch {
      return false;
    }
  },
  { message: 'unitPriceCents must be a positive integer string' },
);

export const barterMultiplierInputSchema = z
  .string()
  .regex(/^\d+(\.\d{1,4})?$/, 'barterMultiplier must have up to 4 decimal places')
  .refine((v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0;
  }, 'barterMultiplier must be positive');

/**
 * creditCents = roundHalfUp(unitPriceCents × barterMultiplier)
 * Multiplier parsed exactly (up to 4 decimal places), no float arithmetic on cents.
 */
export function roundBarterCreditCents(unitPriceCents: bigint, barterMultiplier: string): bigint {
  const match = barterMultiplier.match(/^(\d+)(?:\.(\d{1,4}))?$/);
  if (!match) {
    throw new Error('invalid barter multiplier');
  }
  const whole = match[1]!;
  const frac = (match[2] ?? '').padEnd(4, '0').slice(0, 4);
  const multiplierScaled = BigInt(`${whole}${frac}`);
  const product = unitPriceCents * multiplierScaled;
  return (product + 5000n) / 10000n;
}

/** Display ARS from cents string (safe for values beyond Number.MAX_SAFE_INTEGER pesos). */
export function formatBenefitMoneyCents(cents: string, currency = 'ARS'): string {
  const n = parseMoneyCentsString(cents);
  const pesos = n / 100n;
  if (pesos <= BigInt(Number.MAX_SAFE_INTEGER)) {
    return Number(pesos).toLocaleString('es-AR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    });
  }
  const grouped = pesos.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$ ${grouped}`;
}

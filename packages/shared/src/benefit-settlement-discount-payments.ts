/**
 * G10.D — exact CASH payments per GastroDiscount inside one settlement (pure, no DB).
 * EN: a GASTRO transfer is attributed to exactly one discount; its capacity is the CASH base of
 *     that discount's allocations in the settlement. Never prorated, never inferred.
 * ES: una transferencia GASTRO se atribuye a un único descuento; su tope es la base CASH de las
 *     asignaciones de ese descuento en la liquidación. Nunca se prorratea ni se infiere.
 */

import type { BenefitVertical } from './benefit-commercial-agreements';
import { computeCashOutstandingCents } from './benefit-settlement';

/** EXACT = transfer with `gastroDiscountId`; SETTLEMENT_LEVEL = legacy transfer without discount. */
export const BENEFIT_TRANSFER_ATTRIBUTIONS = ['EXACT', 'SETTLEMENT_LEVEL'] as const;
export type BenefitTransferAttribution = (typeof BENEFIT_TRANSFER_ATTRIBUTIONS)[number];

export const BENEFIT_TRANSFER_ATTRIBUTION_LABEL: Record<BenefitTransferAttribution, string> = {
  EXACT: 'Atribuido al descuento',
  SETTLEMENT_LEVEL: 'Pago legacy sin atribución',
};

export function resolveBenefitTransferAttribution(
  gastroDiscountId: string | null | undefined,
): BenefitTransferAttribution {
  return gastroDiscountId ? 'EXACT' : 'SETTLEMENT_LEVEL';
}

/**
 * D-G10-7 — new GASTRO transfers must name a discount; ACTIVITY transfers never do.
 * Legacy rows without discount stay valid (this only gates the write path).
 */
export type BenefitTransferDiscountRequirement = 'OK' | 'DISCOUNT_REQUIRED' | 'DISCOUNT_NOT_ALLOWED';

export function resolveBenefitTransferDiscountRequirement(
  vertical: BenefitVertical,
  gastroDiscountId: string | null | undefined,
): BenefitTransferDiscountRequirement {
  if (vertical === 'GASTRO') return gastroDiscountId ? 'OK' : 'DISCOUNT_REQUIRED';
  return gastroDiscountId ? 'DISCOUNT_NOT_ALLOWED' : 'OK';
}

/** discountCashDue(S, D) = Σ baseAmountCents of CASH allocations of S whose validation belongs to D. */
export function computeDiscountCashDueCents(
  allocations: ReadonlyArray<{ mode: string; baseAmountCents: bigint; validationId: string }>,
  discountValidationIds: ReadonlySet<string>,
): bigint {
  let total = 0n;
  for (const allocation of allocations) {
    if (allocation.mode === 'CASH' && discountValidationIds.has(allocation.validationId)) {
      total += allocation.baseAmountCents;
    }
  }
  return total;
}

/** Active transfers of S attributed to D (reversed transfers restore capacity automatically). */
export function computeDiscountCashPaidCents(
  transfers: ReadonlyArray<{ amountCents: bigint; reversedAt?: Date | null; gastroDiscountId?: string | null }>,
  discountId: string,
): bigint {
  let total = 0n;
  for (const transfer of transfers) {
    if (transfer.reversedAt == null && transfer.gastroDiscountId === discountId) {
      total += transfer.amountCents;
    }
  }
  return total;
}

export function assertDiscountTransferWouldNotOverpay(
  discountCashDueCents: bigint,
  discountCashPaidCents: bigint,
  transferAmountCents: bigint,
): boolean {
  return discountCashPaidCents + transferAmountCents <= discountCashDueCents;
}

/**
 * Max amount the UI may offer: discount remaining, also capped by the settlement outstanding
 * (legacy unattributed transfers can leave the settlement with less room than the discount).
 */
export function resolveDiscountTransferMaxCents(input: {
  discountCashDueCents: bigint;
  discountCashPaidCents: bigint;
  settlementCashOutstandingCents: bigint;
}): bigint {
  const discountRemaining = computeCashOutstandingCents(
    input.discountCashDueCents,
    input.discountCashPaidCents,
  );
  return discountRemaining < input.settlementCashOutstandingCents
    ? discountRemaining
    : input.settlementCashOutstandingCents;
}

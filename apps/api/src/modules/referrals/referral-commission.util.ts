import type { ReferralCommissionType } from '@prisma/client';

export type OrderItemSubtotalInput = {
  subtotalMajor: number;
  quantity: number;
};

export type CommissionCalcInput = {
  commissionType: ReferralCommissionType;
  /** PERCENTAGE: 0–100. FIXED_PER_TICKET: centavos por entrada. */
  commissionValue: number;
  orderItems: OrderItemSubtotalInput[];
  /** Entradas VALID (no revocadas) contabilizadas para el cálculo. */
  validTicketCount: number;
};

export type CommissionCalcResult = {
  attributedSubtotalCents: number;
  ticketQuantity: number;
  amountCents: number;
};

/** Montos de Order/OrderItem están en unidades mayores (ARS, 2 decimales). */
export function majorUnitsToCents(major: number): number {
  return Math.round(major * 100);
}

export function sumAttributedSubtotalCents(items: OrderItemSubtotalInput[]): number {
  return items.reduce((sum, item) => sum + majorUnitsToCents(item.subtotalMajor), 0);
}

/**
 * Calcula comisión generada según acuerdo V2.
 * Retorna null si no hay entradas válidas o monto <= 0.
 */
export function calculateReferralCommissionAmount(
  input: CommissionCalcInput,
): CommissionCalcResult | null {
  const attributedSubtotalCents = sumAttributedSubtotalCents(input.orderItems);

  if (input.validTicketCount <= 0) {
    return null;
  }

  let amountCents = 0;

  if (input.commissionType === 'PERCENTAGE') {
    if (attributedSubtotalCents <= 0) return null;
    amountCents = Math.round((attributedSubtotalCents * input.commissionValue) / 100);
  } else {
    if (!Number.isInteger(input.commissionValue) || input.commissionValue <= 0) {
      return null;
    }
    amountCents = input.validTicketCount * input.commissionValue;
  }

  if (amountCents <= 0) return null;

  return {
    attributedSubtotalCents,
    ticketQuantity: input.validTicketCount,
    amountCents,
  };
}

/** Idempotencia V2: una comisión por atribución u orden. */
export function isExistingCommissionForAttributionOrOrder(
  existing:
    | { referralAttributionId: string | null; orderId: string | null }
    | null
    | undefined,
  attributionId: string,
  orderId: string,
): boolean {
  if (!existing) return false;
  return existing.referralAttributionId === attributionId || existing.orderId === orderId;
}

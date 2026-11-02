/**
 * G10.C — canonical economic summary of ONE GastroDiscount (pure domain, no I/O).
 *
 * EN: Every figure is computed from persisted rows only. CASH generated = Σ CASH allocations of the
 *     discount's validations; CASH paid = Σ active transfers attributed to the discount
 *     (`gastroDiscountId`). Legacy transfers without discount are never distributed: they only
 *     degrade `remainingPrecision` to SETTLEMENT_LEVEL. CASH and barter credit are never summed.
 * ES: Cada cifra sale de filas persistidas. CASH generado = Σ allocations CASH de las validaciones
 *     del descuento; CASH pagado = Σ transferencias activas atribuidas al descuento. Las
 *     transferencias legacy sin descuento nunca se prorratean: solo bajan la precisión del
 *     pendiente a SETTLEMENT_LEVEL. CASH y crédito de canje nunca se suman.
 */

import {
  computeCashDueCents,
  computeCashOutstandingCents,
  computeCashReceivedCents,
  deriveCashCollectionStatus,
  resolveSettlementAgreementForValidation,
  type BenefitCashCollectionStatus,
} from './benefit-settlement';
import type { BenefitAgreementLike } from './benefit-commercial-agreements';
import { moneyCentsToString } from './money/benefit-money';

export const GASTRO_DISCOUNT_ECONOMIC_PRECISIONS = [
  'EXACT',
  'SETTLEMENT_LEVEL',
  'PARTNER_LEVEL',
  'PARTNER_LEVEL_LEGACY',
  'NOT_ATTRIBUTABLE',
] as const;
export type GastroDiscountEconomicPrecision = (typeof GASTRO_DISCOUNT_ECONOMIC_PRECISIONS)[number];

/** Precision of `cash.remainingCents` (and of each settlement line). */
export const GASTRO_DISCOUNT_CASH_REMAINING_PRECISIONS = ['EXACT', 'SETTLEMENT_LEVEL'] as const;
export type GastroDiscountCashRemainingPrecision =
  (typeof GASTRO_DISCOUNT_CASH_REMAINING_PRECISIONS)[number];

export const GASTRO_DISCOUNT_ECONOMIC_AUDIENCES = ['ADMIN', 'GASTRO'] as const;
export type GastroDiscountEconomicAudience = (typeof GASTRO_DISCOUNT_ECONOMIC_AUDIENCES)[number];

export type DiscountEconomicValidationInput = {
  id: string;
  claimId: string | null;
  validatedAt: Date;
};

export type DiscountEconomicAllocationInput = {
  id: string;
  settlementId: string;
  validationId: string;
  mode: string;
  baseAmountCents: bigint;
};

export type DiscountEconomicTransferInput = {
  id: string;
  gastroDiscountId: string | null;
  amountCents: bigint;
  reversedAt: Date | null;
};

export type DiscountEconomicSettlementInput = {
  id: string;
  periodKey: string;
  status: string;
  /** Every allocation of the settlement (all discounts of the local). */
  allocations: ReadonlyArray<DiscountEconomicAllocationInput>;
  /** Every transfer of the settlement (attributed and legacy, active and reversed). */
  transfers: ReadonlyArray<DiscountEconomicTransferInput>;
};

export type DiscountEconomicValidationCounts = {
  total: number;
  billable: number;
  fundedCourtesy: number;
  allocated: number;
  pending: number;
  pendingWithoutAgreement: number;
};

/**
 * Settlement boundary = validations with claim (master-QR validations are never billable).
 * Funded courtesy (D1): operational usage only, so pending / pendingWithoutAgreement stay 0.
 */
export function countDiscountEconomicValidations(input: {
  validations: ReadonlyArray<DiscountEconomicValidationInput>;
  allocatedValidationIds: ReadonlySet<string>;
  billable: boolean;
  /** Discount-scoped agreements only (legacy rows never price new usage). */
  agreements: ReadonlyArray<BenefitAgreementLike>;
}): DiscountEconomicValidationCounts {
  const claimed = input.validations.filter((v) => v.claimId != null);
  const allocated = claimed.filter((v) => input.allocatedValidationIds.has(v.id)).length;
  if (!input.billable) {
    return {
      total: claimed.length,
      billable: 0,
      fundedCourtesy: claimed.length,
      allocated,
      pending: 0,
      pendingWithoutAgreement: 0,
    };
  }
  const pending = claimed.filter((v) => !input.allocatedValidationIds.has(v.id));
  const agreements = [...input.agreements];
  const withoutAgreement = pending.filter(
    (v) => resolveSettlementAgreementForValidation(agreements, v.validatedAt) == null,
  ).length;
  return {
    total: claimed.length,
    billable: claimed.length,
    fundedCourtesy: 0,
    allocated,
    pending: pending.length,
    pendingWithoutAgreement: withoutAgreement,
  };
}

export type DiscountEconomicSettlementLine = {
  settlementId: string;
  periodKey: string;
  status: string;
  /** Discount-level (EXACT). */
  discountUsageCount: number;
  discountCashDueCents: string;
  discountCashPaidCents: string;
  discountCashRemainingCents: string;
  discountCollectionStatus: BenefitCashCollectionStatus;
  discountBarterBaseCents: string;
  /** Settlement-level (SETTLEMENT_LEVEL): the whole local + period, never exclusive to the discount. */
  settlementCashDueCents: string;
  settlementCashReceivedCents: string;
  settlementCashOutstandingCents: string;
  unattributedReceivedCents: string;
  containsOtherDiscounts: boolean;
  hasUnattributedTransfers: boolean;
  remainingPrecision: GastroDiscountCashRemainingPrecision;
};

function sumBase(rows: ReadonlyArray<DiscountEconomicAllocationInput>, mode: string): bigint {
  return rows.filter((a) => a.mode === mode).reduce((acc, a) => acc + a.baseAmountCents, 0n);
}

function activeTransfers(rows: ReadonlyArray<DiscountEconomicTransferInput>) {
  return rows.filter((t) => t.reversedAt == null);
}

/**
 * One line per given settlement. Callers pass only settlements where the discount has
 * allocations or attributed transfers.
 */
export function buildDiscountSettlementLines(input: {
  discountId: string;
  discountAllocationIds: ReadonlySet<string>;
  settlements: ReadonlyArray<DiscountEconomicSettlementInput>;
}): DiscountEconomicSettlementLine[] {
  return input.settlements
    .map((s) => {
      const own = s.allocations.filter((a) => input.discountAllocationIds.has(a.id));
      const ownTransfers = s.transfers.filter((t) => t.gastroDiscountId === input.discountId);
      const unattributed = activeTransfers(s.transfers).filter((t) => t.gastroDiscountId == null);
      const due = computeCashDueCents(own);
      const paid = computeCashReceivedCents(ownTransfers);
      const settlementDue = computeCashDueCents(s.allocations);
      const settlementReceived = computeCashReceivedCents(s.transfers);
      const unattributedReceived = computeCashReceivedCents(unattributed);
      const hasUnattributed = unattributed.length > 0;
      return {
        settlementId: s.id,
        periodKey: s.periodKey,
        status: s.status,
        discountUsageCount: own.length,
        discountCashDueCents: moneyCentsToString(due),
        discountCashPaidCents: moneyCentsToString(paid),
        discountCashRemainingCents: moneyCentsToString(computeCashOutstandingCents(due, paid)),
        discountCollectionStatus: deriveCashCollectionStatus(due, paid),
        discountBarterBaseCents: moneyCentsToString(sumBase(own, 'BARTER')),
        settlementCashDueCents: moneyCentsToString(settlementDue),
        settlementCashReceivedCents: moneyCentsToString(settlementReceived),
        settlementCashOutstandingCents: moneyCentsToString(
          computeCashOutstandingCents(settlementDue, settlementReceived),
        ),
        unattributedReceivedCents: moneyCentsToString(unattributedReceived),
        containsOtherDiscounts: s.allocations.some((a) => !input.discountAllocationIds.has(a.id)),
        hasUnattributedTransfers: hasUnattributed,
        remainingPrecision: (hasUnattributed && due > 0n
          ? 'SETTLEMENT_LEVEL'
          : 'EXACT') as GastroDiscountCashRemainingPrecision,
      };
    })
    .sort((a, b) => b.periodKey.localeCompare(a.periodKey) || a.settlementId.localeCompare(b.settlementId));
}

export type DiscountEconomicCash = {
  usageCount: number;
  generatedCents: string;
  paidCents: string;
  remainingCents: string;
  remainingPrecision: GastroDiscountCashRemainingPrecision;
  unattributedSettlementReceivedCents: string;
};

/**
 * remaining = generated − exact attributed payments (never prorated). SETTLEMENT_LEVEL when a
 * settlement where the discount owes CASH also holds active transfers without discount.
 */
export function summarizeDiscountCash(input: {
  allocations: ReadonlyArray<DiscountEconomicAllocationInput>;
  lines: ReadonlyArray<DiscountEconomicSettlementLine>;
}): DiscountEconomicCash {
  const cashRows = input.allocations.filter((a) => a.mode === 'CASH');
  const generated = sumBase(cashRows, 'CASH');
  const paid = input.lines.reduce((acc, l) => acc + BigInt(l.discountCashPaidCents), 0n);
  const degraded = input.lines.filter((l) => l.remainingPrecision === 'SETTLEMENT_LEVEL');
  const unattributed = degraded.reduce((acc, l) => acc + BigInt(l.unattributedReceivedCents), 0n);
  return {
    usageCount: cashRows.length,
    generatedCents: moneyCentsToString(generated),
    paidCents: moneyCentsToString(paid),
    remainingCents: moneyCentsToString(computeCashOutstandingCents(generated, paid)),
    remainingPrecision: degraded.length > 0 ? 'SETTLEMENT_LEVEL' : 'EXACT',
    unattributedSettlementReceivedCents: moneyCentsToString(unattributed),
  };
}

export type DiscountEconomicBarter = {
  usageCount: number;
  baseCents: string;
  /** Ledger CREDIT_FROM_SETTLEMENT of these allocations (net of reversals), never recomputed. */
  creditGeneratedCents: string;
};

export function summarizeDiscountBarter(input: {
  allocations: ReadonlyArray<DiscountEconomicAllocationInput>;
  ledgerCreditGeneratedCents: bigint;
}): DiscountEconomicBarter {
  const barterRows = input.allocations.filter((a) => a.mode === 'BARTER');
  return {
    usageCount: barterRows.length,
    baseCents: moneyCentsToString(sumBase(barterRows, 'BARTER')),
    creditGeneratedCents: moneyCentsToString(input.ledgerCreditGeneratedCents),
  };
}

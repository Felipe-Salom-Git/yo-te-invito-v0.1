import type { BenefitSettlementAllocationMode } from './benefit-settlement';
import { roundBarterCreditCents } from './money/benefit-money';

/**
 * G7.12 — Admin settlement operations helpers (presentation only, no persistence).
 * Helpers de operación de liquidaciones (solo presentación).
 */

export type SettlementAllocationLike = {
  mode: BenefitSettlementAllocationMode | string;
  agreementId: string;
  unitPriceCents: string;
  barterMultiplier: string;
  baseAmountCents: string;
  creditMaterializedCents?: string | null;
};

/** Allocations sharing one agreement snapshot (EXACT level). */
export type SettlementRateSegment = {
  agreementId: string;
  unitPriceCents: string;
  barterMultiplier: string;
  usageCount: number;
  baseAmountCents: string;
  /** BARTER only: Σ round(base × multiplier) per allocation. */
  creditExpectedCents: string;
  /** BARTER only: Σ ledger CREDIT_FROM_SETTLEMENT linked to these allocations. */
  creditMaterializedCents: string;
};

/**
 * Groups allocations of one mode by snapshot (agreementId + unit price + multiplier).
 * Agrupa por snapshot de tarifa; nunca usa el agreement actual.
 */
export function groupSettlementAllocationsByRate(
  allocations: readonly SettlementAllocationLike[],
  mode: BenefitSettlementAllocationMode,
): SettlementRateSegment[] {
  const segments = new Map<
    string,
    {
      agreementId: string;
      unitPriceCents: string;
      barterMultiplier: string;
      usageCount: number;
      base: bigint;
      creditExpected: bigint;
      creditMaterialized: bigint;
    }
  >();
  for (const a of allocations) {
    if (a.mode !== mode) continue;
    const key = `${a.agreementId}|${a.unitPriceCents}|${a.barterMultiplier}`;
    const seg = segments.get(key) ?? {
      agreementId: a.agreementId,
      unitPriceCents: a.unitPriceCents,
      barterMultiplier: a.barterMultiplier,
      usageCount: 0,
      base: 0n,
      creditExpected: 0n,
      creditMaterialized: 0n,
    };
    const base = BigInt(a.baseAmountCents);
    seg.usageCount += 1;
    seg.base += base;
    if (mode === 'BARTER') {
      seg.creditExpected += roundBarterCreditCents(base, a.barterMultiplier);
      seg.creditMaterialized += BigInt(a.creditMaterializedCents ?? '0');
    }
    segments.set(key, seg);
  }
  return [...segments.values()].map((s) => ({
    agreementId: s.agreementId,
    unitPriceCents: s.unitPriceCents,
    barterMultiplier: s.barterMultiplier,
    usageCount: s.usageCount,
    baseAmountCents: s.base.toString(),
    creditExpectedCents: s.creditExpected.toString(),
    creditMaterializedCents: s.creditMaterialized.toString(),
  }));
}

/** «×2» / «×1.5» from Decimal string (`2.0000` → `2`). */
export function formatBarterMultiplierLabel(multiplier: string): string {
  const [whole, frac = ''] = multiplier.split('.');
  const trimmed = frac.replace(/0+$/, '');
  return `×${trimmed ? `${whole}.${trimmed}` : whole}`;
}

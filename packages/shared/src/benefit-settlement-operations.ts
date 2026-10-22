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

export type PendingValidationLike = {
  validationId: string;
  benefitId: string;
  benefitTitle: string;
  unitPriceCents: string;
};

export type PendingValidationGroup<T extends PendingValidationLike> = {
  benefitId: string;
  benefitTitle: string;
  items: T[];
  baseAmountCents: string;
};

/**
 * Visual grouping by discount/coupon (UX only — settlement stays partner + period).
 * `focusBenefitId` (e.g. «Liquidar» from a discount) is listed first; others are kept.
 */
export function groupPendingValidationsByBenefit<T extends PendingValidationLike>(
  items: readonly T[],
  focusBenefitId?: string | null,
): PendingValidationGroup<T>[] {
  const groups = new Map<string, PendingValidationGroup<T>>();
  for (const item of items) {
    const group = groups.get(item.benefitId) ?? {
      benefitId: item.benefitId,
      benefitTitle: item.benefitTitle,
      items: [],
      baseAmountCents: '0',
    };
    group.items.push(item);
    group.baseAmountCents = (BigInt(group.baseAmountCents) + BigInt(item.unitPriceCents)).toString();
    groups.set(item.benefitId, group);
  }
  const list = [...groups.values()];
  if (!focusBenefitId) return list;
  return [
    ...list.filter((g) => g.benefitId === focusBenefitId),
    ...list.filter((g) => g.benefitId !== focusBenefitId),
  ];
}

export type AllocationSelectionResult<T extends { validationId: string }> =
  | { ok: true; selected: T[] }
  | { ok: false; reason: 'INSUFFICIENT'; available: number }
  | { ok: false; reason: 'NOT_PENDING'; invalidIds: string[] };

/**
 * Picks pending usages for allocate: `count` → oldest-first; `validationIds` → only ids
 * present in this settlement's pending list (anything else — other partner, other period,
 * already allocated — is rejected). Order of `pending` is preserved.
 */
export function selectPendingUsagesForAllocation<T extends { validationId: string }>(
  pending: readonly T[],
  request: { count?: number; validationIds?: readonly string[] },
): AllocationSelectionResult<T> {
  if (request.validationIds) {
    const wanted = new Set(request.validationIds);
    const pendingIds = new Set(pending.map((p) => p.validationId));
    const invalidIds = [...wanted].filter((id) => !pendingIds.has(id));
    if (invalidIds.length > 0) return { ok: false, reason: 'NOT_PENDING', invalidIds };
    return { ok: true, selected: pending.filter((p) => wanted.has(p.validationId)) };
  }
  const count = request.count ?? 0;
  if (count < 1 || pending.length < count) {
    return { ok: false, reason: 'INSUFFICIENT', available: pending.length };
  }
  return { ok: true, selected: pending.slice(0, count) };
}

/** Pre-confirm preview for a selection (non-authoritative; backend snapshots win). */
export function previewAllocationSelection(
  items: ReadonlyArray<{ unitPriceCents: string; barterMultiplier: string }>,
  mode: BenefitSettlementAllocationMode,
): { count: number; baseAmountCents: string; creditExpectedCents: string; unitPrices: string[] } {
  let base = 0n;
  let credit = 0n;
  for (const item of items) {
    const unit = BigInt(item.unitPriceCents);
    base += unit;
    if (mode === 'BARTER') credit += roundBarterCreditCents(unit, item.barterMultiplier);
  }
  return {
    count: items.length,
    baseAmountCents: base.toString(),
    creditExpectedCents: credit.toString(),
    unitPrices: [...new Set(items.map((i) => i.unitPriceCents))],
  };
}

/** «×2» / «×1.5» from Decimal string (`2.0000` → `2`). */
export function formatBarterMultiplierLabel(multiplier: string): string {
  const [whole, frac = ''] = multiplier.split('.');
  const trimmed = frac.replace(/0+$/, '');
  return `×${trimmed ? `${whole}.${trimmed}` : whole}`;
}

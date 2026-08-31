/**
 * Benefit settlement reporting — KPI aggregation (read-only, not source of truth).
 *
 * KPI sources:
 * - usageCount / baseGeneratedCents → settlement eligible usages (summary)
 * - cashAllocatedCents → CASH allocation baseAmountCents sum
 * - cashDue/Received/Outstanding → CASH allocations + active transfers
 * - barterBaseCents → BARTER allocation baseAmountCents sum
 * - barterCreditExpected/Materialized → allocation snapshots + ledger CREDIT_FROM_SETTLEMENT
 * - courtesyCreditConsumed → ledger DEBIT_COURTESY net (computeCreditConsumedCents)
 * - courtesyCreditAvailable → ledger SUM(amountCents)
 */

import {
  computeCashDueCents,
  computeCashOutstandingCents,
  computeCashReceivedCents,
  sumMoneyCentsBigInt,
} from './benefit-settlement';
import {
  computeCourtesyCreditBalanceCents,
  computeCreditConsumedCents,
} from './courtesy-credit-ledger';
import { moneyCentsToString, parseMoneyCentsString, roundBarterCreditCents } from './money/benefit-money';

export const BENEFIT_INTEGRITY_STATUSES = ['OK', 'WARNING', 'ERROR'] as const;
export type BenefitIntegrityStatus = (typeof BENEFIT_INTEGRITY_STATUSES)[number];

export const BENEFIT_INTEGRITY_SEVERITIES = ['WARNING', 'ERROR'] as const;
export type BenefitIntegritySeverity = (typeof BENEFIT_INTEGRITY_SEVERITIES)[number];

export interface BenefitReportingKpis {
  usageCount: number;
  baseGeneratedCents: string;
  cashAllocatedCents: string;
  cashReceivedCents: string;
  cashOutstandingCents: string;
  barterBaseCents: string;
  barterCreditExpectedCents: string;
  barterCreditMaterializedCents: string;
  courtesyCreditConsumedCents: string;
  courtesyCreditAvailableCents: string;
}

export function emptyBenefitReportingKpis(): BenefitReportingKpis {
  const zero = '0';
  return {
    usageCount: 0,
    baseGeneratedCents: zero,
    cashAllocatedCents: zero,
    cashReceivedCents: zero,
    cashOutstandingCents: zero,
    barterBaseCents: zero,
    barterCreditExpectedCents: zero,
    barterCreditMaterializedCents: zero,
    courtesyCreditConsumedCents: zero,
    courtesyCreditAvailableCents: zero,
  };
}

export function addMoneyCentsField(a: string, b: string): string {
  return moneyCentsToString(parseMoneyCentsString(a) + parseMoneyCentsString(b));
}

export function mergeBenefitReportingKpis(
  a: BenefitReportingKpis,
  b: BenefitReportingKpis,
): BenefitReportingKpis {
  return {
    usageCount: a.usageCount + b.usageCount,
    baseGeneratedCents: addMoneyCentsField(a.baseGeneratedCents, b.baseGeneratedCents),
    cashAllocatedCents: addMoneyCentsField(a.cashAllocatedCents, b.cashAllocatedCents),
    cashReceivedCents: addMoneyCentsField(a.cashReceivedCents, b.cashReceivedCents),
    cashOutstandingCents: addMoneyCentsField(a.cashOutstandingCents, b.cashOutstandingCents),
    barterBaseCents: addMoneyCentsField(a.barterBaseCents, b.barterBaseCents),
    barterCreditExpectedCents: addMoneyCentsField(
      a.barterCreditExpectedCents,
      b.barterCreditExpectedCents,
    ),
    barterCreditMaterializedCents: addMoneyCentsField(
      a.barterCreditMaterializedCents,
      b.barterCreditMaterializedCents,
    ),
    courtesyCreditConsumedCents: addMoneyCentsField(
      a.courtesyCreditConsumedCents,
      b.courtesyCreditConsumedCents,
    ),
    courtesyCreditAvailableCents: addMoneyCentsField(
      a.courtesyCreditAvailableCents,
      b.courtesyCreditAvailableCents,
    ),
  };
}

export interface BenefitIntegrityIssue {
  code: string;
  severity: BenefitIntegritySeverity;
  message: string;
  entityType?: string;
  entityId?: string;
}

export function deriveIntegrityStatus(
  issues: ReadonlyArray<BenefitIntegrityIssue>,
): BenefitIntegrityStatus {
  if (issues.some((i) => i.severity === 'ERROR')) return 'ERROR';
  if (issues.some((i) => i.severity === 'WARNING')) return 'WARNING';
  return 'OK';
}

export function computeBarterCreditExpectedFromAllocations(
  allocations: ReadonlyArray<{
    mode: string;
    baseAmountCents: bigint;
    barterMultiplier: string;
  }>,
): string {
  let total = 0n;
  for (const allocation of allocations) {
    if (allocation.mode !== 'BARTER') continue;
    total += roundBarterCreditCents(allocation.baseAmountCents, allocation.barterMultiplier);
  }
  return moneyCentsToString(total);
}

export function computeSettlementCashKpis(
  allocations: ReadonlyArray<{ mode: string; baseAmountCents: bigint }>,
  transfers: ReadonlyArray<{ amountCents: bigint; reversedAt?: Date | null }>,
): {
  cashAllocatedCents: string;
  cashDueCents: string;
  cashReceivedCents: string;
  cashOutstandingCents: string;
} {
  const cashAllocations = allocations.filter((a) => a.mode === 'CASH');
  const cashAllocated = sumMoneyCentsBigInt(cashAllocations.map((a) => a.baseAmountCents));
  const cashDue = computeCashDueCents(allocations);
  const cashReceived = computeCashReceivedCents(transfers);
  const cashOutstanding = computeCashOutstandingCents(cashDue, cashReceived);
  return {
    cashAllocatedCents: cashAllocated,
    cashDueCents: moneyCentsToString(cashDue),
    cashReceivedCents: moneyCentsToString(cashReceived),
    cashOutstandingCents: moneyCentsToString(cashOutstanding),
  };
}

export function computePartnerLedgerKpis(
  entries: ReadonlyArray<{ amountCents: bigint; type: string }>,
): {
  courtesyCreditConsumedCents: string;
  courtesyCreditAvailableCents: string;
} {
  const balance = computeCourtesyCreditBalanceCents(entries);
  const consumed = computeCreditConsumedCents(entries);
  return {
    courtesyCreditConsumedCents: moneyCentsToString(consumed),
    courtesyCreditAvailableCents: balance.toString(),
  };
}

export type BenefitTimelineEventKind =
  | 'AGREEMENT'
  | 'SETTLEMENT'
  | 'ALLOCATION'
  | 'CREDIT'
  | 'TRANSFER'
  | 'COURTESY'
  | 'ADJUSTMENT'
  | 'AUDIT';

export interface BenefitTimelineEvent {
  occurredAt: string;
  kind: BenefitTimelineEventKind;
  label: string;
  amountCents?: string;
  actorLabel?: string | null;
  entityType?: string;
  entityId?: string;
  tieBreak: string;
}

const TIMELINE_KIND_ORDER: Record<BenefitTimelineEventKind, number> = {
  AGREEMENT: 1,
  SETTLEMENT: 2,
  ALLOCATION: 3,
  CREDIT: 4,
  TRANSFER: 5,
  COURTESY: 6,
  ADJUSTMENT: 7,
  AUDIT: 8,
};

export function compareBenefitTimelineEvents(a: BenefitTimelineEvent, b: BenefitTimelineEvent): number {
  const ta = new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime();
  if (ta !== 0) return ta;
  const ka = TIMELINE_KIND_ORDER[a.kind] - TIMELINE_KIND_ORDER[b.kind];
  if (ka !== 0) return ka;
  return a.tieBreak.localeCompare(b.tieBreak);
}

export function sortBenefitTimelineEvents(
  events: BenefitTimelineEvent[],
): BenefitTimelineEvent[] {
  return [...events].sort(compareBenefitTimelineEvents);
}

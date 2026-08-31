import { roundBarterCreditCents } from './money/benefit-money';

export const COURTESY_CREDIT_LEDGER_ENTRY_TYPES = [
  'CREDIT_FROM_SETTLEMENT',
  'DEBIT_COURTESY',
  'ADJUSTMENT',
  'REVERSAL',
] as const;

export type CourtesyCreditLedgerEntryType = (typeof COURTESY_CREDIT_LEDGER_ENTRY_TYPES)[number];

export function computeBarterCreditFromAllocation(allocation: {
  baseAmountCents: bigint;
  barterMultiplier: string;
}): bigint {
  return roundBarterCreditCents(allocation.baseAmountCents, allocation.barterMultiplier);
}

export function computeCourtesyCreditBalanceCents(
  entries: ReadonlyArray<{ amountCents: bigint }>,
): bigint {
  let total = 0n;
  for (const entry of entries) {
    total += entry.amountCents;
  }
  return total;
}

export function assertLedgerAmountSignForType(
  type: CourtesyCreditLedgerEntryType,
  amountCents: bigint,
): boolean {
  if (amountCents === 0n) return false;
  switch (type) {
    case 'CREDIT_FROM_SETTLEMENT':
      return amountCents > 0n;
    case 'DEBIT_COURTESY':
    case 'REVERSAL':
      return amountCents < 0n;
    case 'ADJUSTMENT':
      return true;
    default:
      return false;
  }
}

export function assertAdjustmentWouldNotGoNegative(
  currentBalanceCents: bigint,
  adjustmentAmountCents: bigint,
): boolean {
  return currentBalanceCents + adjustmentAmountCents >= 0n;
}

export function assertReversalWouldNotGoNegative(
  currentBalanceCents: bigint,
  originalAmountCents: bigint,
): boolean {
  return currentBalanceCents - originalAmountCents >= 0n;
}

export type BarterCreditDriftIssue =
  | { kind: 'ALLOCATION_WITHOUT_CREDIT'; allocationId: string }
  | { kind: 'DUPLICATE_CREDIT'; allocationId: string; entryIds: string[] }
  | { kind: 'CREDIT_AMOUNT_MISMATCH'; allocationId: string; expectedCents: string; actualCents: string }
  | { kind: 'CREDIT_WITHOUT_BARTER_ALLOCATION'; entryId: string; sourceAllocationId: string };

export function detectBarterCreditDrift(params: {
  barterAllocations: ReadonlyArray<{
    id: string;
    baseAmountCents: bigint;
    barterMultiplier: string;
    mode: string;
  }>;
  creditEntries: ReadonlyArray<{
    id: string;
    type: string;
    amountCents: bigint;
    sourceAllocationId: string | null;
  }>;
}): BarterCreditDriftIssue[] {
  const issues: BarterCreditDriftIssue[] = [];
  const creditsByAllocation = new Map<
    string,
    Array<{
      id: string;
      type: string;
      amountCents: bigint;
      sourceAllocationId: string | null;
    }>
  >();

  for (const entry of params.creditEntries) {
    if (entry.type !== 'CREDIT_FROM_SETTLEMENT' || !entry.sourceAllocationId) continue;
    const list = creditsByAllocation.get(entry.sourceAllocationId) ?? [];
    list.push(entry);
    creditsByAllocation.set(entry.sourceAllocationId, list);
  }

  for (const allocation of params.barterAllocations) {
    if (allocation.mode !== 'BARTER') continue;
    const credits = creditsByAllocation.get(allocation.id) ?? [];
    if (credits.length === 0) {
      issues.push({ kind: 'ALLOCATION_WITHOUT_CREDIT', allocationId: allocation.id });
      continue;
    }
    if (credits.length > 1) {
      issues.push({
        kind: 'DUPLICATE_CREDIT',
        allocationId: allocation.id,
        entryIds: credits.map((c) => c.id),
      });
    }
    const expected = computeBarterCreditFromAllocation(allocation);
    const actual = credits[0]!.amountCents;
    if (actual !== expected) {
      issues.push({
        kind: 'CREDIT_AMOUNT_MISMATCH',
        allocationId: allocation.id,
        expectedCents: expected.toString(),
        actualCents: actual.toString(),
      });
    }
    creditsByAllocation.delete(allocation.id);
  }

  for (const [allocationId, credits] of creditsByAllocation) {
    for (const entry of credits) {
      issues.push({
        kind: 'CREDIT_WITHOUT_BARTER_ALLOCATION',
        entryId: entry.id,
        sourceAllocationId: allocationId,
      });
    }
  }

  return issues;
}

/**
 * Read-only preview of active / next batch for producer UI (mirrors backend rules).
 * No side effects — not authoritative for sales.
 */

export type BatchPreviewInput = {
  orderIndex: number;
  status: string;
  startAt: string;
  endAt: string;
  effectiveQuantity: number;
  soldCount: number;
  reservedQuantity: number;
  name: string;
};

function blocksSuccessor(
  b: BatchPreviewInput,
  now: Date,
): boolean {
  if (b.status === 'CLOSED' || b.status === 'SKIPPED' || b.status === 'SOLD_OUT') {
    return false;
  }
  const end = new Date(b.endAt).getTime();
  if (now.getTime() > end) return false;
  const rem = b.effectiveQuantity - b.soldCount - b.reservedQuantity;
  return rem > 0;
}

/** First batch that would receive sales right now (same logic as API pickActiveBatch). */
export function pickActiveBatchPreview(batches: BatchPreviewInput[], now = new Date()): BatchPreviewInput | null {
  const sorted = [...batches].sort((a, b) => a.orderIndex - b.orderIndex);
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i]!;
    if (b.status === 'CLOSED' || b.status === 'SKIPPED') continue;
    if (now.getTime() > new Date(b.endAt).getTime()) continue;
    const rem = b.effectiveQuantity - b.soldCount - b.reservedQuantity;
    if (rem <= 0) continue;
    const blocked = sorted.slice(0, i).some((j) => blocksSuccessor(j, now));
    if (blocked) continue;
    return b;
  }
  return null;
}

/** Next batch in order after the active one (sequential chain), if any. */
export function pickNextBatchPreview(
  batches: BatchPreviewInput[],
  active: BatchPreviewInput | null,
  now = new Date(),
): BatchPreviewInput | null {
  if (!active) return null;
  const sorted = [...batches].sort((a, b) => a.orderIndex - b.orderIndex);
  const idx = sorted.findIndex((b) => b.orderIndex === active.orderIndex);
  if (idx < 0 || idx >= sorted.length - 1) return null;
  return sorted[idx + 1] ?? null;
}

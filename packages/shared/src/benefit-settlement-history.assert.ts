import { buildSettlementHistory, type SettlementTimelineEventLike } from './benefit-settlement-history';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

const t0 = '2026-10-22T15:00:00.000Z';
const t1 = '2026-10-22T15:05:10.000Z';
const t1b = '2026-10-22T15:05:40.000Z';
const t2 = '2026-10-22T16:00:00.000Z';
const t3 = '2026-10-22T17:00:00.000Z';

const timeline: SettlementTimelineEventLike[] = [
  { occurredAt: t0, kind: 'SETTLEMENT', label: 'Liquidación generada' },
  { occurredAt: t0, kind: 'AUDIT', label: 'benefit settlement generated', action: 'BENEFIT_SETTLEMENT_GENERATED', actorLabel: 'Admin' },
  ...Array.from({ length: 10 }, (_, i): SettlementTimelineEventLike => ({
    occurredAt: i < 5 ? t1 : t1b,
    kind: 'ALLOCATION',
    label: 'Usos asignados a transferencia',
    amountCents: '500000',
    actorLabel: 'Admin',
  })),
  { occurredAt: t1, kind: 'AUDIT', label: 'x', action: 'BENEFIT_USAGE_ALLOCATED_CASH', actorLabel: 'Admin' },
  { occurredAt: t2, kind: 'TRANSFER', label: 'Transferencia registrada', amountCents: '3000000', actorLabel: 'Admin', entityId: 'tr-1' },
  { occurredAt: t2, kind: 'AUDIT', label: 'x', action: 'BENEFIT_TRANSFER_REGISTERED', actorLabel: 'Admin' },
  { occurredAt: t3, kind: 'TRANSFER', label: 'Transferencia revertida', amountCents: '3000000', actorLabel: 'Admin', entityId: 'tr-1-reversal' },
  { occurredAt: t3, kind: 'AUDIT', label: 'benefit settlement closed', action: 'BENEFIT_SETTLEMENT_CLOSED', actorLabel: 'Admin' },
];

const rows = buildSettlementHistory(timeline, [
  { transferId: 'tr-1', reference: 'TRF-001', reversalReason: 'Monto erróneo' },
]);

assert(rows.length === 5, `5 rows (got ${rows.length})`);
assert(rows[0]!.description === 'Liquidación generada' && rows[0]!.actorLabel === 'Admin', 'generated with actor, no duplicate');
assert(rows[1]!.description === 'Usos asignados a transferencia (10 usos)', 'allocations collapsed');
assert(rows[1]!.amountCents === '5000000', 'collapsed amount $50.000');
assert(rows[2]!.reference === 'TRF-001' && rows[2]!.status === 'Registrada', 'transfer reference + status');
assert(rows[3]!.status === 'Revertida: Monto erróneo' && rows[3]!.reference === 'TRF-001', 'reversal reason');
assert(rows[4]!.description === 'Liquidación cerrada', 'closed audit labeled');
assert(!rows.some((r) => r.description === 'x'), 'redundant audit dropped');

// Different actors are not merged
const split = buildSettlementHistory([
  { occurredAt: t1, kind: 'ALLOCATION', label: 'Usos asignados a canje', amountCents: '1', actorLabel: 'A' },
  { occurredAt: t1, kind: 'ALLOCATION', label: 'Usos asignados a canje', amountCents: '1', actorLabel: 'B' },
]);
assert(split.length === 2, 'different actors kept separate');

console.log('OK: settlement history (dedupe, labels, collapse, transfer trace)');

/**
 * G7.12.8 — readable settlement history from the existing audit timeline (no new audit log).
 * Historial legible a partir de la línea de tiempo existente.
 */

export type SettlementTimelineEventLike = {
  occurredAt: string;
  kind: string;
  label: string;
  amountCents?: string;
  actorLabel?: string | null;
  entityType?: string;
  entityId?: string;
  action?: string;
};

export type SettlementTransferTraceLike = {
  transferId: string;
  reference: string | null;
  reversalReason: string | null;
};

export type SettlementHistoryRow = {
  occurredAt: string;
  type: string;
  description: string;
  amountCents: string | null;
  actorLabel: string | null;
  reference: string | null;
  status: string | null;
};

/** Audit actions already represented by domain rows (allocation / transfer / credit). */
const REDUNDANT_AUDIT_ACTIONS = new Set([
  'BENEFIT_USAGE_ALLOCATED_CASH',
  'BENEFIT_USAGE_ALLOCATED_BARTER',
  'BENEFIT_TRANSFER_REGISTERED',
  'BENEFIT_TRANSFER_REVERSED',
  'BENEFIT_CREDIT_MATERIALIZED',
]);

const AUDIT_ACTION_LABEL: Record<string, string> = {
  BENEFIT_SETTLEMENT_GENERATED: 'Liquidación generada',
  BENEFIT_SETTLEMENT_REFRESHED: 'Usos actualizados',
  BENEFIT_SETTLEMENT_CLOSED: 'Liquidación cerrada',
};

const KIND_LABEL: Record<string, string> = {
  AGREEMENT: 'Acuerdo',
  SETTLEMENT: 'Liquidación',
  ALLOCATION: 'Asignación',
  CREDIT: 'Crédito canje',
  TRANSFER: 'Transferencia',
  COURTESY: 'Cortesía',
  ADJUSTMENT: 'Ajuste',
  AUDIT: 'Registro',
};

function minuteKey(iso: string): string {
  return iso.slice(0, 16);
}

/**
 * Builds history rows: drops redundant audit entries, labels audit actions, collapses
 * one allocate call (same label + actor + minute) into a single row with count and total.
 */
export function buildSettlementHistory(
  timeline: readonly SettlementTimelineEventLike[],
  transfers: readonly SettlementTransferTraceLike[] = [],
): SettlementHistoryRow[] {
  const transferById = new Map(transfers.map((t) => [t.transferId, t]));
  const hasGeneratedAudit = timeline.some((e) => e.action === 'BENEFIT_SETTLEMENT_GENERATED');
  const rows: Array<SettlementHistoryRow & { groupKey: string | null; count: number }> = [];

  for (const e of timeline) {
    if (e.kind === 'AUDIT' && e.action && REDUNDANT_AUDIT_ACTIONS.has(e.action)) continue;
    if (e.kind === 'SETTLEMENT' && hasGeneratedAudit) continue;

    const groupable = e.kind === 'ALLOCATION' || e.kind === 'CREDIT';
    const groupKey = groupable ? `${e.kind}|${e.label}|${e.actorLabel ?? ''}|${minuteKey(e.occurredAt)}` : null;
    const last = rows[rows.length - 1];
    if (groupKey && last?.groupKey === groupKey) {
      last.count += 1;
      last.amountCents = (BigInt(last.amountCents ?? '0') + BigInt(e.amountCents ?? '0')).toString();
      last.description = `${e.label} (${last.count} usos)`;
      continue;
    }

    let reference: string | null = null;
    let status: string | null = null;
    if (e.kind === 'TRANSFER' && e.entityId) {
      const isReversal = e.entityId.endsWith('-reversal');
      const trace = transferById.get(isReversal ? e.entityId.slice(0, -'-reversal'.length) : e.entityId);
      reference = trace?.reference ?? null;
      status = isReversal ? `Revertida${trace?.reversalReason ? `: ${trace.reversalReason}` : ''}` : 'Registrada';
    }

    rows.push({
      occurredAt: e.occurredAt,
      type: KIND_LABEL[e.kind] ?? e.kind,
      description:
        e.kind === 'AUDIT' && e.action ? (AUDIT_ACTION_LABEL[e.action] ?? e.label) : e.label,
      amountCents: e.amountCents ?? null,
      actorLabel: e.actorLabel ?? null,
      reference,
      status,
      groupKey,
      count: 1,
    });
  }

  return rows.map(({ groupKey: _g, count: _c, ...row }) => row);
}

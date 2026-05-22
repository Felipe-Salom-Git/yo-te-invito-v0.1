'use client';

import type { TicketBatchResponse, TicketTypeResponse } from '@/repositories/interfaces';
import { pickActiveBatchPreview, pickNextBatchPreview, type BatchPreviewInput } from '@/lib/producer/ticket-batch-preview';
import { renumberBatches, type BatchRowModel } from '@/lib/producer/ticket-types-editor.model';

const UX_LINES = [
  'Un tipo de entrada puede tener varias tandas encadenadas.',
  'La siguiente tanda se activa cuando se agota la anterior o cuando vence su fecha.',
  'Si queda remanente, se transfiere automáticamente a la siguiente tanda.',
] as const;

function toPreviewRows(batches: TicketBatchResponse[]): BatchPreviewInput[] {
  return batches.map((b) => ({
    orderIndex: b.orderIndex,
    status: b.status,
    startAt: b.startAt,
    endAt: b.endAt,
    effectiveQuantity: b.effectiveQuantity,
    soldCount: b.soldCount,
    reservedQuantity: b.reservedQuantity,
    name: b.name,
  }));
}

/** Draft rows from the form → same shape as API for preview (0 sold). */
function draftBatchesToPreviewInputs(
  drafts: BatchRowModel[],
  now = new Date(),
): BatchPreviewInput[] | null {
  const sorted = renumberBatches(drafts);
  const out: BatchPreviewInput[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i]!;
    const s = b.startAt.trim();
    const e = b.endAt.trim();
    if (!s || !e) return null;
    const sd = new Date(s);
    const ed = new Date(e);
    if (Number.isNaN(sd.getTime()) || Number.isNaN(ed.getTime())) return null;
    const status =
      now.getTime() < sd.getTime()
        ? 'SCHEDULED'
        : now.getTime() > ed.getTime()
          ? 'CLOSED'
          : 'ACTIVE';
    out.push({
      orderIndex: i,
      status,
      startAt: sd.toISOString(),
      endAt: ed.toISOString(),
      effectiveQuantity: Math.max(0, b.baseQuantity),
      soldCount: 0,
      reservedQuantity: 0,
      name: b.name.trim() || `Tanda ${i + 1}`,
    });
  }
  return out;
}

type Props = {
  ticketType: TicketTypeResponse;
  /** When set (create flow / unsaved edits), drives active/next preview instead of `ticketType.batches`. */
  draftBatches?: BatchRowModel[];
  className?: string;
};

export function ProducerTicketTypeSummaryPanel({ ticketType, draftBatches, className = '' }: Props) {
  const capTotal = ticketType.capacityTotal ?? ticketType.capacityAvailable ?? 0;
  const capAvail = ticketType.capacityAvailable ?? 0;
  const sold = Math.max(0, capTotal - capAvail);
  const serverBatches = ticketType.batches ?? [];
  const previewRowsFromDraft = draftBatches != null ? draftBatchesToPreviewInputs(draftBatches) : null;
  const previewRows: BatchPreviewInput[] =
    previewRowsFromDraft != null ? previewRowsFromDraft : toPreviewRows(serverBatches);
  const batchCount =
    draftBatches != null ? draftBatches.length : serverBatches.length || (previewRows.length ? previewRows.length : 0);
  const now = new Date();
  const active = previewRows.length ? pickActiveBatchPreview(previewRows, now) : null;
  const next = previewRows.length && active ? pickNextBatchPreview(previewRows, active, now) : null;
  const previewIncomplete = draftBatches != null && previewRowsFromDraft == null && draftBatches.length > 0;

  const rolloverHint =
    batchCount > 1
      ? 'Al vencer una tanda, el cupo no vendido suma a la siguiente (mismo tope total del tipo).'
      : null;

  return (
    <div className={`rounded-lg border border-accent/25 bg-bg-muted/50 p-4 text-sm ${className}`}>
      <p className="font-medium text-accent">Resumen del tipo</p>
      <ul className="mt-2 space-y-1 text-text-muted">
        <li>
          <span className="text-text">Capacidad total:</span> {capTotal} ·{' '}
          <span className="text-text">Vendidas:</span> {sold} ·{' '}
          <span className="text-text">Disponibles (tipo):</span> {capAvail}
        </li>
        <li>
          <span className="text-text">Tandas:</span> {batchCount || '— (sin detalle)'}
        </li>
        <li>
          <span className="text-text">Tanda activa (vista previa):</span>{' '}
          {previewIncomplete ? (
            <span className="text-text-muted">Completá fechas válidas en cada tanda para previsualizar.</span>
          ) : active ? (
            `${active.name} · hasta ${new Date(active.endAt).toLocaleString('es-AR')}`
          ) : (
            'Ninguna en este momento'
          )}
        </li>
        {next ? (
          <li>
            <span className="text-text">Próxima tanda:</span> {next.name}
          </li>
        ) : null}
        {rolloverHint ? <li className="italic text-text-muted/90">{rolloverHint}</li> : null}
      </ul>
      <ul className="mt-4 space-y-1.5 border-t border-border pt-3 text-xs text-text-muted">
        {UX_LINES.map((line) => (
          <li key={line}>· {line}</li>
        ))}
      </ul>
    </div>
  );
}

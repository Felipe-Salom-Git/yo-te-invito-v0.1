'use client';

import type { TicketBatchResponse } from '@/repositories/interfaces';
import { Badge } from '@/components';
import {
  BATCH_PHASE_BADGE_VARIANT,
  BATCH_PHASE_LABELS,
  formatTicketPrice,
  getBatchDisplayPhase,
} from '@/lib/producer/ticket-batch-display';

function formatRange(startAt: string, endAt: string) {
  const s = new Date(startAt);
  const e = new Date(endAt);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return '—';
  const opts: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  };
  return `${s.toLocaleString('es-AR', opts)} → ${e.toLocaleString('es-AR', opts)}`;
}

type Props = {
  batches: TicketBatchResponse[];
  activeTicketBatchId?: string | null;
};

export function ProducerTicketBatchesTimeline({ batches, activeTicketBatchId }: Props) {
  const sorted = [...batches].sort((a, b) => a.orderIndex - b.orderIndex);
  const now = new Date();

  if (!sorted.length) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-bg/60 px-4 py-6 text-center">
        <p className="text-sm text-text-muted">
          Este tipo de entrada todavía no tiene tandas configuradas.
        </p>
        <p className="mt-1 text-xs text-text-muted">
          Usá <span className="font-medium text-text">Gestionar tandas</span> para crear la primera.
        </p>
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {sorted.map((batch) => {
        const phase = getBatchDisplayPhase(batch, activeTicketBatchId, sorted, now);
        const rem = Math.max(
          0,
          batch.effectiveQuantity - batch.soldCount - (batch.reservedQuantity ?? 0),
        );
        return (
          <li
            key={batch.id}
            className="rounded-lg border border-border bg-bg p-3 sm:p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                    #{batch.orderIndex + 1}
                  </span>
                  <span className="font-medium text-text">{batch.name}</span>
                  <Badge variant={BATCH_PHASE_BADGE_VARIANT[phase]}>
                    {BATCH_PHASE_LABELS[phase]}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-text-muted">{formatRange(batch.startAt, batch.endAt)}</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold text-text">
                  {formatTicketPrice(batch.price, batch.currency)}
                </p>
                <p className="text-xs text-text-muted">precio tanda</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div>
                <p className="text-text-muted">Cupos efectivos</p>
                <p className="font-medium text-text">{batch.effectiveQuantity}</p>
              </div>
              <div>
                <p className="text-text-muted">Vendidos</p>
                <p className="font-medium text-text">{batch.soldCount}</p>
              </div>
              <div>
                <p className="text-text-muted">Disponibles</p>
                <p className="font-medium text-text">{rem}</p>
              </div>
              <div>
                <p className="text-text-muted">Base + rollover</p>
                <p className="font-medium text-text">
                  {batch.baseQuantity}
                  {batch.rolloverQuantity > 0 ? ` +${batch.rolloverQuantity}` : ''}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

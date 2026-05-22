'use client';

import Link from 'next/link';
import type { TicketTypeResponse } from '@/repositories/interfaces';
import { Badge, Button } from '@/components';
import {
  getCurrentOrNextPrice,
  getTicketTypeAlerts,
  getTicketTypeSoldCount,
} from '@/lib/producer/ticket-batch-display';
import { ProducerTicketBatchesTimeline } from './ProducerTicketBatchesTimeline';

type Props = {
  eventId: string;
  ticketType: TicketTypeResponse;
  isManaging: boolean;
  onManage: () => void;
  children?: React.ReactNode;
};

export function ProducerTicketTypeCard({
  eventId,
  ticketType: tt,
  isManaging,
  onManage,
  children,
}: Props) {
  const capT = tt.capacityTotal ?? tt.capacityAvailable ?? 0;
  const sold = getTicketTypeSoldCount(tt);
  const available = tt.capacityAvailable ?? 0;
  const pct = capT > 0 ? Math.round((sold / capT) * 100) : 0;
  const priceInfo = getCurrentOrNextPrice(tt);
  const batchCount = tt.batches?.length ?? 0;
  const alerts = getTicketTypeAlerts(tt);

  return (
    <article className="rounded-xl border border-border bg-bg-muted/30 overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-text">{tt.name}</h3>
              <Badge variant={tt.status === 'PAUSED' ? 'muted' : 'accent'}>
                {tt.status === 'PAUSED' ? 'Pausado' : 'Activo'}
              </Badge>
            </div>
            {tt.description ? (
              <p className="mt-1 line-clamp-2 text-sm text-text-muted">{String(tt.description)}</p>
            ) : null}

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-text-muted">{priceInfo.label}</dt>
                <dd className="font-semibold text-text">{priceInfo.amount}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Stock total</dt>
                <dd className="font-medium text-text">{capT}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Vendidas</dt>
                <dd className="font-medium text-text">{sold}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Disponibles</dt>
                <dd className="font-medium text-text">{available}</dd>
              </div>
            </dl>

            <p className="mt-2 text-xs text-text-muted">
              {batchCount === 0
                ? 'Sin tandas'
                : `${batchCount} tanda${batchCount === 1 ? '' : 's'}`}
            </p>

            <div className="mt-3 flex items-center gap-2">
              <div className="h-2 min-w-0 flex-1 max-w-xs overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
              <span className="shrink-0 text-xs text-text-muted">{pct}% vendido</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
            <Button
              type="button"
              size="sm"
              variant={isManaging ? 'primary' : 'secondary'}
              className="w-full sm:w-auto"
              onClick={onManage}
            >
              {isManaging ? 'Cerrar edición' : 'Gestionar tandas'}
            </Button>
            <Link
              href={`/producer/events/${eventId}/ticket-types/${tt.id}/design`}
              className="inline-flex w-full items-center justify-center rounded border border-border bg-bg px-3 py-1.5 text-sm font-medium text-text transition-colors hover:border-accent hover:text-accent sm:w-auto"
            >
              Diseñar ticket
            </Link>
          </div>
        </div>

        {alerts.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {alerts.map((a) => (
              <li
                key={a.id}
                className={
                  a.tone === 'warning'
                    ? 'rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100'
                    : 'rounded border border-border bg-bg px-3 py-2 text-xs text-text-muted'
                }
              >
                {a.message}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {!isManaging ? (
        <div className="border-t border-border bg-bg/50 px-4 py-4 sm:px-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
            Tandas (orden cronológico)
          </p>
          <ProducerTicketBatchesTimeline
            batches={tt.batches ?? []}
            activeTicketBatchId={tt.activeTicketBatchId}
          />
        </div>
      ) : null}

      {isManaging && children ? (
        <div className="border-t border-border bg-bg px-4 py-4 sm:px-5">{children}</div>
      ) : null}
    </article>
  );
}

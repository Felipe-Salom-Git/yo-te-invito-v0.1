'use client';

import Link from 'next/link';
import { StatusBadge } from '@/components/domain/StatusBadge';
import { PAYMENT_STATUS_LABELS } from '@/lib/domainLabels';
import { countOrderItems } from '@/lib/me/order-detail';
import type { Order } from '@/repositories/interfaces';

type EventInfo = {
  title?: string;
  startAt?: string;
  venueName?: string | null;
};

type Props = {
  order: Order;
  event?: EventInfo | null;
  paymentStatus?: string | null;
  paymentProvider?: string | null;
  requiresManualReview?: boolean;
  reconciliationReason?: string | null;
};

export function MeOrderDetailSummary({
  order,
  event,
  paymentStatus,
  paymentProvider,
  requiresManualReview,
  reconciliationReason,
}: Props) {
  const currency = order.currency ?? 'ARS';
  const total =
    typeof order.totalAmount === 'string' ? order.totalAmount : String(order.totalAmount);
  const itemCount = countOrderItems(order);
  const created =
    typeof order.createdAt === 'string'
      ? new Date(order.createdAt).toLocaleString('es-AR', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : null;

  return (
    <section className="rounded-lg border border-border bg-bg-muted/50 p-4 sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <p className="text-xs text-text-muted">Pedido</p>
          <h2 className="mt-0.5 text-lg font-semibold text-text break-all">
            {event?.title ?? (order.eventId ? `Evento ${order.eventId}` : 'Detalle del pedido')}
          </h2>
          {event?.startAt && (
            <p className="mt-1 text-sm text-text-muted">
              {new Date(event.startAt).toLocaleString('es-AR', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
              {event.venueName ? ` · ${event.venueName}` : ''}
            </p>
          )}
          {order.eventId && event?.title && (
            <Link
              href={`/events/${order.eventId}`}
              className="mt-2 inline-block text-sm text-accent hover:underline"
            >
              Ver evento →
            </Link>
          )}
        </div>

        {requiresManualReview && (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            Recibimos confirmación de pago, pero el pedido requiere revisión manual. No vuelvas a
            pagar;{' '}
            <a href="/#footer-support" className="font-medium underline">
              contactá soporte
            </a>
            .
            {reconciliationReason ? (
              <span className="mt-1 block font-mono text-xs opacity-80">
                Ref: {reconciliationReason}
              </span>
            ) : null}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <StatusBadge status={order.status} kind="order" />
          {paymentStatus && (
            <span className="inline-flex rounded border border-border bg-bg px-2 py-0.5 text-xs text-text-muted">
              {PAYMENT_STATUS_LABELS[paymentStatus] ?? `Pago: ${paymentStatus}`}
            </span>
          )}
          {paymentProvider && (
            <span className="inline-flex rounded border border-border bg-bg px-2 py-0.5 text-xs text-text-muted">
              {paymentProvider === 'GETNET' ? 'Getnet' : paymentProvider === 'DEMO' ? 'Demo' : paymentProvider}
            </span>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-text-muted">Código</dt>
            <dd className="mt-0.5 font-mono text-xs text-text break-all">{order.id}</dd>
          </div>
          {created && (
            <div>
              <dt className="text-xs text-text-muted">Fecha</dt>
              <dd className="mt-0.5 text-text">{created}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-text-muted">Ítems</dt>
            <dd className="mt-0.5 text-text">{itemCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">Total</dt>
            <dd className="mt-0.5 font-semibold text-accent tabular-nums">
              {currency} {total}
            </dd>
          </div>
        </dl>

        <p className="text-xs text-text-muted break-all">{order.buyerEmail}</p>
      </div>
    </section>
  );
}

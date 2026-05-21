'use client';

import Link from 'next/link';
import type { MePendingOrdersResponse } from '@yo-te-invito/shared';
import { ORDER_STATUS_LABELS } from '@/lib/domainLabels';
import { useTenant } from '@/hooks/useTenant';

type OrderRow = MePendingOrdersResponse['orders'][number];

type Props = {
  orders: OrderRow[];
  tenantId?: string;
  emptyMessage?: string;
};

export function PendingOrdersList({
  orders,
  tenantId: tenantProp,
  emptyMessage = 'No tenés órdenes pendientes de pago.',
}: Props) {
  const { tenantId: tenantFromHook } = useTenant();
  const t = tenantProp ?? tenantFromHook ?? 'tenant-demo';

  if (orders.length === 0) {
    return <p className="text-sm text-text-muted">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-3">
      {orders.map((o) => (
        <li
          key={o.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-bg-muted/50 p-4"
        >
          <div className="min-w-0">
            <p className="font-medium text-text">{o.eventTitle ?? `Evento ${o.eventId}`}</p>
            <p className="text-sm text-text-muted">
              {ORDER_STATUS_LABELS[o.status] ?? o.status} · {o.currency ?? 'ARS'} {o.totalAmount}
            </p>
            {o.expiresAt && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Reservá antes del {new Date(o.expiresAt).toLocaleString('es-AR')}
              </p>
            )}
            <p className="mt-1 font-mono text-xs text-text-muted truncate max-w-[240px]">
              {o.id}
            </p>
          </div>
          <Link
            href={`/checkout/${o.eventId}?tenantId=${encodeURIComponent(t)}&orderId=${encodeURIComponent(o.id)}`}
            className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg hover:bg-accent-hover transition-colors"
          >
            Pagar
          </Link>
        </li>
      ))}
    </ul>
  );
}

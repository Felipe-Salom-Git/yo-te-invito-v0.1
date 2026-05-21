'use client';

import type { OrderLineItem } from '@/repositories/interfaces';

type Props = {
  item: OrderLineItem;
  currency: string;
};

/** Mobile-first line item for order detail. */
export function MeOrderItemRow({ item, currency }: Props) {
  return (
    <li className="rounded-lg border border-border bg-bg-muted/40 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium text-text">{item.ticketTypeName}</p>
          <p className="text-sm text-text-muted">
            {currency} {item.unitPrice} × {item.quantity}
          </p>
        </div>
        <p className="text-sm font-semibold text-text tabular-nums sm:text-right">
          {currency} {item.subtotal}
        </p>
      </div>
    </li>
  );
}

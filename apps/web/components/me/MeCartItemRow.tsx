'use client';

import Link from 'next/link';
import type { UserCartItem } from '@yo-te-invito/shared';
import { Button } from '@/components';

type Props = {
  item: UserCartItem;
  currency: string;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
  busy?: boolean;
};

export function MeCartItemRow({
  item,
  currency,
  onDecrease,
  onIncrease,
  onRemove,
  busy,
}: Props) {
  const lineTotal = Number(item.unitPrice) * item.quantity;

  return (
    <li className="rounded-lg border border-border bg-bg-muted/40 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium text-text">{item.eventTitle ?? item.eventId}</p>
          <p className="text-sm text-text-muted">
            {item.ticketTypeName ?? item.ticketTypeId}
          </p>
          <p className="mt-1 text-sm text-text">
            {currency} {item.unitPrice} × {item.quantity}
            <span className="text-text-muted"> = {currency} {lineTotal.toFixed(2)}</span>
          </p>
          <Link
            href={`/events/${item.eventId}`}
            className="mt-2 inline-block text-xs text-accent hover:underline"
          >
            Ver evento
          </Link>
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={busy || item.quantity <= 1}
              onClick={onDecrease}
              aria-label="Disminuir cantidad"
            >
              −
            </Button>
            <span className="w-8 text-center text-sm tabular-nums">{item.quantity}</span>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={onIncrease}
              aria-label="Aumentar cantidad"
            >
              +
            </Button>
          </div>
          <Button size="sm" variant="outline" disabled={busy} onClick={onRemove}>
            Quitar
          </Button>
        </div>
      </div>
    </li>
  );
}

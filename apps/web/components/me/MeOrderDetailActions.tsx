'use client';

import Link from 'next/link';
import { buildOrderDetailActions } from '@/lib/me/order-detail';
import type { Order } from '@/repositories/interfaces';

type Props = {
  order: Order;
  tenantId: string;
};

export function MeOrderDetailActions({ order, tenantId }: Props) {
  const actions = buildOrderDetailActions(order, tenantId);
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      {actions.map((action) => (
        <Link
          key={action.href + action.label}
          href={action.href}
          className={
            action.primary
              ? 'inline-flex w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-accent-hover sm:w-auto'
              : 'inline-flex w-full items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent/50 sm:w-auto'
          }
        >
          {action.label}
        </Link>
      ))}
    </div>
  );
}

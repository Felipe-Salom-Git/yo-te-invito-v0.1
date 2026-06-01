'use client';

import Link from 'next/link';
import type { AdminPaymentListItem } from '@/repositories/interfaces';
import {
  AdminManualReviewBadge,
  AdminPaymentProviderBadge,
  AdminPaymentStatusBadge,
} from './AdminPaymentBadges';

type Props = {
  payment: AdminPaymentListItem;
  onReconcile: (id: string) => void;
  reconcilePending?: boolean;
};

export function AdminPaymentsMobileCard({ payment: p, onReconcile, reconcilePending }: Props) {
  return (
    <article className="rounded-xl border border-border/80 bg-bg-muted/30 p-4 md:hidden">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-text">{p.id}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            <AdminPaymentProviderBadge provider={p.provider} />
            <AdminPaymentStatusBadge status={p.status} />
            {p.requiresManualReview ? <AdminManualReviewBadge /> : null}
          </div>
        </div>
        <p className="text-sm font-semibold tabular-nums text-accent">
          {p.currency} {(p.amount / 100).toLocaleString('es-AR')}
        </p>
      </div>
      <p className="mt-2 text-sm text-text">{p.eventTitle ?? 'Sin evento'}</p>
      <p className="text-xs text-text-muted">{p.buyerEmail}</p>
      {p.reconciliationReason ? (
        <p className="mt-2 text-xs text-amber-400">{p.reconciliationReason}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <Link href={`/admin/pagos/${p.id}`} className="text-accent hover:underline">
          Ver detalle
        </Link>
        {p.provider === 'GETNET' ? (
          <button
            type="button"
            className="text-text-muted hover:text-text disabled:opacity-50"
            disabled={reconcilePending}
            onClick={() => onReconcile(p.id)}
          >
            {reconcilePending ? 'Reconciliando…' : 'Reconciliar'}
          </button>
        ) : null}
      </div>
    </article>
  );
}

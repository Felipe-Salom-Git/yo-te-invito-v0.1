'use client';

import Link from 'next/link';
import type { AdminPaymentListItem } from '@/repositories/interfaces';
import {
  AdminManualReviewBadge,
  AdminPaymentProviderBadge,
  AdminPaymentStatusBadge,
} from './AdminPaymentBadges';

function formatMoney(amount: number, currency: string) {
  return `${currency} ${(amount / 100).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

function formatDt(iso: string) {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

type Props = {
  payments: AdminPaymentListItem[];
  onReconcile: (id: string) => void;
  reconcilePendingId?: string | null;
};

export function AdminPaymentsTable({ payments, onReconcile, reconcilePendingId }: Props) {
  if (payments.length === 0) return null;

  return (
    <div className="hidden overflow-x-auto rounded-xl border border-border/80 md:block">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border bg-bg-muted/60 text-text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Pago</th>
            <th className="px-4 py-3 font-medium">Orden / evento</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium">Monto</th>
            <th className="px-4 py-3 font-medium">Getnet</th>
            <th className="px-4 py-3 font-medium">Alta</th>
            <th className="px-4 py-3 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-b border-border/50 align-top">
              <td className="px-4 py-3">
                <p className="font-mono text-xs text-text">{p.id.slice(0, 12)}…</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <AdminPaymentProviderBadge provider={p.provider} />
                  {p.requiresManualReview ? <AdminManualReviewBadge /> : null}
                </div>
              </td>
              <td className="px-4 py-3">
                <p className="text-text">{p.eventTitle ?? '—'}</p>
                <p className="text-xs text-text-muted">{p.buyerEmail ?? '—'}</p>
                <p className="font-mono text-xs text-text-muted">
                  {p.orderId ? `${p.orderId.slice(0, 10)}…` : '—'} · {p.orderStatus ?? '—'}
                </p>
              </td>
              <td className="px-4 py-3">
                <AdminPaymentStatusBadge status={p.status} />
                {p.reconciliationReason ? (
                  <p className="mt-1 text-xs text-amber-400/90">{p.reconciliationReason}</p>
                ) : null}
              </td>
              <td className="px-4 py-3 tabular-nums text-text">
                {formatMoney(p.amount, p.currency)}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-text-muted">
                {p.externalReference?.slice(0, 14) ?? '—'}
              </td>
              <td className="px-4 py-3 text-text-muted">{formatDt(p.createdAt)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1">
                  <Link
                    href={`/admin/pagos/${p.id}`}
                    className="text-accent hover:underline"
                  >
                    Ver detalle
                  </Link>
                  {p.provider === 'GETNET' ? (
                    <button
                      type="button"
                      className="text-left text-xs text-text-muted hover:text-text disabled:opacity-50"
                      disabled={reconcilePendingId === p.id}
                      onClick={() => onReconcile(p.id)}
                    >
                      {reconcilePendingId === p.id ? 'Reconciliando…' : 'Reconciliar'}
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

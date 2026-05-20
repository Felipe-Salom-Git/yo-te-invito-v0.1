'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { adminGastroKeys } from '@/lib/query/keys';
import type { AdminGastroDiscountListItem } from '@/repositories/interfaces';
import { AdminGastroDiscountStatusBadge } from './AdminGastroDiscountStatusBadge';
import { AdminGastroDiscountMetricsPanel } from './AdminGastroDiscountMetricsPanel';

const PENDING_STATUSES = ['PENDING_REVIEW', 'COMMISSION_NEGOTIATION', 'APPROVED'] as const;

type Props = {
  profileId: string;
  discounts: AdminGastroDiscountListItem[];
};

export function AdminGastroDiscountsTable({ profileId, discounts }: Props) {
  const repos = useRepositories();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const metricsQuery = useQuery({
    queryKey: adminGastroKeys.metrics(profileId, expandedId ?? ''),
    queryFn: () => repos.adminGastro.getDiscountMetrics(profileId, expandedId!),
    enabled: !!expandedId,
  });

  if (discounts.length === 0) {
    return <p className="text-text-muted">Este local no tiene tickets de descuento.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border bg-bg-muted text-text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Ticket</th>
            <th className="px-4 py-3 font-medium">Fecha</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium">Validaciones</th>
            <th className="px-4 py-3 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {discounts.map((d) => {
            const expanded = expandedId === d.id;
            const isPending = PENDING_STATUSES.includes(
              d.status as (typeof PENDING_STATUSES)[number],
            );
            return (
              <Fragment key={d.id}>
                <tr
                  className={`border-b border-border/60 ${isPending ? 'bg-accent/5' : ''}`}
                >
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="font-medium text-text hover:text-accent"
                      onClick={() => setExpandedId(expanded ? null : d.id)}
                    >
                      {d.title ?? 'Sin título'}
                    </button>
                    {d.summary && (
                      <p className="mt-0.5 max-w-xs truncate text-xs text-text-muted">
                        {d.summary}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {d.discountDate
                      ? new Date(d.discountDate).toLocaleDateString('es-AR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <AdminGastroDiscountStatusBadge status={d.status} />
                  </td>
                  <td className="px-4 py-3 text-text-muted">{d.validationCount}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/gastronomicos/${profileId}/descuentos/${d.id}`}
                      className="text-accent hover:underline"
                    >
                      Revisar y publicar →
                    </Link>
                  </td>
                </tr>
                {expanded && (
                  <tr>
                    <td colSpan={5} className="bg-bg-muted/30 px-4 py-4">
                      <AdminGastroDiscountMetricsPanel
                        metrics={metricsQuery.data}
                        isLoading={metricsQuery.isLoading}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

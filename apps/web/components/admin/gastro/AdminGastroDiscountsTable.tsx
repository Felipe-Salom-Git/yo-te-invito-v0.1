'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  GASTRO_WEEKDAY_LABELS_ES,
  resolveCourtesyBenefitLabel,
  type GastroWeekday,
} from '@yo-te-invito/shared';
import { GastroDiscountKindBadge } from '@/components/gastro/GastroDiscountKindBadge';
import { GastroCourtesyStatusBadge } from '@/components/gastro/courtesy/GastroCourtesyStatusBadge';
import { formatCourtesyAudience } from '@/lib/gastro/courtesy-portal';
import { useRepositories } from '@/repositories/context';
import { adminGastroKeys } from '@/lib/query/keys';
import type { AdminGastroDiscountListItem } from '@/repositories/interfaces';
import { AdminGastroDiscountStatusBadge } from './AdminGastroDiscountStatusBadge';
import { GastroDiscountOperationalMetricsPanel } from '@/components/gastro/GastroDiscountOperationalMetricsPanel';
import { formatGastroDiscountValidityRangeLabel } from '@/lib/gastro/discount-status-ui';

const PENDING_STATUSES = ['PENDING_REVIEW', 'COMMISSION_NEGOTIATION', 'APPROVED'] as const;

type Props = {
  profileId: string;
  discounts: AdminGastroDiscountListItem[];
};

export function AdminGastroDiscountsTable({ profileId, discounts }: Props) {
  const repos = useRepositories();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const metricsQuery = useQuery({
    queryKey: adminGastroKeys.operationalMetrics(profileId, expandedId ?? ''),
    queryFn: () => repos.adminGastro.getDiscountOperationalMetrics(profileId, expandedId!),
    enabled: !!expandedId,
  });

  if (discounts.length === 0) {
    return <p className="text-text-muted">No hay descuentos ni cortesías en esta sección.</p>;
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
            const isCourtesy = d.visibility === 'COURTESY_ONLY';
            const isPending =
              PENDING_STATUSES.includes(d.status as (typeof PENDING_STATUSES)[number]) ||
              Boolean(d.hasPendingUpdate);
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
                      {(isCourtesy ? d.courtesy?.title : null) ?? d.title ?? 'Sin título'}
                    </button>
                    {isCourtesy ? (
                      <p className="mt-0.5 max-w-xs truncate text-xs text-text-muted">
                        {resolveCourtesyBenefitLabel(d.courtesy, d.title)}
                      </p>
                    ) : d.summary && (
                      <p className="mt-0.5 max-w-xs truncate text-xs text-text-muted">
                        {d.summary}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {d.validityMode === 'WEEKLY_RECURRING' && d.validWeekday
                      ? `Todos los ${GASTRO_WEEKDAY_LABELS_ES[d.validWeekday as GastroWeekday]}`
                      : formatGastroDiscountValidityRangeLabel(
                          d.validFrom,
                          d.validTo,
                          d.discountDate,
                        ) ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <GastroDiscountKindBadge visibility={d.visibility} />{' '}
                    {isCourtesy ? (
                      <GastroCourtesyStatusBadge
                        status={d.status}
                        archivedAt={d.archivedAt}
                        validTo={d.courtesy?.validTo ?? d.validTo}
                      />
                    ) : (
                      <AdminGastroDiscountStatusBadge status={d.status} />
                    )}
                    {isCourtesy && d.courtesy?.metrics ? (
                      <p className="mt-1 text-xs text-text-muted">
                        {formatCourtesyAudience(d.courtesy.metrics)} · Retenidos{' '}
                        {d.courtesy.metrics.retainedClaims} · Disponibles{' '}
                        {d.courtesy.metrics.availableClaims} · Entregados{' '}
                        {d.courtesy.metrics.deliveredClaims} · Usados {d.courtesy.metrics.usedClaims} ·
                        Cancelados {d.courtesy.metrics.cancelledClaims}
                      </p>
                    ) : null}
                    {d.reviewKind === 'NEW' && !d.hasPendingUpdate && (
                      <span className="ml-2 inline-flex rounded-full bg-sky-500/15 px-2 py-0.5 text-xs text-sky-300">
                        Nuevo pendiente
                      </span>
                    )}
                    {d.hasPendingUpdate && (
                      <span className="ml-2 inline-flex rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">
                        Edición pendiente
                      </span>
                    )}
                    {d.createdByOrigin === 'ADMIN' && (
                      <span className="ml-2 inline-flex rounded-full bg-violet-500/15 px-2 py-0.5 text-xs text-violet-300">
                        Creado por Admin
                      </span>
                    )}
                    {d.createdByOrigin === 'GASTRO' && (
                      <span className="ml-2 inline-flex rounded-full bg-zinc-500/15 px-2 py-0.5 text-xs text-zinc-300">
                        Creado por Gastro
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{d.validationCount}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/gastronomicos/${profileId}/descuentos/${d.id}`}
                      className="text-accent hover:underline"
                    >
                      {isCourtesy ? 'Revisar cortesía →' : 'Revisar y publicar →'}
                    </Link>
                  </td>
                </tr>
                {expanded && (
                  <tr>
                    <td colSpan={5} className="bg-bg-muted/30 px-4 py-4">
                      {metricsQuery.isLoading ? (
                        <p className="text-sm text-text-muted">Cargando métricas…</p>
                      ) : metricsQuery.data ? (
                        <GastroDiscountOperationalMetricsPanel
                          metrics={metricsQuery.data}
                          isCourtesy={isCourtesy}
                        />
                      ) : null}
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

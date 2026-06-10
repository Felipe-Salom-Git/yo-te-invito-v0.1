'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import type { AdminReviewsReportQuery, PublicReviewCategory } from '@yo-te-invito/shared';
import {
  PageContainer,
  SectionTitle,
  Button,
  PageLoader,
  QueryError,
  EmptyState,
} from '@/components';
import { useAdminReviewsReport } from '@/lib/query/admin-reviews-report';
import { getErrorMessage } from '@/lib/errors';
import { formatPublicRatingLabel } from '@/lib/reviews/ratingDisplay';
import { downloadAdminReviewsReportCsv } from '@/lib/admin/download-reviews-report-csv';
import {
  ADMIN_REVIEW_CATEGORY_LABELS,
  adminReviewSignalLabel,
} from '@/lib/admin/admin-reviews-report-labels';
import { AdminDashboardKpiCard } from '@/components/admin/dashboard/AdminDashboardKpiCard';

const CATEGORY_OPTIONS: Array<{ value: '' | PublicReviewCategory; label: string }> = [
  { value: '', label: 'Todas las verticales' },
  { value: 'event', label: 'Eventos' },
  { value: 'gastro', label: 'Gastro' },
  { value: 'rental', label: 'Rentals' },
  { value: 'excursion', label: 'Excursiones' },
  { value: 'hotel', label: 'Hoteles' },
];

export function AdminReviewsReportPageClient() {
  const { status } = useSession();
  const [category, setCategory] = useState<'' | PublicReviewCategory>('');
  const [days, setDays] = useState(90);
  const [exporting, setExporting] = useState<'problematic' | 'disputes' | null>(null);

  const query = useMemo<AdminReviewsReportQuery>(
    () => ({
      days,
      ...(category ? { category } : {}),
    }),
    [category, days],
  );

  const reportQuery = useAdminReviewsReport(query, status === 'authenticated');

  const handleExport = async (dataset: 'problematic' | 'disputes') => {
    setExporting(dataset);
    try {
      await downloadAdminReviewsReportCsv({ ...query, dataset });
    } catch (e) {
      window.alert(getErrorMessage(e));
    } finally {
      setExporting(null);
    }
  };

  if (reportQuery.isLoading) {
    return (
      <PageContainer>
        <PageLoader message="Cargando reporte de reputación…" />
      </PageContainer>
    );
  }

  if (reportQuery.isError) {
    return (
      <PageContainer>
        <SectionTitle>Reputación y moderación</SectionTitle>
        <QueryError
          className="mt-6"
          message={getErrorMessage(reportQuery.error)}
          onRetry={() => void reportQuery.refetch()}
        />
      </PageContainer>
    );
  }

  const report = reportQuery.data;
  const kpis = report?.kpis;
  const isEmpty =
    (kpis?.totalPublicReviews ?? 0) === 0 &&
    (kpis?.totalHiddenReviews ?? 0) === 0 &&
    (kpis?.openDisputes ?? 0) === 0;

  return (
    <PageContainer>
      <Link href="/admin" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Administración
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <SectionTitle>Reputación y moderación</SectionTitle>
          <p className="mt-1 max-w-2xl text-sm text-text-muted">
            Resumen de reseñas públicas y disputas. No incluye valoraciones comerciales B2B
            (productora ↔ referido).
          </p>
          {report?.scopeNote ? (
            <p className="mt-2 text-xs text-text-muted">{report.scopeNote}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href="/admin/review-disputes">
            <Button variant="outline">Cola de disputas</Button>
          </Link>
          <Button
            variant="outline"
            disabled={exporting != null}
            onClick={() => void handleExport('problematic')}
          >
            {exporting === 'problematic' ? 'Exportando…' : 'CSV señales'}
          </Button>
          <Button
            variant="outline"
            disabled={exporting != null}
            onClick={() => void handleExport('disputes')}
          >
            {exporting === 'disputes' ? 'Exportando…' : 'CSV disputas'}
          </Button>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap gap-3 rounded-xl border border-border/80 bg-bg-muted/40 p-4">
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          Vertical
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as '' | PublicReviewCategory)}
            className="rounded border border-border bg-bg px-3 py-2 text-sm text-text"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          Ventana reciente (días)
          <input
            type="number"
            min={1}
            max={365}
            value={days}
            onChange={(e) => setDays(Number(e.target.value) || 90)}
            className="w-28 rounded border border-border bg-bg px-3 py-2 text-sm text-text"
          />
        </label>
      </div>

      {isEmpty ? (
        <div className="mt-8">
          <EmptyState
            title="Sin datos de reputación todavía"
            description="Cuando existan reseñas públicas o disputas, verás KPIs y señales acá."
            actionLabel="Ir a disputas"
            actionHref="/admin/review-disputes"
          />
        </div>
      ) : (
        <>
          <section className="mt-8" aria-label="Indicadores de reputación">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <AdminDashboardKpiCard
                label="Reseñas públicas"
                value={kpis?.totalPublicReviews ?? 0}
                hint="Visibles en fichas públicas"
              />
              <AdminDashboardKpiCard
                label="Reseñas ocultas"
                value={kpis?.totalHiddenReviews ?? 0}
                hint="Moderación o disputa aceptada"
              />
              <AdminDashboardKpiCard
                label="Disputas abiertas"
                value={kpis?.openDisputes ?? 0}
                hint="Pendientes o en revisión"
              />
              <AdminDashboardKpiCard
                label="Disputas cerradas"
                value={kpis?.closedDisputes ?? 0}
                hint="Aceptadas, rechazadas o resueltas"
              />
            </div>
          </section>

          <section className="mt-10" aria-labelledby="vertical-summary-heading">
            <h2 id="vertical-summary-heading" className="text-lg font-semibold text-text">
              Promedio por vertical
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Promedio sobre reseñas públicas visibles (visual 5/5; interno 1–10 en export CSV).
            </p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-border/80">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border bg-bg-muted/50 text-xs uppercase text-text-muted">
                  <tr>
                    <th className="px-4 py-3">Vertical</th>
                    <th className="px-4 py-3">Total reseñas</th>
                    <th className="px-4 py-3">Públicas</th>
                    <th className="px-4 py-3">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {(report?.byVertical ?? []).map((row) => (
                    <tr key={row.category} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 font-medium text-text">
                        {ADMIN_REVIEW_CATEGORY_LABELS[row.category]}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-text-muted">{row.reviewCount}</td>
                      <td className="px-4 py-3 tabular-nums text-text-muted">
                        {row.publicReviewCount}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-text">
                        {row.averageRating != null ? formatPublicRatingLabel(row.averageRating) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-10" aria-labelledby="problematic-heading">
            <h2 id="problematic-heading" className="text-lg font-semibold text-text">
              Señales recientes
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Baja puntuación, disputa abierta u ocultadas en los últimos {days} días.
            </p>
            {(report?.problematicReviews ?? []).length === 0 ? (
              <p className="mt-4 text-sm text-text-muted">No hay señales en este filtro.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {(report?.problematicReviews ?? []).map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-col gap-3 rounded-lg border border-border/80 bg-bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase text-text-muted">
                          {adminReviewSignalLabel(row.signal)}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {ADMIN_REVIEW_CATEGORY_LABELS[row.eventCategory]}
                        </span>
                      </div>
                      <p className="mt-1 font-medium text-text">{row.eventTitle}</p>
                      <p className="mt-0.5 text-sm text-text-muted">
                        {row.userDisplayName} · {formatPublicRatingLabel(row.overallRating)} · {row.status}
                        {row.hiddenFromPublic ? ' · oculta' : ''}
                      </p>
                    </div>
                    <Link
                      href={row.href}
                      className="shrink-0 text-sm font-medium text-accent hover:underline"
                    >
                      Ver en cola →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-10" aria-labelledby="top-disputes-heading">
            <h2 id="top-disputes-heading" className="text-lg font-semibold text-text">
              Entidades con más disputas
            </h2>
            {(report?.topDisputedEntities ?? []).length === 0 ? (
              <p className="mt-4 text-sm text-text-muted">Sin disputas registradas.</p>
            ) : (
              <ul className="mt-4 space-y-3 md:hidden">
                {(report?.topDisputedEntities ?? []).map((row) => (
                  <li
                    key={row.eventId}
                    className="rounded-lg border border-border/80 bg-bg-muted/30 p-4"
                  >
                    <p className="font-medium text-text">{row.eventTitle}</p>
                    <p className="mt-1 text-sm text-text-muted">
                      {ADMIN_REVIEW_CATEGORY_LABELS[row.eventCategory]}
                      {row.producerDisplayName ? ` · ${row.producerDisplayName}` : ''}
                    </p>
                    <p className="mt-2 text-sm tabular-nums text-text">
                      {row.disputeCount} disputa{row.disputeCount === 1 ? '' : 's'} (
                      {row.openDisputeCount} abierta
                      {row.openDisputeCount === 1 ? '' : 's'})
                    </p>
                    <Link href={row.href} className="mt-2 inline-block text-sm text-accent hover:underline">
                      Ver cola filtrada →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {(report?.topDisputedEntities ?? []).length > 0 ? (
              <div className="mt-4 hidden overflow-x-auto rounded-xl border border-border/80 md:block">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-border bg-bg-muted/50 text-xs uppercase text-text-muted">
                    <tr>
                      <th className="px-4 py-3">Entidad</th>
                      <th className="px-4 py-3">Vertical</th>
                      <th className="px-4 py-3">Productor</th>
                      <th className="px-4 py-3">Disputas</th>
                      <th className="px-4 py-3">Abiertas</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {(report?.topDisputedEntities ?? []).map((row) => (
                      <tr key={row.eventId} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-3 font-medium text-text">{row.eventTitle}</td>
                        <td className="px-4 py-3 text-text-muted">
                          {ADMIN_REVIEW_CATEGORY_LABELS[row.eventCategory]}
                        </td>
                        <td className="px-4 py-3 text-text-muted">
                          {row.producerDisplayName ?? '—'}
                        </td>
                        <td className="px-4 py-3 tabular-nums">{row.disputeCount}</td>
                        <td className="px-4 py-3 tabular-nums">{row.openDisputeCount}</td>
                        <td className="px-4 py-3 text-right">
                          <Link href={row.href} className="text-accent hover:underline">
                            Cola
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        </>
      )}

      {report?.generatedAt ? (
        <p className="mt-8 text-xs text-text-muted">
          Generado: {new Date(report.generatedAt).toLocaleString('es-AR')}
        </p>
      ) : null}
    </PageContainer>
  );
}

'use client';

import { EmptyState, QueryError, Skeleton } from '@/components';
import { ReferralMetricsKpiGrid, moneyKpi } from '@/components/referrals/ReferralMetricsKpiGrid';
import { useProducerReferralMetrics } from '@/hooks/useProducerReferralMetrics';
import { formatMoneyCents } from '@/lib/producer/referral-display';
import { getErrorMessage } from '@/lib/errors';
import type {
  ProducerReferralMetricsByEvent,
  ProducerReferralMetricsByReferrer,
} from '@yo-te-invito/shared';

function ReferrerMetricsTable({ rows }: { rows: ProducerReferralMetricsByReferrer[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-text-muted">
        Sin actividad de referidos todavía.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-bg-muted/50 text-xs uppercase tracking-wide text-text-muted">
            <th className="px-4 py-3">Referido</th>
            <th className="px-4 py-3">Eventos</th>
            <th className="px-4 py-3">Entradas</th>
            <th className="px-4 py-3">Ventas atribuidas</th>
            <th className="px-4 py-3">Comisión generada</th>
            <th className="px-4 py-3">Pend. solicitar</th>
            <th className="px-4 py-3">Sol. pago</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.referrerProfileId} className="border-b border-border/60">
              <td className="px-4 py-3">
                <p className="font-medium text-text">{r.displayName}</p>
                {r.publicHandle && (
                  <p className="font-mono text-xs text-accent">@{r.publicHandle}</p>
                )}
              </td>
              <td className="px-4 py-3 text-text-muted">{r.eventsPromotedCount}</td>
              <td className="px-4 py-3">{r.ticketsSoldCount}</td>
              <td className="px-4 py-3">{formatMoneyCents(r.attributedGrossCents)}</td>
              <td className="px-4 py-3 text-accent">{formatMoneyCents(r.commissionGeneratedCents)}</td>
              <td className="px-4 py-3">{formatMoneyCents(r.commissionPendingToRequestCents)}</td>
              <td className="px-4 py-3">{r.pendingPaymentRequestsCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EventMetricsTable({ rows }: { rows: ProducerReferralMetricsByEvent[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-8">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Por evento</h3>
      <div className="mt-3 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-muted/50 text-xs uppercase tracking-wide text-text-muted">
              <th className="px-4 py-3">Evento</th>
              <th className="px-4 py-3">Links</th>
              <th className="px-4 py-3">Referidos</th>
              <th className="px-4 py-3">Entradas</th>
              <th className="px-4 py-3">Ventas atribuidas</th>
              <th className="px-4 py-3">Comisión generada</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((ev) => (
              <tr key={ev.eventId} className="border-b border-border/60">
                <td className="px-4 py-3 font-medium text-text">{ev.eventTitle}</td>
                <td className="px-4 py-3">{ev.activeLinksCount}</td>
                <td className="px-4 py-3">{ev.participatingReferrersCount}</td>
                <td className="px-4 py-3">{ev.ticketsSoldCount}</td>
                <td className="px-4 py-3">{formatMoneyCents(ev.attributedGrossCents)}</td>
                <td className="px-4 py-3 text-accent">{formatMoneyCents(ev.commissionGeneratedCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ProducerReferralMetricsPanel() {
  const { data, isLoading, isError, error, refetch } = useProducerReferralMetrics();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return <QueryError message={getErrorMessage(error)} onRetry={() => void refetch()} />;
  }

  if (!data) {
    return <EmptyState title="Sin métricas" description="No hay datos de referidos disponibles." />;
  }

  const g = data.global;
  const kpis = [
    { label: 'Referidos activos', value: String(g.activeReferrersCount), hint: 'Asociación ACTIVE' },
    { label: 'Propuestas pendientes', value: String(g.pendingProposalsCount) },
    { label: 'Links activos', value: String(g.activeLinksCount) },
    { label: 'Entradas vendidas', value: String(g.ticketsSoldCount), hint: 'Vía links de referido (PAID)' },
    {
      label: 'Ventas atribuidas',
      value: moneyKpi(g.attributedGrossCents),
      hint: 'Monto bruto de pedidos pagos',
    },
    {
      label: 'Comisión generada',
      value: moneyKpi(g.commissionGeneratedCents),
      hint: 'Según acuerdos y ventas confirmadas',
      accent: true,
    },
    {
      label: 'Pendiente de solicitar',
      value: moneyKpi(g.commissionPendingToRequestCents),
      hint: 'Comisión generada aún no incluida en solicitud abierta',
    },
    {
      label: 'Solicitudes en revisión',
      value: String(g.paymentRequestsPendingCount),
      hint: 'Enviadas o en gestión',
    },
    {
      label: 'Marcado pagado (externo)',
      value: moneyKpi(g.paymentRequestsMarkedPaidCents),
      hint: `${g.paymentRequestsMarkedPaidCount} solicitud(es) cerradas`,
    },
  ];

  return (
    <section className="space-y-6">
      <ReferralMetricsKpiGrid items={kpis} />
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Por referido</h3>
        <div className="mt-3">
          <ReferrerMetricsTable rows={data.byReferrer} />
        </div>
      </div>
      {data.byEvent && data.byEvent.length > 0 && <EventMetricsTable rows={data.byEvent} />}
    </section>
  );
}

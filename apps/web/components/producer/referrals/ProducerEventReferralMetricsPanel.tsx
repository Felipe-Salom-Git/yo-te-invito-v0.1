'use client';

import { QueryError, Skeleton } from '@/components';
import { ReferralMetricsKpiGrid, moneyKpi } from '@/components/referrals/ReferralMetricsKpiGrid';
import { ReferralLegalDisclaimer } from '@/components/producer/referrals/ReferralLegalDisclaimer';
import { useProducerEventReferralMetrics } from '@/hooks/useProducerReferralMetrics';
import { formatMoneyCents } from '@/lib/producer/referral-display';
import { getErrorMessage } from '@/lib/errors';

type Props = {
  eventId: string;
};

export function ProducerEventReferralMetricsPanel({ eventId }: Props) {
  const { data, isLoading, isError, error, refetch } = useProducerEventReferralMetrics(eventId);

  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-xl" />;
  }

  if (isError) {
    return <QueryError message={getErrorMessage(error)} onRetry={() => void refetch()} />;
  }

  if (!data) return null;

  const g = data.global;
  const kpis = [
    { label: 'Referidos en evento', value: String(g.activeReferrersCount) },
    { label: 'Propuestas pendientes', value: String(g.pendingProposalsCount) },
    { label: 'Links activos', value: String(g.activeLinksCount) },
    { label: 'Entradas vendidas', value: String(g.ticketsSoldCount) },
    { label: 'Ventas atribuidas', value: moneyKpi(g.attributedGrossCents) },
    {
      label: 'Comisión generada',
      value: moneyKpi(g.commissionGeneratedCents),
      accent: true,
    },
    { label: 'Pendiente de solicitar', value: moneyKpi(g.commissionPendingToRequestCents) },
    { label: 'Solicitudes pendientes', value: String(g.paymentRequestsPendingCount) },
  ];

  return (
    <section className="space-y-6">
      <ReferralLegalDisclaimer variant="compact" />
      <ReferralMetricsKpiGrid items={kpis} />
      {data.byReferrer.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-text-muted">
          Sin ventas atribuidas por referidos en este evento todavía.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-muted/50 text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-3">Referido</th>
                <th className="px-4 py-3">Entradas</th>
                <th className="px-4 py-3">Ventas atribuidas</th>
                <th className="px-4 py-3">Comisión generada</th>
              </tr>
            </thead>
            <tbody>
              {data.byReferrer.map((r) => (
                <tr key={r.referrerProfileId} className="border-b border-border/60">
                  <td className="px-4 py-3 font-medium text-text">{r.displayName}</td>
                  <td className="px-4 py-3">{r.ticketsSoldCount}</td>
                  <td className="px-4 py-3">{formatMoneyCents(r.attributedGrossCents)}</td>
                  <td className="px-4 py-3 text-accent">
                    {formatMoneyCents(r.commissionGeneratedCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

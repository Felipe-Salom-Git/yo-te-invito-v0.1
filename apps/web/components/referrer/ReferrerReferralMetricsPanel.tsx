'use client';

import { QueryError, Skeleton } from '@/components';
import { ReferralMetricsKpiGrid, moneyKpi } from '@/components/referrals/ReferralMetricsKpiGrid';
import { ReferrerLegalDisclaimer } from '@/components/referrer/ReferrerLegalDisclaimer';
import { useReferrerReferralMetrics } from '@/hooks/useReferrerReferralMetrics';
import {
  formatCommissionValue,
  formatMoneyCents,
  paymentRequestStatusLabel,
} from '@/lib/producer/referral-display';
import { getErrorMessage } from '@/lib/errors';

export function ReferrerReferralMetricsPanel() {
  const { data, isLoading, isError, error, refetch } = useReferrerReferralMetrics();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return <QueryError message={getErrorMessage(error)} onRetry={() => void refetch()} />;
  }

  if (!data) return null;

  const g = data.global;
  const kpis = [
    { label: 'Propuestas pendientes', value: String(g.pendingProposalsCount) },
    { label: 'Acuerdos activos', value: String(g.activeAgreementsCount) },
    { label: 'Links activos', value: String(g.activeLinksCount) },
    { label: 'Entradas vendidas', value: String(g.ticketsSoldCount), hint: 'Pedidos PAID atribuidos' },
    {
      label: 'Ventas atribuidas',
      value: moneyKpi(g.attributedGrossCents),
      hint: 'Bruto de pedidos pagos',
    },
    {
      label: 'Comisión generada',
      value: moneyKpi(g.commissionGeneratedCents),
      accent: true,
    },
    {
      label: 'Pendiente de solicitar',
      value: moneyKpi(g.commissionPendingToRequestCents),
      hint: 'Podés incluir en una solicitud de pago',
    },
    {
      label: 'Solicitudes en revisión',
      value: String(g.paymentRequestsInReviewCount),
    },
    {
      label: 'Marcado pagado por productora',
      value: moneyKpi(g.markedPaidByProducerCents),
      hint: 'Pago externo registrado',
    },
  ];

  return (
    <section className="space-y-6">
      <ReferrerLegalDisclaimer variant="compact" />
      <ReferralMetricsKpiGrid items={kpis} />
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
          Por productora y evento
        </h3>
        {data.byAgreement.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-text-muted">
            Sin acuerdos comerciales activos todavía.
          </p>
        ) : (
          <ul className="mt-3 space-y-3 lg:hidden">
            {data.byAgreement.map((a) => (
              <li key={a.agreementId} className="rounded-xl border border-border bg-bg-muted/30 p-4">
                <p className="font-medium text-text">{a.producerDisplayName}</p>
                <p className="text-sm text-text-muted">{a.eventTitle}</p>
                <p className="mt-2 font-mono text-xs text-accent">{a.referralCode}</p>
                <p className="mt-2 text-xs text-text-muted">
                  Comisión pactada:{' '}
                  {formatCommissionValue(a.commissionType, a.commissionValue)}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <span>Entradas: {a.ticketsSoldCount}</span>
                  <span>Ventas: {formatMoneyCents(a.attributedGrossCents)}</span>
                  <span className="text-accent">
                    Generada: {formatMoneyCents(a.commissionGeneratedCents)}
                  </span>
                  <span>
                    {a.paymentRequestStatus
                      ? paymentRequestStatusLabel(a.paymentRequestStatus)
                      : 'Sin solicitud'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        {data.byAgreement.length > 0 && (
          <div className="mt-3 hidden overflow-x-auto rounded-xl border border-border lg:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-muted/50 text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3">Productora</th>
                  <th className="px-4 py-3">Evento</th>
                  <th className="px-4 py-3">Link</th>
                  <th className="px-4 py-3">Entradas</th>
                  <th className="px-4 py-3">Ventas atribuidas</th>
                  <th className="px-4 py-3">Comisión generada</th>
                  <th className="px-4 py-3">Solicitud</th>
                </tr>
              </thead>
              <tbody>
                {data.byAgreement.map((a) => (
                  <tr key={a.agreementId} className="border-b border-border/60">
                    <td className="px-4 py-3">{a.producerDisplayName}</td>
                    <td className="px-4 py-3">{a.eventTitle}</td>
                    <td className="px-4 py-3 font-mono text-xs text-accent">{a.referralCode}</td>
                    <td className="px-4 py-3">{a.ticketsSoldCount}</td>
                    <td className="px-4 py-3">{formatMoneyCents(a.attributedGrossCents)}</td>
                    <td className="px-4 py-3 text-accent">
                      {formatMoneyCents(a.commissionGeneratedCents)}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {a.paymentRequestStatus
                        ? paymentRequestStatusLabel(a.paymentRequestStatus)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

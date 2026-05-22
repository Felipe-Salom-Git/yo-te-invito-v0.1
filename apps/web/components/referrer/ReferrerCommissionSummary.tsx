'use client';

import { useSession } from 'next-auth/react';
import { QueryError, Skeleton } from '@/components';
import { ReferrerLegalDisclaimer } from '@/components/referrer/ReferrerLegalDisclaimer';
import { useReferrerCommissionSummary } from '@/hooks/useReferrerCommissionSummary';
import {
  COMMISSION_RULES_PENDING_NOTICE,
  commissionStatusLabel,
  formatMoneyCents,
  paymentRequestStatusLabel,
} from '@/lib/producer/referral-display';
import { getErrorMessage } from '@/lib/errors';
import { useReferrerPaymentRequests } from '@/hooks/useReferrerPaymentRequests';

function SummaryStat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-4 shadow-sm ${
        accent ? 'border-accent/40 bg-accent/5' : 'border-border bg-bg-muted/50'
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${accent ? 'text-accent' : 'text-text'}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

export function ReferrerCommissionSummary() {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;
  const { summary, isLoading, isError, error, refetch } = useReferrerCommissionSummary(userId);
  const { data: paymentRequestsData } = useReferrerPaymentRequests();

  const openPaymentRequests =
    paymentRequestsData?.paymentRequests?.filter(
      (r) => r.status === 'REQUESTED' || r.status === 'IN_REVIEW',
    ).length ?? summary?.pendingRequestsCount ?? 0;

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return <QueryError message={getErrorMessage(error)} onRetry={() => void refetch()} />;
  }

  if (!summary) {
    return <p className="text-sm text-text-muted">Sin datos de comisiones.</p>;
  }

  return (
    <div className="space-y-6">
      <ReferrerLegalDisclaimer />

      <p className="text-sm text-text-muted">{COMMISSION_RULES_PENDING_NOTICE}</p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryStat
          label="Entradas vendidas por link"
          value={String(summary.ticketsSoldViaLinks)}
          hint="Tickets en pedidos PAID atribuidos a tus códigos."
        />
        <SummaryStat
          label="Monto vendido atribuido"
          value={formatMoneyCents(summary.attributedGrossCents)}
          hint="Total bruto de pedidos pagados (no es comisión)."
        />
        <SummaryStat
          label="Comisión generada"
          value={formatMoneyCents(summary.generatedCommissionCents)}
          hint="Según acuerdos y ventas confirmadas en la plataforma."
          accent
        />
        <SummaryStat
          label="Monto a solicitar a la productora"
          value={formatMoneyCents(summary.amountToRequestCents)}
          hint="Comisiones confirmadas aún no marcadas como pagadas externamente."
        />
        <SummaryStat
          label="Solicitudes de pago pendientes"
          value={String(openPaymentRequests)}
          hint="Enviadas a la productora y en gestión."
        />
        <SummaryStat
          label="Pagos marcados por productora"
          value={formatMoneyCents(summary.markedPaidCents)}
          hint="Pago externo registrado en la plataforma."
        />
      </div>

      {summary.v2Commissions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
            Detalle por venta atribuida
          </h3>
          <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
            {summary.v2Commissions.slice(0, 50).map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-bg-muted/40 px-3 py-2 text-sm"
              >
                <span className="text-text-muted">
                  {commissionStatusLabel(c.status)}
                  {c.ticketQuantity != null ? ` · ${c.ticketQuantity} entradas` : ''}
                </span>
                <span className="font-medium text-accent">{formatMoneyCents(c.amountCents)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(paymentRequestsData?.paymentRequests?.length ?? 0) > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
            Últimas solicitudes de pago
          </h3>
          <ul className="mt-3 space-y-2">
            {paymentRequestsData!.paymentRequests.slice(0, 5).map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-bg-muted/40 px-3 py-2 text-sm"
              >
                <span className="text-text">
                  {r.producerProfile?.displayName ?? 'Productora'} ·{' '}
                  {paymentRequestStatusLabel(r.status)}
                </span>
                <span className="font-medium text-accent">
                  {formatMoneyCents(r.amountRequestedCents)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

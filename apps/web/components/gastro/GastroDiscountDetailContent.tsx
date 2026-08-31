'use client';

import Link from 'next/link';
import { GASTRO_WEEKDAY_LABELS_ES, type GastroDiscountSummaryResponse, type GastroWeekday } from '@yo-te-invito/shared';
import { Button } from '@/components';
import { AdminGastroDiscountStatusBadge } from '@/components/admin/gastro/AdminGastroDiscountStatusBadge';
import { formatGastroDiscountValidityRangeLabel } from '@/lib/gastro/discount-status-ui';

type Props = {
  summary: GastroDiscountSummaryResponse;
  editHref?: string;
  qrStudioHref?: string;
  onActivate?: () => void;
  onDeactivate?: () => void;
  statusLoading?: boolean;
};

function formatDt(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

function claimStatusLabel(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'Disponible',
    USED: 'Usado',
    EXPIRED: 'Vencido',
    CANCELLED: 'Cancelado',
  };
  return map[status] ?? status;
}

export function GastroDiscountDetailContent({
  summary,
  editHref,
  qrStudioHref,
  onActivate,
  onDeactivate,
  statusLoading,
}: Props) {
  const { discount, metrics, claims, hasExistingClaims } = summary;
  const canToggleStatus = ['ACTIVE', 'APPROVED', 'CANCELLED'].includes(discount.status);
  const isActive = discount.status === 'ACTIVE';

  const validityLabel =
    discount.validityMode === 'WEEKLY_RECURRING' && discount.validWeekday
      ? `Todos los ${GASTRO_WEEKDAY_LABELS_ES[discount.validWeekday as GastroWeekday]}`
      : formatGastroDiscountValidityRangeLabel(
          discount.validFrom,
          discount.validTo,
          discount.discountDate,
        ) ?? '—';

  const metricCards = [
    { label: 'Emitidos', value: metrics.totalClaims },
    { label: 'Disponibles', value: metrics.availableClaims },
    { label: 'Escaneados', value: metrics.usedClaims },
    { label: 'Vencidos', value: metrics.expiredClaims },
    { label: 'Cancelados', value: metrics.cancelledClaims },
    { label: 'Emails enviados', value: metrics.emailSentCount },
    { label: 'Emails fallidos', value: metrics.emailFailedCount },
  ];

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-border bg-bg-muted/40 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-text">
              {discount.title ?? 'Descuento sin título'}
            </h1>
            {discount.locationName ? (
              <p className="mt-1 text-sm text-text-muted">{discount.locationName}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <AdminGastroDiscountStatusBadge status={discount.status} />
              <span className="text-sm text-text-muted">{validityLabel}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {editHref ? (
              <Link href={editHref}>
                <Button variant="outline" type="button">
                  Editar
                </Button>
              </Link>
            ) : null}
            {qrStudioHref ? (
              <Link href={qrStudioHref}>
                <Button variant="outline" type="button">
                  Diseñar QR
                </Button>
              </Link>
            ) : null}
            {canToggleStatus && onDeactivate && isActive ? (
              <Button
                variant="outline"
                type="button"
                disabled={statusLoading}
                onClick={onDeactivate}
              >
                Desactivar
              </Button>
            ) : null}
            {canToggleStatus && onActivate && !isActive ? (
              <Button type="button" disabled={statusLoading} onClick={onActivate}>
                Activar
              </Button>
            ) : null}
          </div>
        </div>
        {discount.summary ? (
          <p className="mt-3 text-sm text-text-muted">{discount.summary}</p>
        ) : null}
      </header>

      {hasExistingClaims ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Este descuento ya tiene cupones emitidos. Los cambios afectarán futuras validaciones de
          cupones disponibles.
        </p>
      ) : null}

      <section aria-label="Métricas del descuento">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Métricas
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metricCards.map((card) => (
            <div
              key={card.label}
              className={`rounded-lg border border-border bg-bg-muted/30 px-4 py-3 ${
                card.label === 'Emails fallidos' && card.value > 0
                  ? 'border-rose-500/40 bg-rose-500/5'
                  : ''
              }`}
            >
              <p className="text-xs text-text-muted">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold text-text">{card.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Cupones emitidos">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Cupones ({claims.length})
        </h2>
        {claims.length === 0 ? (
          <p className="text-sm text-text-muted">Todavía no hay cupones emitidos para este descuento.</p>
        ) : (
          <div className="space-y-3">
            {claims.map((claim) => (
              <article
                key={claim.id}
                className="rounded-lg border border-border bg-bg-muted/20 p-4 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-text">{claim.email}</p>
                    {claim.userName ? (
                      <p className="text-xs text-text-muted">{claim.userName}</p>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-bg px-2 py-0.5 text-xs text-text-muted">
                    {claimStatusLabel(claim.status)}
                  </span>
                </div>
                <dl className="mt-3 grid gap-1 text-xs text-text-muted sm:grid-cols-2">
                  <div>
                    <dt className="inline">Origen: </dt>
                    <dd className="inline">
                      {claim.type === 'COURTESY' ? 'Cortesía' : 'Público'} · {claim.source}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline">Emitido: </dt>
                    <dd className="inline">{formatDt(claim.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="inline">Escaneado: </dt>
                    <dd className="inline">{formatDt(claim.usedAt)}</dd>
                  </div>
                  <div>
                    <dt className="inline">Email: </dt>
                    <dd className={`inline ${claim.emailSendError ? 'text-rose-400' : ''}`}>
                      {claim.emailSentAt
                        ? `Enviado ${formatDt(claim.emailSentAt)}`
                        : claim.emailSendError
                          ? `Error: ${claim.emailSendError}`
                          : 'Sin envío'}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

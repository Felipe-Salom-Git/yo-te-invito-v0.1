import type { GastroDiscountSummaryCourtesy } from '@yo-te-invito/shared';
import {
  buildCourtesyMetricCards,
  formatCourtesyAudience,
} from '@/lib/gastro/courtesy-portal';

function formatDt(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

type Props = {
  courtesy: GastroDiscountSummaryCourtesy | null | undefined;
  rejectionReason?: string | null;
  /** ADMIN also sees claims pending (re)delivery. */
  includePendingDelivery?: boolean;
};

/**
 * G8.9 — Courtesy campaign detail: benefit, vigencia, frozen audience and G8.8 metrics.
 * Legacy rows without campaign data degrade gracefully (G8.10.10).
 */
export function GastroCourtesyDetailPanel({ courtesy, rejectionReason, includePendingDelivery }: Props) {
  if (!courtesy) {
    return (
      <p className="rounded-lg border border-border bg-bg-muted/30 px-4 py-3 text-sm text-text-muted">
        Esta cortesía no tiene datos de campaña registrados (cortesía histórica).
      </p>
    );
  }
  const cards = buildCourtesyMetricCards(courtesy.metrics, { includePendingDelivery });
  return (
    <section aria-label="Detalle de la cortesía" className="space-y-4">
      <dl className="grid gap-x-6 gap-y-2 rounded-lg border border-border bg-bg-muted/30 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-text-muted">Beneficio</dt>
          <dd className="text-text">{courtesy.benefitLabel}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Vigencia</dt>
          <dd className="text-text">
            {formatDt(courtesy.validFrom)} → {formatDt(courtesy.validTo)}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Destinatarios</dt>
          <dd className="text-text">{formatCourtesyAudience(courtesy.metrics)}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Origen</dt>
          <dd className="text-text">
            {courtesy.createdByOrigin === 'ADMIN' ? 'Creada por administración' : 'Solicitada por el local'}
            {courtesy.createdAt ? ` · ${formatDt(courtesy.createdAt)}` : ''}
          </dd>
        </div>
        {courtesy.description ? (
          <div className="sm:col-span-2">
            <dt className="text-text-muted">Descripción</dt>
            <dd className="whitespace-pre-wrap text-text">{courtesy.description}</dd>
          </div>
        ) : null}
        {courtesy.message ? (
          <div className="sm:col-span-2">
            <dt className="text-text-muted">Mensaje al destinatario</dt>
            <dd className="whitespace-pre-wrap text-text">{courtesy.message}</dd>
          </div>
        ) : null}
        {rejectionReason ? (
          <div className="sm:col-span-2">
            <dt className="text-text-muted">Motivo del rechazo</dt>
            <dd className="whitespace-pre-wrap text-text">{rejectionReason}</dd>
          </div>
        ) : null}
      </dl>
      <p className="text-xs text-text-muted">
        La audiencia quedó fijada al enviar la solicitud y no se recalcula.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.key}
            className="rounded-lg border border-border bg-bg-muted/30 px-4 py-3"
          >
            <p className="text-xs text-text-muted">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold text-text">{card.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

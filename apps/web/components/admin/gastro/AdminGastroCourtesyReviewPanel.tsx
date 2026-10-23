'use client';

import {
  isCourtesyPendingApproval,
  resolveCourtesyBenefitLabel,
} from '@yo-te-invito/shared';
import type { AdminGastroDiscountDetail } from '@/repositories/interfaces';
import { GastroCourtesyStatusBadge } from '@/components/gastro/courtesy/GastroCourtesyStatusBadge';
import { buildCourtesyMetricCards, formatCourtesyAudience } from '@/lib/gastro/courtesy-portal';

type Props = {
  item: AdminGastroDiscountDetail;
  /** Whether the local has a CURRENT commercial agreement (approval gate). */
  hasCurrentAgreement: boolean;
  agreementLoading: boolean;
};

function fmt(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-AR');
}

/**
 * G8.3 / G8.10.2 — What an ADMIN needs to review a courtesy: local, campaign, benefit, frozen
 * audience, retained claims, validity, origin + requester and state. Reuses the discount
 * review page; courtesies have no publication images, no master QR and no public listing.
 * Legacy rows without campaign / requester history are shown gracefully (G8.10.10).
 */
export function AdminGastroCourtesyReviewPanel({
  item,
  hasCurrentAgreement,
  agreementLoading,
}: Props) {
  const c = item.courtesy;
  const pending = isCourtesyPendingApproval(item.status);
  const cards = c?.metrics ? buildCourtesyMetricCards(c.metrics, { includePendingDelivery: true }) : [];
  return (
    <section className="mt-6 rounded-lg border border-border bg-bg-muted/50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
          Revisión de cortesía
        </h3>
        <span className="inline-flex rounded-full bg-violet-500/15 px-2 py-0.5 text-xs text-violet-300">
          Cortesía
        </span>
        <GastroCourtesyStatusBadge
          status={item.status}
          archivedAt={item.archivedAt}
          validTo={c?.validTo ?? item.validTo}
        />
      </div>
      {!c ? (
        <p className="mt-3 text-sm text-text-muted">
          Cortesía histórica sin datos de campaña registrados. Se puede administrar igual (cancelar,
          archivar); no requiere historial de aprobación ni de acuerdo.
        </p>
      ) : null}
      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-text-muted">Local</dt>
          <dd className="text-text">{item.profileName ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Campaña</dt>
          <dd className="text-text">{c?.title ?? item.title ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Beneficio</dt>
          <dd className="text-text">{resolveCourtesyBenefitLabel(c, item.title)}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Destinatarios</dt>
          <dd className="text-text">
            {c?.metrics ? formatCourtesyAudience(c.metrics) : (c?.recipientCount ?? 0)}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Validez</dt>
          <dd className="text-text">
            {fmt(c?.validFrom ?? item.validFrom)} → {fmt(c?.validTo ?? item.validTo)}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Origen</dt>
          <dd className="text-text">
            {item.createdByOrigin === 'ADMIN' ? 'Admin' : 'Gastro (owner)'}
            {c?.createdAt ? ` · ${fmt(c.createdAt)}` : ''}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Solicitado por</dt>
          <dd className="text-text">
            {c?.createdBy
              ? [c.createdBy.name, c.createdBy.email].filter(Boolean).join(' · ') || c.createdBy.id
              : 'Sin registro'}
          </dd>
        </div>
        {c?.description ? (
          <div className="sm:col-span-2">
            <dt className="text-text-muted">Descripción</dt>
            <dd className="whitespace-pre-wrap text-text">{c.description}</dd>
          </div>
        ) : null}
        {c?.message ? (
          <div className="sm:col-span-2">
            <dt className="text-text-muted">Mensaje al destinatario</dt>
            <dd className="whitespace-pre-wrap text-text">{c.message}</dd>
          </div>
        ) : null}
        {item.status === 'REJECTED' && item.rejectionReason ? (
          <div className="sm:col-span-2">
            <dt className="text-text-muted">Motivo del rechazo</dt>
            <dd className="whitespace-pre-wrap text-text">{item.rejectionReason}</dd>
          </div>
        ) : null}
      </dl>

      {cards.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {cards.map((card) => (
            <div key={card.key} className="rounded-lg border border-border bg-bg px-3 py-2">
              <p className="text-xs text-text-muted">{card.label}</p>
              <p className="mt-0.5 text-xl font-semibold text-text">{card.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {pending ? (
        <p className="mt-3 text-xs text-text-muted">
          Los {c?.recipientCount ?? 0} destinatarios ya están definidos y sus cupones quedan
          retenidos: no se pueden escanear, canjear ni ven la cortesía hasta que la apruebes. Al
          aprobar se entregan por email a esos mismos destinatarios.
        </p>
      ) : null}
      {pending && !agreementLoading && !hasCurrentAgreement ? (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
          Aprobación bloqueada: este local no posee un acuerdo comercial vigente.
        </p>
      ) : null}
    </section>
  );
}

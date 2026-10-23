'use client';

import type { AdminGastroDiscountDetail } from '@/repositories/interfaces';

type Props = {
  item: AdminGastroDiscountDetail;
  /** Whether the local has a CURRENT commercial agreement (approval gate). */
  hasCurrentAgreement: boolean;
  agreementLoading: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_REVIEW: 'Pendiente',
  COMMISSION_NEGOTIATION: 'Pendiente (en coordinación)',
  ACTIVE: 'Aprobada / activa',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Vencida',
};

function fmt(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-AR');
}

/**
 * G8.3 — What an ADMIN needs to review a courtesy: local, campaign, benefit, recipients,
 * validity, origin and status. Reuses the discount review page; courtesies have no
 * publication images, no master QR and no public listing.
 */
export function AdminGastroCourtesyReviewPanel({
  item,
  hasCurrentAgreement,
  agreementLoading,
}: Props) {
  const c = item.courtesy;
  const pending = ['PENDING_REVIEW', 'COMMISSION_NEGOTIATION'].includes(item.status);
  return (
    <section className="mt-6 rounded-lg border border-border bg-bg-muted/50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
          Revisión de cortesía
        </h3>
        <span className="inline-flex rounded-full bg-violet-500/15 px-2 py-0.5 text-xs text-violet-300">
          Cortesía
        </span>
      </div>
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
          <dd className="text-text">{c?.discountLabel ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Destinatarios</dt>
          <dd className="text-text">{c?.recipientCount ?? 0}</dd>
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
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Estado</dt>
          <dd className="text-text">{STATUS_LABEL[item.status] ?? item.status}</dd>
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
      </dl>

      {pending ? (
        <p className="mt-3 text-xs text-text-muted">
          Los {c?.recipientCount ?? 0} destinatarios ya están definidos y sus cupones quedan
          retenidos: no se pueden escanear, canjear ni ven la cortesía hasta que la apruebes. Al
          aprobar se entregan por email a esos mismos destinatarios.
        </p>
      ) : null}
      {pending && !agreementLoading && !hasCurrentAgreement ? (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
          Aprobación bloqueada: el local no tiene acuerdo comercial vigente.
        </p>
      ) : null}
      {!pending && c && item.status === 'ACTIVE' ? (
        <p className="mt-3 text-xs text-text-muted">
          Entregadas: {c.deliveredCount ?? 0} · Pendientes de entrega: {c.pendingDeliveryCount ?? 0}{' '}
          · Canjeadas: {c.usedCount ?? 0}
        </p>
      ) : null}
    </section>
  );
}

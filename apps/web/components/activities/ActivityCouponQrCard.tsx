'use client';

import { Logo } from '@/components/brand/Logo';
import { TicketQrImage } from '@/components/tickets/TicketQrImage';
import { isValidActivityCouponQrPayload } from '@yo-te-invito/shared';

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activo',
  USED: 'Usado',
  EXPIRED: 'Vencido',
  CANCELLED: 'Cancelado',
};

export function ActivityCouponQrCard({
  activityName,
  couponTitle,
  benefitLabel,
  qrPayload,
  shortCodeDisplay,
  status,
  validTo,
  className = '',
}: {
  activityName: string;
  couponTitle: string;
  benefitLabel: string;
  qrPayload: string;
  shortCodeDisplay?: string | null;
  status: string;
  validTo?: string | null;
  className?: string;
}) {
  const blocked = status !== 'ACTIVE';
  const qrOk = isValidActivityCouponQrPayload(qrPayload);
  const validToLabel = validTo
    ? new Date(validTo).toLocaleDateString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
      })
    : null;

  return (
    <article
      className={`mx-auto w-full max-w-sm overflow-hidden rounded-xl border-2 border-accent/30 bg-gradient-to-b from-bg-muted to-bg shadow-lg ${className}`}
    >
      <div className="border-b border-border bg-bg-muted/80 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <Logo variant="auth" showText className="shrink-0" />
          <span className="inline-flex items-center rounded px-2 py-1 text-xs font-medium text-text-muted">
            {STATUS_LABELS[status] ?? status}
          </span>
        </div>
      </div>
      <div className="px-5 py-5">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">Cupón de Actividad</p>
        <h2 className="mt-1 text-xl font-semibold leading-tight text-text">{benefitLabel}</h2>
        <p className="mt-1 text-sm text-text">{couponTitle}</p>
        <p className="mt-2 text-sm text-text-muted">{activityName}</p>
        {validToLabel ? (
          <p className="mt-3 text-xs text-text-muted">Vence {validToLabel}</p>
        ) : null}
        {shortCodeDisplay ? (
          <p className="mt-3 font-mono text-lg tracking-widest text-text">{shortCodeDisplay}</p>
        ) : null}
        <div className="mt-5 flex justify-center">
          {blocked || !qrOk ? (
            <p className="text-sm text-text-muted">QR no disponible</p>
          ) : (
            <TicketQrImage qrPayload={qrPayload} sizePx={280} alt="Código QR del cupón" />
          )}
        </div>
      </div>
    </article>
  );
}

'use client';

import type { GastroDiscountClaimStatus, GastroDiscountClaimType } from '@yo-te-invito/shared';
import { Logo } from '@/components/brand/Logo';
import { TicketQrImage } from '@/components/tickets/TicketQrImage';
import { isValidGastroDiscountQrPayload } from '@/lib/gastro/discount-qr';
import {
  formatGastroDiscountValidTo,
  GASTRO_DISCOUNT_STATUS_LABELS,
  GASTRO_DISCOUNT_STATUS_STYLES,
  GASTRO_DISCOUNT_TYPE_LABELS,
  isGastroDiscountQrBlocked,
} from '@/lib/gastro/discount-status-ui';

export type GastroDiscountQrCardProps = {
  locationName: string;
  discountTitle: string;
  discountDescription?: string | null;
  discountLabel?: string | null;
  qrPayload: string;
  qrCode?: string;
  status: GastroDiscountClaimStatus;
  validTo?: string | null;
  type?: GastroDiscountClaimType;
  className?: string;
};

export function GastroDiscountQrCard({
  locationName,
  discountTitle,
  discountDescription,
  discountLabel,
  qrPayload,
  qrCode,
  status,
  validTo,
  type,
  className = '',
}: GastroDiscountQrCardProps) {
  const blocked = isGastroDiscountQrBlocked(status);
  const qrOk = isValidGastroDiscountQrPayload(qrPayload);
  const validToLabel = formatGastroDiscountValidTo(validTo);
  const benefit = discountLabel?.trim() || discountTitle;

  return (
    <article
      className={`mx-auto w-full max-w-sm overflow-hidden rounded-xl border-2 border-accent/30 bg-gradient-to-b from-bg-muted to-bg shadow-lg ${className}`}
    >
      <div className="border-b border-border bg-bg-muted/80 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <Logo variant="auth" showText className="shrink-0" />
          <span
            className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ${GASTRO_DISCOUNT_STATUS_STYLES[status]}`}
          >
            {GASTRO_DISCOUNT_STATUS_LABELS[status]}
          </span>
        </div>
      </div>

      <div className="relative px-5 py-5">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          Cupón de descuento
        </p>
        <h2 className="mt-1 text-xl font-semibold leading-tight text-text">{benefit}</h2>
        <p className="mt-2 text-sm text-text-muted">{locationName}</p>

        {discountDescription?.trim() ? (
          <p className="mt-3 text-sm text-text-muted">{discountDescription.trim()}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-text-muted">
          {type ? (
            <span className="rounded border border-border px-2 py-1">
              {GASTRO_DISCOUNT_TYPE_LABELS[type]}
            </span>
          ) : null}
          {validToLabel ? (
            <span className="rounded border border-border px-2 py-1">
              Vence {validToLabel}
            </span>
          ) : null}
          {qrCode ? (
            <span className="rounded border border-border px-2 py-1 font-mono">
              {qrCode.slice(0, 8)}…
            </span>
          ) : null}
        </div>

        <div className="relative mt-6 flex justify-center">
          {qrOk ? (
            <>
              <TicketQrImage qrPayload={qrPayload} sizePx={280} alt="Código QR del descuento" />
              {blocked ? (
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/45"
                  role="presentation"
                />
              ) : null}
            </>
          ) : (
            <div className="flex h-[280px] w-full max-w-[280px] items-center justify-center rounded-lg border border-dashed border-border bg-bg px-4 text-center text-sm text-text-muted">
              QR no disponible
            </div>
          )}
        </div>

        {status === 'USED' ? (
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-sm text-amber-200">
            Este cupón ya fue utilizado.
          </p>
        ) : null}
        {status === 'EXPIRED' ? (
          <p className="mt-4 rounded-lg border border-border bg-bg-muted px-3 py-2 text-center text-sm text-text-muted">
            La fecha de validez de este descuento ya finalizó.
          </p>
        ) : null}
        {status === 'CANCELLED' ? (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-sm text-red-300">
            Este cupón fue cancelado.
          </p>
        ) : null}

        <p className="mt-4 text-center text-xs text-text-muted">
          {blocked
            ? 'Este código no puede usarse en su estado actual.'
            : 'Presentá este QR en el local para aplicar el beneficio.'}
        </p>
        <p className="mt-2 text-center text-xs text-text-muted">Uso único</p>
      </div>
    </article>
  );
}

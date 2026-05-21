'use client';

import { useMemo } from 'react';
import type { MeTicketDetail } from '@yo-te-invito/shared';
import { ticketTextShadowCss } from '@/lib/producer/ticket-studio-text-shadow';
import {
  parseBuyerTemplate,
  type ParsedBuyerTemplate,
} from '@/lib/tickets/ticket-template-parse';
import {
  resolveBuyerDynamicField,
  type BuyerTicketFieldContext,
} from '@/lib/tickets/buyer-ticket-fields';
import { qrPixelSizeFromZone } from '@/lib/tickets/qr-display';
import { anyElementHitsQr } from '@/lib/producer/ticket-studio-qr-rules';
import { TicketEntryStatusBanner } from './TicketEntryStatusBanner';
import { TicketQrImage } from './TicketQrImage';
import {
  isTicketEntryBlocked,
  ticketStatusOverlayLabel,
} from '@/lib/tickets/ticket-status-ui';

type Props = {
  ticket: MeTicketDetail;
  template: ParsedBuyerTemplate;
  className?: string;
};

export function TicketTemplateRenderer({ ticket, template, className = '' }: Props) {
  const ctx: BuyerTicketFieldContext = { ticket };
  const blocked = isTicketEntryBlocked(ticket.status);
  const overlayLabel = ticketStatusOverlayLabel(ticket.status);

  const sorted = useMemo(
    () => [...template.elements].sort((a, b) => a.zIndex - b.zIndex),
    [template.elements],
  );

  const { canvasWidth, canvasHeight } = template;
  const bgStyle =
    template.backgroundType === 'IMAGE'
      ? {
          backgroundImage: `url(${template.backgroundValue})`,
          backgroundSize: 'cover' as const,
          backgroundPosition: 'center' as const,
        }
      : { backgroundColor: template.backgroundValue };

  const qr = template.qrZone;
  const qrSizePx = qrPixelSizeFromZone(canvasWidth, canvasHeight, qr.w, qr.h);
  const qrObstructed = anyElementHitsQr(sorted, qr);

  return (
    <div
      className={`mx-auto w-full ${className}`}
      style={{ maxWidth: `${Math.min(440, canvasWidth * 1.35)}px` }}
    >
      {qrObstructed && (
        <p className="mb-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 print:text-amber-900">
          Algunas capas del diseño pueden tapar el QR. Si el escaneo falla, pedí a la productora que
          ajuste la plantilla en Ticket Canvas Studio.
        </p>
      )}
      <div
        className="ticket-template-canvas relative w-full overflow-hidden rounded-xl border-2 border-border shadow-lg print:shadow-none"
        style={{ aspectRatio: `${canvasWidth} / ${canvasHeight}` }}
      >
        <div className="absolute inset-0 overflow-hidden rounded-[10px]" style={bgStyle}>
          {sorted.map((el) => {
            const fs = el.style?.fontSize ?? 14;
            const ta = el.style?.textAlign ?? 'left';
            const textShadowCss = ticketTextShadowCss(el.style?.textShadow);
            const textPadClass =
              (el.type === 'TEXT' || el.type === 'DYNAMIC') && el.style?.backgroundColor?.trim()
                ? 'px-1 py-px'
                : 'px-0.5';

            return (
              <div
                key={el.id}
                className="absolute flex items-start overflow-hidden"
                style={{
                  left: `${el.x * 100}%`,
                  top: `${el.y * 100}%`,
                  width: `${el.w * 100}%`,
                  height: `${el.h * 100}%`,
                  zIndex: el.zIndex,
                  justifyContent:
                    ta === 'center' ? 'center' : ta === 'right' ? 'flex-end' : 'flex-start',
                  opacity: el.style?.opacity ?? 1,
                  borderRadius: el.style?.borderRadius
                    ? `${(el.style.borderRadius * 100).toFixed(0)}%`
                    : undefined,
                  backgroundColor: el.style?.backgroundColor,
                }}
              >
                {el.type === 'TEXT' ? (
                  <span
                    className={`w-full break-words ${textPadClass}`}
                    style={{
                      color: el.style?.color ?? '#fff',
                      fontWeight: (el.style?.fontWeight as string) ?? '400',
                      fontSize: `clamp(9px, ${fs * 0.85}px, ${fs * 1.35}px)`,
                      textAlign: ta,
                      textShadow: textShadowCss,
                    }}
                  >
                    {el.content ?? ''}
                  </span>
                ) : null}
                {el.type === 'DYNAMIC' && el.fieldKey ? (
                  <span
                    className={`w-full break-words ${textPadClass}`}
                    style={{
                      color: el.style?.color ?? '#e5e5e5',
                      fontSize: `clamp(8px, ${(el.style?.fontSize ?? 12) * 0.85}px, 18px)`,
                      textAlign: ta,
                      textShadow: textShadowCss,
                    }}
                  >
                    {resolveBuyerDynamicField(el.fieldKey, ctx)}
                  </span>
                ) : null}
                {(el.type === 'IMAGE' || el.type === 'LOGO') && el.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={el.imageUrl}
                    alt=""
                    className="h-full w-full object-contain"
                    draggable={false}
                  />
                ) : null}
                {el.type === 'DIVIDER' ? (
                  <div className="mt-2 h-px w-full bg-white/30" />
                ) : null}
                {el.type === 'SHAPE' ? (
                  <div
                    className="h-full w-full rounded"
                    style={{
                      backgroundColor: el.style?.backgroundColor ?? 'rgba(255,255,255,0.06)',
                    }}
                  />
                ) : null}
              </div>
            );
          })}

          <div
            className="absolute flex items-center justify-center p-[6%]"
            style={{
              left: `${qr.x * 100}%`,
              top: `${qr.y * 100}%`,
              width: `${qr.w * 100}%`,
              height: `${qr.h * 100}%`,
              zIndex: 50,
            }}
          >
            <TicketQrImage
              qrPayload={ticket.qrPayload}
              sizePx={qrSizePx}
              className={blocked ? 'opacity-90' : ''}
            />
          </div>
        </div>

        {overlayLabel && (
          <div
            className="ticket-status-overlay absolute inset-0 z-[60] flex items-center justify-center bg-black/55 print:hidden"
            role="presentation"
          >
            <span className="rounded-lg border border-border bg-bg/95 px-4 py-2 text-center text-base font-semibold text-text shadow-lg">
              {overlayLabel}
            </span>
          </div>
        )}
      </div>
      <TicketEntryStatusBanner status={ticket.status} className="mt-3 print:mt-4" />
    </div>
  );
}

'use client';

import { useMemo } from 'react';
import type {
  DiscountVisualRenderContext,
  GastroDiscountVisualTemplateResponse,
} from '@yo-te-invito/shared';
import { resolveDiscountVisualField } from '@yo-te-invito/shared';
import { ticketTextShadowCss } from '@/lib/producer/ticket-studio-text-shadow';
import { qrPixelSizeFromZone } from '@/lib/tickets/qr-display';
import { TicketQrImage } from '@/components/tickets/TicketQrImage';
import { anyElementHitsQr } from '@/lib/producer/ticket-studio-qr-rules';

type Props = {
  template: GastroDiscountVisualTemplateResponse;
  ctx: DiscountVisualRenderContext;
  qrPayload: string | null;
  blocked?: boolean;
  className?: string;
};

export function DiscountTemplateRenderer({
  template,
  ctx,
  qrPayload,
  blocked = false,
  className = '',
}: Props) {
  const sorted = useMemo(
    () => [...template.elementsJson].sort((a, b) => a.zIndex - b.zIndex),
    [template.elementsJson],
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

  const qr = template.qrZoneJson;
  const qrSizePx = qrPixelSizeFromZone(canvasWidth, canvasHeight, qr.w, qr.h);
  const qrObstructed = anyElementHitsQr(sorted, qr);

  return (
    <div
      className={`mx-auto w-full ${className}`}
      style={{ maxWidth: `${Math.min(440, canvasWidth * 1.35)}px` }}
    >
      {qrObstructed ? (
        <p className="mb-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Algunas capas pueden tapar el QR. Ajustá el diseño en QR Studio.
        </p>
      ) : null}
      <div
        className="relative w-full overflow-hidden rounded-xl border-2 border-border shadow-lg print:shadow-none"
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
                      fontSize: `clamp(8px, ${(el.style?.fontSize ?? 12) * 0.85}px, 22px)`,
                      textAlign: ta,
                      textShadow: textShadowCss,
                    }}
                  >
                    {resolveDiscountVisualField(el.fieldKey, ctx)}
                  </span>
                ) : null}
                {(el.type === 'IMAGE' || el.type === 'LOGO') && el.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={el.imageUrl} alt="" className="h-full w-full object-contain" draggable={false} />
                ) : null}
                {el.type === 'DIVIDER' ? <div className="mt-2 h-px w-full bg-white/30" /> : null}
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
            {qrPayload ? (
              <div className="relative">
                <TicketQrImage qrPayload={qrPayload} sizePx={qrSizePx} alt="Código QR del descuento" />
                {blocked ? (
                  <div className="absolute inset-0 rounded-lg bg-black/45" role="presentation" />
                ) : null}
              </div>
            ) : (
              <div className="flex h-[72%] w-[72%] items-center justify-center bg-white text-[10px] text-black">
                QR
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

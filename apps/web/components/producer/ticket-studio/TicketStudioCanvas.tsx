'use client';

import { useRef, useCallback, useMemo, useState, useEffect } from 'react';
import type { TicketTemplateElement } from '@yo-te-invito/shared';
import type { TicketTemplateQrZoneClient } from '@/repositories/interfaces';
import { clampQrZone } from '@/lib/producer/ticket-studio-qr-rules';
import { resolveDynamicField } from '@/lib/producer/ticket-studio-preview';
import { ticketTextShadowCss } from '@/lib/producer/ticket-studio-text-shadow';
import type { TicketStudioState } from '@/lib/producer/ticket-studio-defaults';

type DragState =
  | { kind: 'element'; id: string; startX: number; startY: number; origX: number; origY: number }
  | { kind: 'qr'; startX: number; startY: number; origX: number; origY: number };

type Props = {
  state: TicketStudioState;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateElement: (id: string, patch: Partial<TicketTemplateElement>) => void;
  onUpdateQr: (qr: TicketTemplateQrZoneClient) => void;
};

function QrPlaceholder() {
  return (
    <div className="flex h-[72%] w-[72%] items-center justify-center bg-white text-black">
      <div className="grid grid-cols-7 grid-rows-7 gap-px p-1">
        {Array.from({ length: 49 }).map((_, i) => (
          <div key={i} className={i % 3 === 0 ? 'h-1 w-1 bg-black' : 'h-1 w-1 bg-white'} />
        ))}
      </div>
    </div>
  );
}

export function TicketStudioCanvas({
  state,
  selectedId,
  onSelect,
  onUpdateElement,
  onUpdateQr,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const sorted = useMemo(
    () => [...state.elementsJson].sort((a, b) => a.zIndex - b.zIndex),
    [state.elementsJson],
  );

  const pxToNorm = useCallback((dxPx: number, dyPx: number) => {
    const el = wrapRef.current;
    if (!el) return { nx: 0, ny: 0 };
    const r = el.getBoundingClientRect();
    return { nx: dxPx / r.width, ny: dyPx / r.height };
  }, []);

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const { nx, ny } = pxToNorm(e.clientX - drag.startX, e.clientY - drag.startY);
      if (drag.kind === 'element') {
        onUpdateElement(drag.id, {
          x: Math.min(1 - 0.02, Math.max(-0.02, drag.origX + nx)),
          y: Math.min(1 - 0.02, Math.max(-0.02, drag.origY + ny)),
        });
      } else {
        onUpdateQr(
          clampQrZone({
            x: drag.origX + nx,
            y: drag.origY + ny,
            w: state.qrZoneJson.w,
            h: state.qrZoneJson.h,
          }),
        );
      }
    };
    const onUp = () => setDrag(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [drag, onUpdateElement, onUpdateQr, pxToNorm, state.qrZoneJson.h, state.qrZoneJson.w]);

  const startElDrag = (id: string, e: React.PointerEvent, el: TicketTemplateElement) => {
    e.stopPropagation();
    onSelect(id);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag({
      kind: 'element',
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: el.x,
      origY: el.y,
    });
  };

  const startQrDrag = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect(null);
    setDrag({
      kind: 'qr',
      startX: e.clientX,
      startY: e.clientY,
      origX: state.qrZoneJson.x,
      origY: state.qrZoneJson.y,
    });
  };

  const bgStyle =
    state.backgroundType === 'IMAGE'
      ? {
          backgroundImage: `url(${state.backgroundValue})`,
          backgroundSize: 'cover' as const,
          backgroundPosition: 'center' as const,
        }
      : { backgroundColor: state.backgroundValue };

  const qr = state.qrZoneJson;

  /**
   * Marco de preview = misma proporción que el canvas.
   * Vertical: lado corto un poco menor (~1" menos de alto en tickets tipo 320×560).
   * Horizontal: sin cambio para seguir legible en ancho.
   */
  const logicalTicketWidth = state.canvasWidth;
  const logicalTicketHeight = state.canvasHeight;
  const previewOrientation: 'vertical' | 'horizontal' =
    logicalTicketWidth > logicalTicketHeight ? 'horizontal' : 'vertical';
  const shortLogical = Math.min(logicalTicketWidth, logicalTicketHeight);
  const shortEdgePreviewPx = previewOrientation === 'horizontal' ? 368 : 210;
  const previewScaleBase = shortEdgePreviewPx / shortLogical;
  const frameMaxWidthPx = logicalTicketWidth * previewScaleBase;

  /** Por encima de capas del template; el stacking global queda acotado por `isolate` + `z-0` en el shell. */
  const qrZoneStackZ = 50;

  return (
    <div
      data-preview-orientation={previewOrientation}
      className="isolate flex w-full justify-center overflow-hidden rounded-lg border border-border/60 bg-bg-muted/25 px-1 py-1.5 sm:px-1.5 sm:py-2"
    >
      <div
        ref={wrapRef}
        className="relative w-full shrink-0 overflow-hidden rounded-xl"
        style={{
          maxWidth: `${frameMaxWidthPx}px`,
          aspectRatio: `${logicalTicketWidth} / ${logicalTicketHeight}`,
        }}
      >
      <div
        className="absolute inset-0 cursor-default overflow-hidden rounded-xl border-2 border-border shadow-lg"
        style={bgStyle}
        onPointerDown={() => onSelect(null)}
      >
        {sorted.map((el) => {
          const sel = el.id === selectedId;
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
              role="button"
              tabIndex={0}
              className={`absolute flex cursor-grab items-start overflow-hidden active:cursor-grabbing ${
                sel ? 'ring-2 ring-accent ring-offset-2 ring-offset-black/20' : ''
              }`}
              style={{
                left: `${el.x * 100}%`,
                top: `${el.y * 100}%`,
                width: `${el.w * 100}%`,
                height: `${el.h * 100}%`,
                zIndex: el.zIndex,
                justifyContent: ta === 'center' ? 'center' : ta === 'right' ? 'flex-end' : 'flex-start',
                opacity: el.style?.opacity ?? 1,
                borderRadius: el.style?.borderRadius ? `${(el.style.borderRadius * 100).toFixed(0)}%` : undefined,
                backgroundColor: el.style?.backgroundColor,
              }}
              onPointerDown={(e) => startElDrag(el.id, e, el)}
            >
              {el.type === 'TEXT' ? (
                <span
                  className={`w-full break-words ${textPadClass}`}
                  style={{
                    color: el.style?.color ?? '#fff',
                    fontWeight: (el.style?.fontWeight as string) ?? '400',
                    fontSize: `clamp(10px, ${fs * 0.9}px, ${fs * 1.4}px)`,
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
                    fontSize: `clamp(9px, ${(el.style?.fontSize ?? 12) * 0.9}px, 18px)`,
                    textAlign: ta,
                    textShadow: textShadowCss,
                  }}
                >
                  {resolveDynamicField(el.fieldKey)}
                </span>
              ) : null}
              {(el.type === 'IMAGE' || el.type === 'LOGO') && el.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={el.imageUrl} alt="" className="h-full w-full object-contain" draggable={false} />
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
          className="absolute flex cursor-grab flex-col items-center justify-center border-2 border-dashed border-accent bg-black/40 p-1 active:cursor-grabbing"
          style={{
            left: `${qr.x * 100}%`,
            top: `${qr.y * 100}%`,
            width: `${qr.w * 100}%`,
            height: `${qr.h * 100}%`,
            zIndex: qrZoneStackZ,
          }}
          onPointerDown={startQrDrag}
        >
          <QrPlaceholder />
          <span className="mt-1 text-[9px] font-medium uppercase tracking-wide text-accent">Zona QR</span>
        </div>
      </div>
      </div>
    </div>
  );
}

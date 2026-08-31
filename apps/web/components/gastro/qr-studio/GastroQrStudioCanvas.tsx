'use client';

import { useRef, useCallback, useMemo, useState, useEffect } from 'react';
import type { DiscountVisualTemplateElement } from '@yo-te-invito/shared';
import { resolveDiscountVisualField, type DiscountVisualRenderContext } from '@yo-te-invito/shared';
import { clampQrZone } from '@/lib/producer/ticket-studio-qr-rules';
import { ticketTextShadowCss } from '@/lib/producer/ticket-studio-text-shadow';

export type GastroQrStudioState = {
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  backgroundType: 'SOLID' | 'IMAGE';
  backgroundValue: string;
  elementsJson: DiscountVisualTemplateElement[];
  qrZoneJson: { x: number; y: number; w: number; h: number };
};

type DragState =
  | { kind: 'element'; id: string; startX: number; startY: number; origX: number; origY: number }
  | { kind: 'qr'; startX: number; startY: number; origX: number; origY: number };

type Props = {
  state: GastroQrStudioState;
  selectedId: string | null;
  previewCtx: DiscountVisualRenderContext;
  onSelect: (id: string | null) => void;
  onUpdateElement: (id: string, patch: Partial<DiscountVisualTemplateElement>) => void;
  onUpdateQr: (qr: GastroQrStudioState['qrZoneJson']) => void;
};

export function GastroQrStudioCanvas({
  state,
  selectedId,
  previewCtx,
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

  const bgStyle =
    state.backgroundType === 'IMAGE'
      ? {
          backgroundImage: `url(${state.backgroundValue})`,
          backgroundSize: 'cover' as const,
          backgroundPosition: 'center' as const,
        }
      : { backgroundColor: state.backgroundValue };

  const qr = state.qrZoneJson;
  const shortLogical = Math.min(state.canvasWidth, state.canvasHeight);
  const previewScaleBase = 210 / shortLogical;
  const frameMaxWidthPx = state.canvasWidth * previewScaleBase;

  return (
    <div className="isolate flex w-full justify-center overflow-hidden rounded-lg border border-border/60 bg-bg-muted/25 px-1 py-1.5">
      <div
        ref={wrapRef}
        className="relative w-full shrink-0 overflow-hidden rounded-xl"
        style={{
          maxWidth: `${frameMaxWidthPx}px`,
          aspectRatio: `${state.canvasWidth} / ${state.canvasHeight}`,
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
                  justifyContent:
                    ta === 'center' ? 'center' : ta === 'right' ? 'flex-end' : 'flex-start',
                  opacity: el.style?.opacity ?? 1,
                  backgroundColor: el.style?.backgroundColor,
                }}
                onKeyDown={(e) => {
                  const step = e.shiftKey ? 0.04 : 0.01;
                  if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    onUpdateElement(el.id, { x: Math.max(0, el.x - step) });
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    onUpdateElement(el.id, { x: Math.min(1 - el.w, el.x + step) });
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    onUpdateElement(el.id, { y: Math.max(0, el.y - step) });
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    onUpdateElement(el.id, { y: Math.min(1 - el.h, el.y + step) });
                  }
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onSelect(el.id);
                  setDrag({
                    kind: 'element',
                    id: el.id,
                    startX: e.clientX,
                    startY: e.clientY,
                    origX: el.x,
                    origY: el.y,
                  });
                }}
              >
                {el.type === 'TEXT' ? (
                  <span
                    className="w-full break-words px-0.5"
                    style={{
                      color: el.style?.color ?? '#fff',
                      fontWeight: el.style?.fontWeight ?? '400',
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
                    className="w-full break-words px-0.5"
                    style={{
                      color: el.style?.color ?? '#e5e5e5',
                      fontSize: `clamp(9px, ${(el.style?.fontSize ?? 12) * 0.9}px, 18px)`,
                      textAlign: ta,
                      textShadow: textShadowCss,
                    }}
                  >
                    {resolveDiscountVisualField(el.fieldKey, previewCtx)}
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
                    style={{ backgroundColor: el.style?.backgroundColor ?? 'rgba(255,255,255,0.06)' }}
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
              zIndex: 50,
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelect(null);
              setDrag({
                kind: 'qr',
                startX: e.clientX,
                startY: e.clientY,
                origX: state.qrZoneJson.x,
                origY: state.qrZoneJson.y,
              });
            }}
          >
            <div className="flex h-[70%] w-[72%] items-center justify-center bg-white text-[10px] font-medium text-black">
              QR
            </div>
            <span className="mt-1 text-[9px] font-medium uppercase tracking-wide text-accent">
              Zona QR
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

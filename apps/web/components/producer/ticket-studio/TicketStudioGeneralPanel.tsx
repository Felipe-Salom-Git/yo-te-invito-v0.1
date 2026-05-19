'use client';

import type { Dispatch, SetStateAction } from 'react';
import { Button } from '@/components';
import type { TicketStudioState } from '@/lib/producer/ticket-studio-defaults';
import {
  applyOrientationWithLayout,
  applySizePreset,
  inferSizePreset,
  type TicketSizePreset,
} from '@/lib/producer/ticket-studio-layout-presets';
import { getCanvasOrientation, type CanvasOrientation } from '@/lib/producer/ticket-studio-orientation';
import { StudioColorField } from './StudioColorField';

export type TicketStudioGeneralPanelProps = {
  state: TicketStudioState;
  setState: Dispatch<SetStateAction<TicketStudioState | null>>;
};

const SIZE_LABELS: { key: TicketSizePreset; label: string; hint: string }[] = [
  { key: 'compact', label: 'Compacto', hint: 'Menor superficie' },
  { key: 'standard', label: 'Estándar', hint: 'Balance' },
  { key: 'large', label: 'Grande', hint: 'Más legible' },
];

/** Orientación y tamaño del ticket (pestaña “Configuración general”). */
export function TicketStudioGeneralSettingsPanel({ state, setState }: TicketStudioGeneralPanelProps) {
  const orientation = getCanvasOrientation(state);
  const sizeKey = state.sizePreset ?? inferSizePreset(state);

  const setOrientation = (next: CanvasOrientation) => {
    setState((s) => (s ? applyOrientationWithLayout(s, next) : s));
  };

  const setSize = (preset: TicketSizePreset) => {
    setState((s) => (s ? applySizePreset(s, preset) : s));
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-bg-muted p-2">
      <div>
        <span className="mb-1.5 block text-sm font-medium text-text">Orientación del ticket</span>
        <div className="flex rounded-lg border border-border p-0.5">
          {(
            [
              { key: 'portrait' as const, label: 'Vertical', hint: 'Portrait' },
              { key: 'landscape' as const, label: 'Horizontal', hint: 'Landscape' },
            ] as const
          ).map(({ key, label, hint }) => (
            <button
              key={key}
              type="button"
              onClick={() => setOrientation(key)}
              className={`flex-1 rounded-md px-1.5 py-1.5 text-center text-xs font-medium transition-colors sm:text-sm ${
                orientation === key
                  ? 'bg-accent text-bg'
                  : 'text-text-muted hover:bg-bg hover:text-text'
              }`}
            >
              <span className="block">{label}</span>
              <span className="block text-[9px] font-normal opacity-80 sm:text-[10px]">{hint}</span>
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-text-muted">
          En <span className="font-medium text-text">horizontal</span> el diseño se reparte en dos columnas: textos a
          la izquierda, QR y códigos (ticket / orden) a la derecha. No es solo girar el lienzo.
        </p>
      </div>

      <div className="border-t border-border pt-2">
        <span className="mb-1.5 block text-sm font-medium text-text">Tamaño del ticket</span>
        <div className="flex flex-col gap-1 rounded-lg border border-border p-0.5 sm:flex-row">
          {SIZE_LABELS.map(({ key, label, hint }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSize(key)}
              className={`flex-1 rounded-md px-1.5 py-1.5 text-center text-xs font-medium transition-colors sm:text-sm ${
                sizeKey === key ? 'bg-accent text-bg' : 'text-text-muted hover:bg-bg hover:text-text'
              }`}
            >
              <span className="block">{label}</span>
              <span className="block text-[9px] font-normal opacity-80 sm:text-[10px]">{hint}</span>
            </button>
          ))}
        </div>
        <p className="mt-1 text-[10px] leading-snug text-text-muted sm:text-[11px]">
          Misma proporción vertical/horizontal; cambia el tamaño en pantalla. Las posiciones normalizadas se mantienen.
        </p>
      </div>
    </div>
  );
}

/** Color sólido / imagen de fondo (pestaña “Fondo”). */
export function TicketStudioBackgroundPanel({ state, setState }: TicketStudioGeneralPanelProps) {
  const imgSource = state.backgroundImageSource ?? 'URL';

  return (
    <div className="space-y-3 rounded-lg border border-border bg-bg-muted p-2">
      <div>
        <span className="mb-1.5 block text-sm font-medium text-text">Fondo</span>
        <div className="mb-2 flex rounded-lg border border-border p-0.5">
          <button
            type="button"
            onClick={() =>
              setState((s) =>
                s
                  ? {
                      ...s,
                      backgroundType: 'SOLID',
                      backgroundValue: s.backgroundType === 'SOLID' ? s.backgroundValue : '#0a0a0a',
                    }
                  : s,
              )
            }
            className={`flex-1 rounded-md px-2 py-1.5 text-sm font-medium ${
              state.backgroundType === 'SOLID'
                ? 'bg-accent text-bg'
                : 'text-text-muted hover:bg-bg hover:text-text'
            }`}
          >
            Color sólido
          </button>
          <button
            type="button"
            onClick={() =>
              setState((s) => {
                if (!s) return s;
                const placeholderSvg =
                  'data:image/svg+xml,' +
                  encodeURIComponent(
                    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="700"><rect fill="#171717" width="100%" height="100%"/></svg>',
                  );
                return {
                  ...s,
                  backgroundType: 'IMAGE',
                  backgroundImageSource: s.backgroundImageSource ?? 'URL',
                  backgroundValue:
                    s.backgroundType === 'IMAGE' && s.backgroundValue && !s.backgroundValue.startsWith('#')
                      ? s.backgroundValue
                      : placeholderSvg,
                };
              })
            }
            className={`flex-1 rounded-md px-2 py-1.5 text-sm font-medium ${
              state.backgroundType === 'IMAGE'
                ? 'bg-accent text-bg'
                : 'text-text-muted hover:bg-bg hover:text-text'
            }`}
          >
            Imagen
          </button>
        </div>

        {state.backgroundType === 'SOLID' ? (
          <StudioColorField
            label="Color de fondo"
            value={state.backgroundValue}
            onChange={(v) => setState((s) => (s ? { ...s, backgroundValue: v } : s))}
          />
        ) : (
          <div className="space-y-2">
            <div className="flex gap-1 rounded-md border border-border p-0.5">
              <button
                type="button"
                onClick={() => setState((s) => (s ? { ...s, backgroundImageSource: 'URL' } : s))}
                className={`flex-1 rounded px-2 py-1 text-xs font-medium ${
                  imgSource === 'URL' ? 'bg-bg text-accent' : 'text-text-muted hover:text-text'
                }`}
              >
                URL
              </button>
              <button
                type="button"
                onClick={() => setState((s) => (s ? { ...s, backgroundImageSource: 'FILE' } : s))}
                className={`flex-1 rounded px-2 py-1 text-xs font-medium ${
                  imgSource === 'FILE' ? 'bg-bg text-accent' : 'text-text-muted hover:text-text'
                }`}
              >
                Archivo local
              </button>
            </div>

            {imgSource === 'URL' ? (
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-text">URL de imagen</span>
                <input
                  type="url"
                  value={state.backgroundValue.startsWith('data:') ? '' : state.backgroundValue}
                  onChange={(e) => setState((s) => (s ? { ...s, backgroundValue: e.target.value } : s))}
                  placeholder="https://…"
                  className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </label>
            ) : (
              <div>
                <span className="mb-1 block text-sm font-medium text-text">Subir imagen</span>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-bg px-2 py-4 text-center text-xs text-text-muted transition-colors hover:border-accent hover:text-text sm:text-sm">
                  <span>Elegí un archivo de imagen</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(ev) => {
                      const f = ev.target.files?.[0];
                      if (!f?.type.startsWith('image/')) return;
                      const reader = new FileReader();
                      reader.onload = () =>
                        setState((s) =>
                          s
                            ? {
                                ...s,
                                backgroundValue: reader.result as string,
                                backgroundImageSource: 'FILE',
                              }
                            : s,
                        );
                      reader.readAsDataURL(f);
                      ev.target.value = '';
                    }}
                  />
                </label>
                <p className="mt-2 text-xs text-text-muted">
                  La imagen se guarda en la plantilla como vista previa (data URL). Ideal para prototipos; más
                  adelante podés reemplazar por URL pública.
                </p>
              </div>
            )}

            <div className="rounded-md border border-border bg-bg/80 p-2">
              <p className="mb-1 text-xs font-medium text-text-muted">Vista previa del fondo</p>
              <div
                className="h-14 w-full rounded bg-cover bg-center sm:h-16"
                style={{
                  backgroundImage:
                    state.backgroundValue && !state.backgroundValue.startsWith('#')
                      ? `url(${state.backgroundValue})`
                      : undefined,
                  backgroundColor: state.backgroundValue.startsWith('#') ? state.backgroundValue : '#1a1a1a',
                }}
              />
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full border-border text-text-muted hover:text-text"
              onClick={() =>
                setState((s) =>
                  s
                    ? {
                        ...s,
                        backgroundType: 'SOLID',
                        backgroundValue: '#0a0a0a',
                        backgroundImageSource: 'URL',
                      }
                    : s,
                )
              }
            >
              Quitar imagen → volver a color sólido
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Panel completo (orientación + tamaño + fondo) — útil si se necesita en otra vista. */
export function TicketStudioGeneralPanel(props: TicketStudioGeneralPanelProps) {
  return (
    <div className="space-y-3">
      <TicketStudioGeneralSettingsPanel {...props} />
      <TicketStudioBackgroundPanel {...props} />
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TicketTemplateElement } from '@yo-te-invito/shared';
import { TICKET_TEMPLATE_DYNAMIC_FIELD_KEYS } from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { ticketTemplateKeys, ticketTypesKeys } from '@/lib/query/keys';
import { Button, Input, Select, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import {
  defaultTicketStudioState,
  newDynamicElement,
  newTextElement,
  templateToStudioState,
  type TicketStudioState,
} from '@/lib/producer/ticket-studio-defaults';
import { anyElementHitsQr, clampQrZone } from '@/lib/producer/ticket-studio-qr-rules';
import { ticketLayerLabel } from '@/lib/producer/ticket-studio-layer-label';
import { TicketStudioCanvas } from './TicketStudioCanvas';
import {
  TicketStudioBackgroundPanel,
  TicketStudioGeneralSettingsPanel,
} from './TicketStudioGeneralPanel';
import type { TicketTextShadowPreset } from '@/lib/producer/ticket-studio-text-shadow';
import { StudioColorField } from './StudioColorField';

type StudioRightTab = 'general' | 'background' | 'layers';

const FIELD_OPTIONS = TICKET_TEMPLATE_DYNAMIC_FIELD_KEYS.map((v) => ({
  value: v,
  label: v,
}));

const TEXT_SHADOW_OPTIONS: { value: TicketTextShadowPreset; label: string }[] = [
  { value: 'none', label: 'Sin sombra' },
  { value: 'subtle', label: 'Sutil' },
  { value: 'medium', label: 'Media' },
  { value: 'strong', label: 'Marcada' },
];

type Props = {
  eventId: string;
  ticketTypeId: string;
  eventTitle: string;
  ticketTypeName: string;
};

const PLACEHOLDER_LOGO_SVG =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="48"><rect fill="#171717" width="120" height="48" rx="4"/><text x="60" y="30" text-anchor="middle" fill="#22c55e" font-size="11" font-family="system-ui">Logo</text></svg>',
  );

function newImageElement(isLogo: boolean): TicketTemplateElement {
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `img-${Date.now()}`;
  return {
    id,
    type: isLogo ? 'LOGO' : 'IMAGE',
    x: 0.35,
    y: 0.08,
    w: 0.3,
    h: 0.12,
    zIndex: 8,
    imageUrl: PLACEHOLDER_LOGO_SVG,
    style: {},
  };
}

export function TicketStudioClient({ eventId, ticketTypeId, eventTitle, ticketTypeName }: Props) {
  const repos = useRepositories();
  const qc = useQueryClient();
  const { addToast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [state, setState] = useState<TicketStudioState | null>(null);
  const [rightToolTab, setRightToolTab] = useState<StudioRightTab>('general');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ticketTemplateKeys.byTicketType(eventId, ticketTypeId),
    queryFn: () => repos.ticketTemplates.get(eventId, ticketTypeId),
  });

  useEffect(() => {
    if (!data) return;
    if (data.template) {
      setState(templateToStudioState(data.template));
    } else {
      setState(defaultTicketStudioState(eventTitle, ticketTypeName));
    }
  }, [data, eventTitle, ticketTypeName]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!state) throw new Error('Sin estado');
      const qr = clampQrZone(state.qrZoneJson);
      if (anyElementHitsQr(state.elementsJson, qr)) {
        throw new Error('Algún elemento tapa la zona QR. Mové las capas o achicá el QR.');
      }
      return repos.ticketTemplates.upsert(eventId, ticketTypeId, {
        name: state.name,
        canvasWidth: state.canvasWidth,
        canvasHeight: state.canvasHeight,
        backgroundType: state.backgroundType,
        backgroundValue: state.backgroundValue,
        elementsJson: state.elementsJson,
        qrZoneJson: qr,
      });
    },
    onSuccess: () => {
      addToast('Plantilla guardada', 'success');
      qc.invalidateQueries({ queryKey: ticketTemplateKeys.byTicketType(eventId, ticketTypeId) });
      qc.invalidateQueries({ queryKey: ticketTypesKeys.producerByEvent(eventId) });
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const resetMut = useMutation({
    mutationFn: () => repos.ticketTemplates.delete(eventId, ticketTypeId),
    onSuccess: () => {
      addToast('Se restauró el diseño base (sin plantilla guardada).', 'success');
      setState(defaultTicketStudioState(eventTitle, ticketTypeName));
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ticketTemplateKeys.byTicketType(eventId, ticketTypeId) });
      qc.invalidateQueries({ queryKey: ticketTypesKeys.producerByEvent(eventId) });
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const updateElement = useCallback((id: string, patch: Partial<TicketTemplateElement>) => {
    setState((s) => {
      if (!s) return s;
      return {
        ...s,
        elementsJson: s.elementsJson.map((el) => (el.id === id ? { ...el, ...patch } : el)),
      };
    });
  }, []);

  const updateQr = useCallback((qr: TicketStudioState['qrZoneJson']) => {
    setState((s) => (s ? { ...s, qrZoneJson: clampQrZone(qr) } : s));
  }, []);

  const removeLayer = useCallback((id: string) => {
    setState((s) => (s ? { ...s, elementsJson: s.elementsJson.filter((e) => e.id !== id) } : s));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  const selected = useMemo(
    () => state?.elementsJson.find((e) => e.id === selectedId) ?? null,
    [state, selectedId],
  );

  const layers = useMemo(
    () => [...(state?.elementsJson ?? [])].sort((a, b) => b.zIndex - a.zIndex),
    [state],
  );

  if (isLoading || !state) {
    return <p className="text-sm text-text-muted">Cargando estudio…</p>;
  }
  if (isError) {
    return <p className="text-sm text-red-400">{getErrorMessage(error)}</p>;
  }

  /**
   * Misma grid en desktop: [capas | preview | propiedades]. En móvil: columna.
   * `main`: ancho tipo horizontal (`max-w` amplio) + altura mínima tipo bloque vertical (`min-h` + flex).
   */
  const studioTabs: { id: StudioRightTab; label: string }[] = [
    { id: 'general', label: 'Configuración general' },
    { id: 'background', label: 'Fondo' },
    { id: 'layers', label: 'Capas' },
  ];

  return (
    <div className="w-full min-w-0 space-y-2">
      <div
        role="tablist"
        aria-label="Secciones del editor"
        className="flex flex-wrap gap-0.5 rounded-lg border border-border bg-bg-muted/50 p-0.5"
      >
        {studioTabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={rightToolTab === id}
            onClick={() => setRightToolTab(id)}
            className={`min-h-8 flex-1 rounded-md px-2 py-1.5 text-center text-[11px] font-medium transition-colors sm:min-h-9 sm:px-2.5 sm:text-xs ${
              rightToolTab === id
                ? 'bg-accent text-bg shadow-sm'
                : 'text-text-muted hover:bg-bg-muted hover:text-text'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="relative z-0 flex min-h-0 w-full min-w-0 flex-col gap-3 lg:grid lg:max-h-[min(88vh,calc(100dvh-10rem))] lg:grid-cols-[minmax(10rem,1fr)_minmax(0,2.05fr)_minmax(14rem,1.5fr)] lg:grid-rows-1 lg:items-start lg:gap-x-3 lg:overflow-hidden">
      <aside className="w-full shrink-0 space-y-2 lg:col-start-1 lg:row-start-1 lg:max-h-[min(88vh,calc(100dvh-10rem))] lg:w-full lg:min-h-0 lg:min-w-0 lg:justify-self-stretch lg:overflow-y-auto lg:self-start">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Capas</h3>
        <ul className="max-h-[36vh] space-y-1 overflow-auto rounded-lg border border-border bg-bg-muted p-1.5 lg:max-h-[min(38vh,16rem)]">
          {layers.map((el) => (
            <li key={el.id}>
              <div
                className={`flex items-stretch gap-1 rounded-md border transition-colors ${
                  el.id === selectedId
                    ? 'border-accent bg-accent/15'
                    : 'border-transparent hover:border-border hover:bg-bg/80'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(el.id);
                    setRightToolTab('layers');
                  }}
                  className="flex min-w-0 flex-1 items-center gap-1.5 px-1.5 py-1.5 text-left"
                >
                  <div
                    className="hidden h-7 w-1 shrink-0 rounded-full bg-accent sm:block"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-text sm:text-sm">{ticketLayerLabel(el)}</div>
                    <div className="text-[10px] text-text-muted">
                      {el.type} · z{el.zIndex}
                    </div>
                  </div>
                </button>
                {(el.type === 'TEXT' || el.type === 'DYNAMIC') && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeLayer(el.id);
                    }}
                    className="shrink-0 rounded-r-md px-2 text-text-muted transition-colors hover:bg-red-500/15 hover:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    aria-label={`Eliminar capa: ${ticketLayerLabel(el)}`}
                    title="Eliminar capa"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                      aria-hidden
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.364 41.364 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM8 3.75V4h4v-.25a1.25 1.25 0 0 0-1.25-1.25h-2.5A1.25 1.25 0 0 0 8 3.75ZM3.13 6l.841 10.517a1.25 1.25 0 0 0 1.243 1.183h4.807a1.25 1.25 0 0 0 1.243-1.183L16.87 6H3.13Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-0.5">
          <Button
            type="button"
            size="xs"
            variant="secondary"
            onClick={() => {
              setSelectedId(null);
              setRightToolTab('layers');
            }}
          >
            Zona QR (mover)
          </Button>
          <Button
            type="button"
            size="xs"
            variant="secondary"
            onClick={() => {
              const el = newTextElement();
              setState((s) =>
                s
                  ? {
                      ...s,
                      elementsJson: [...s.elementsJson, el],
                    }
                  : s,
              );
              setSelectedId(el.id);
              setRightToolTab('layers');
            }}
          >
            + Texto
          </Button>
          <Button
            type="button"
            size="xs"
            variant="secondary"
            onClick={() => {
              const el = newDynamicElement();
              setState((s) =>
                s
                  ? {
                      ...s,
                      elementsJson: [...s.elementsJson, el],
                    }
                  : s,
              );
              setSelectedId(el.id);
              setRightToolTab('layers');
            }}
          >
            + Campo dinámico
          </Button>
          <Button
            type="button"
            size="xs"
            variant="secondary"
            onClick={() => {
              const el = newImageElement(true);
              setState((s) =>
                s
                  ? {
                      ...s,
                      elementsJson: [...s.elementsJson, el],
                    }
                  : s,
              );
              setSelectedId(el.id);
              setRightToolTab('layers');
            }}
          >
            + Logo / imagen
          </Button>
          <Button
            type="button"
            size="xs"
            variant="outline"
            className="text-red-400"
            disabled={!selected}
            onClick={() => selected && removeLayer(selected.id)}
          >
            Eliminar capa seleccionada
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 space-y-2 lg:col-start-2 lg:row-start-1 lg:flex lg:max-h-[min(88vh,calc(100dvh-10rem))] lg:min-h-0 lg:w-full lg:max-w-[min(100%,85vw,72rem)] lg:flex-col lg:justify-self-center">
        <div className="relative isolate z-0 flex h-full min-h-0 flex-1 flex-col gap-1.5 overflow-hidden rounded-lg border border-border bg-bg-muted/40 p-2 sm:gap-2 sm:p-3">
          <p className="shrink-0 text-[11px] leading-snug text-text-muted sm:text-xs">
            Vista previa con datos de ejemplo. El QR real se genera al emitir el ticket; acá solo definís la{' '}
            <span className="text-accent">zona segura</span> para que sea escaneable.
          </p>
          <div className="flex min-h-0 w-full min-w-0 flex-1 items-start justify-center self-stretch overflow-y-auto overflow-x-hidden pt-0.5">
            <TicketStudioCanvas
              state={state}
              selectedId={selectedId}
              onSelect={(id) => {
                setSelectedId(id);
                setRightToolTab('layers');
              }}
              onUpdateElement={updateElement}
              onUpdateQr={updateQr}
            />
          </div>
        </div>
      </main>

      <aside className="w-full shrink-0 space-y-2 lg:col-start-3 lg:row-start-1 lg:max-h-[min(88vh,calc(100dvh-10rem))] lg:w-full lg:min-h-0 lg:min-w-0 lg:justify-self-stretch lg:overflow-y-auto lg:self-start">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          {rightToolTab === 'general' && 'Configuración general'}
          {rightToolTab === 'background' && 'Fondo'}
          {rightToolTab === 'layers' && (selected ? 'Capa seleccionada' : 'Zona QR')}
        </h3>

        {rightToolTab === 'general' ? (
          <div className="space-y-2">
            <div className="space-y-2 rounded-lg border border-border bg-bg-muted p-2">
              <Input density="dense"
                label="Nombre del diseño"
                value={state.name}
                onChange={(e) => setState((s) => (s ? { ...s, name: e.target.value } : s))}
              />
            </div>
            <TicketStudioGeneralSettingsPanel state={state} setState={setState} />
          </div>
        ) : null}

        {rightToolTab === 'background' ? (
          <TicketStudioBackgroundPanel state={state} setState={setState} />
        ) : null}

        {rightToolTab === 'layers' && selected ? (
          <div className="space-y-1.5 rounded-lg border border-border bg-bg-muted p-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-xs font-medium text-text sm:text-sm">
                {selected.type}{' '}
                <span className="text-text-muted">({selected.id.slice(0, 8)}…)</span>
              </p>
              {(selected.type === 'TEXT' || selected.type === 'DYNAMIC') && (
                <button
                  type="button"
                  onClick={() => removeLayer(selected.id)}
                  className="text-xs font-medium text-red-400 underline-offset-2 hover:underline"
                >
                  Eliminar capa
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <Input density="dense"
                label="X"
                type="number"
                step={0.01}
                value={selected.x}
                onChange={(e) =>
                  updateElement(selected.id, { x: parseFloat(e.target.value) || 0 })
                }
              />
              <Input density="dense"
                label="Y"
                type="number"
                step={0.01}
                value={selected.y}
                onChange={(e) =>
                  updateElement(selected.id, { y: parseFloat(e.target.value) || 0 })
                }
              />
              <Input density="dense"
                label="Ancho"
                type="number"
                step={0.01}
                value={selected.w}
                onChange={(e) =>
                  updateElement(selected.id, { w: parseFloat(e.target.value) || 0.1 })
                }
              />
              <Input density="dense"
                label="Alto"
                type="number"
                step={0.01}
                value={selected.h}
                onChange={(e) =>
                  updateElement(selected.id, { h: parseFloat(e.target.value) || 0.05 })
                }
              />
            </div>
            <Input density="dense"
              label="zIndex"
              type="number"
              value={selected.zIndex}
              onChange={(e) =>
                updateElement(selected.id, { zIndex: parseInt(e.target.value, 10) || 0 })
              }
            />
            {selected.type === 'TEXT' ? (
              <Input density="dense"
                label="Texto"
                value={selected.content ?? ''}
                onChange={(e) => updateElement(selected.id, { content: e.target.value })}
              />
            ) : null}
            {selected.type === 'DYNAMIC' ? (
              <Select density="dense"
                label="Campo dinámico"
                value={selected.fieldKey ?? 'eventName'}
                onChange={(e) =>
                  updateElement(selected.id, {
                    fieldKey: e.target.value as TicketTemplateElement['fieldKey'],
                  })
                }
                options={FIELD_OPTIONS}
              />
            ) : null}
            {(selected.type === 'IMAGE' || selected.type === 'LOGO') && (
              <>
                <Input density="dense"
                  label="URL o data URL"
                  value={selected.imageUrl ?? ''}
                  onChange={(e) => updateElement(selected.id, { imageUrl: e.target.value })}
                />
                <label className="block text-xs text-text-muted">
                  Subir archivo
                  <input
                    type="file"
                    accept="image/*"
                    className="mt-1 block w-full text-xs file:mr-2 file:rounded file:border file:border-border file:bg-bg file:px-2 file:py-1 file:text-xs"
                    onChange={(ev) => {
                      const f = ev.target.files?.[0];
                      if (!f?.type.startsWith('image/')) return;
                      const reader = new FileReader();
                      reader.onload = () =>
                        updateElement(selected.id, { imageUrl: reader.result as string });
                      reader.readAsDataURL(f);
                    }}
                  />
                </label>
              </>
            )}
            {(selected.type === 'TEXT' || selected.type === 'DYNAMIC') && (
              <div className="grid grid-cols-2 gap-1.5">
                <Input density="dense"
                  label="Tamaño fuente"
                  type="number"
                  value={selected.style?.fontSize ?? 14}
                  onChange={(e) =>
                    updateElement(selected.id, {
                      style: {
                        ...selected.style,
                        fontSize: parseInt(e.target.value, 10) || 14,
                      },
                    })
                  }
                />
                <div className="col-span-2">
                  <StudioColorField
                    compact
                    label="Color del texto"
                    value={selected.style?.color ?? '#ffffff'}
                    onChange={(v) =>
                      updateElement(selected.id, {
                        style: { ...selected.style, color: v },
                      })
                    }
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <StudioColorField
                    compact
                    label="Fondo del texto"
                    value={selected.style?.backgroundColor ?? ''}
                    onChange={(v) => {
                      const next = { ...selected.style };
                      const t = v.trim();
                      if (!t) delete next.backgroundColor;
                      else next.backgroundColor = t;
                      updateElement(selected.id, { style: next });
                    }}
                  />
                  <p className="text-[10px] leading-snug text-text-muted">
                    Opcional: hex o <code className="text-text-muted/90">rgba(0,0,0,0.5)</code> para contraste sobre la imagen.
                  </p>
                  {selected.style?.backgroundColor?.trim() ? (
                    <button
                      type="button"
                      className="text-xs text-accent underline-offset-2 hover:underline"
                      onClick={() => {
                        const next = { ...selected.style };
                        delete next.backgroundColor;
                        updateElement(selected.id, { style: next });
                      }}
                    >
                      Quitar fondo
                    </button>
                  ) : null}
                </div>
                <div className="col-span-2">
                  <Select density="dense"
                    label="Sombra del texto"
                    value={selected.style?.textShadow ?? 'none'}
                    onChange={(e) => {
                      const v = e.target.value as TicketTextShadowPreset;
                      const style = { ...selected.style };
                      if (v === 'none') delete style.textShadow;
                      else style.textShadow = v;
                      updateElement(selected.id, { style });
                    }}
                    options={TEXT_SHADOW_OPTIONS}
                  />
                </div>
                <div className="col-span-2">
                  <Select density="dense"
                    label="Alineación"
                    value={selected.style?.textAlign ?? 'left'}
                    onChange={(e) =>
                      updateElement(selected.id, {
                        style: {
                          ...selected.style,
                          textAlign: e.target.value as 'left' | 'center' | 'right',
                        },
                      })
                    }
                    options={[
                      { value: 'left', label: 'Izquierda' },
                      { value: 'center', label: 'Centro' },
                      { value: 'right', label: 'Derecha' },
                    ]}
                  />
                </div>
              </div>
            )}
            {selected.type === 'SHAPE' && (
              <StudioColorField
                compact
                label="Color de relleno"
                value={selected.style?.backgroundColor ?? 'rgba(255,255,255,0.08)'}
                onChange={(v) =>
                  updateElement(selected.id, {
                    style: { ...selected.style, backgroundColor: v },
                  })
                }
              />
            )}
          </div>
        ) : null}

        {rightToolTab === 'layers' && !selected ? (
          <div className="space-y-2 rounded-lg border border-accent/30 bg-bg-muted/60 p-2 text-xs text-text-muted sm:text-sm">
            <p className="font-medium text-accent">Zona QR</p>
            <p>
              Arrastrá el recuadro punteado en el canvas. No puede salir del margen seguro ni ser más chica que
              el mínimo (el servidor valida igual).
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <Input density="dense"
                label="Ancho QR"
                type="number"
                step={0.01}
                value={state.qrZoneJson.w}
                onChange={(e) =>
                  setState((s) =>
                    s
                      ? {
                          ...s,
                          qrZoneJson: clampQrZone({
                            ...s.qrZoneJson,
                            w: parseFloat(e.target.value) || 0.2,
                          }),
                        }
                      : s,
                  )
                }
              />
              <Input density="dense"
                label="Alto QR"
                type="number"
                step={0.01}
                value={state.qrZoneJson.h}
                onChange={(e) =>
                  setState((s) =>
                    s
                      ? {
                          ...s,
                          qrZoneJson: clampQrZone({
                            ...s.qrZoneJson,
                            h: parseFloat(e.target.value) || 0.2,
                          }),
                        }
                      : s,
                  )
                }
              />
            </div>
          </div>
        ) : null}

        <div className="mt-1 flex flex-col gap-1 border-t border-border pt-2">
          <Button type="button" size="sm" disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
            Guardar plantilla
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={resetMut.isPending}
            onClick={() => {
              if (typeof window !== 'undefined' && !window.confirm('¿Descartar plantilla guardada y volver al diseño base?')) {
                return;
              }
              resetMut.mutate();
            }}
          >
            Restaurar diseño base
          </Button>
          <Link
            href={`/producer/events/${eventId}`}
            className="text-center text-sm text-accent hover:underline"
          >
            ← Volver al evento
          </Link>
        </div>
      </aside>
      </div>
    </div>
  );
}

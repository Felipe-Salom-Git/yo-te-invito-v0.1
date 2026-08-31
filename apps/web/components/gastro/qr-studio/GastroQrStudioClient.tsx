'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  DiscountVisualDynamicFieldKey,
  DiscountVisualRenderContext,
  DiscountVisualTemplateElement,
  GastroDiscountVisualTemplateResponse,
} from '@yo-te-invito/shared';
import {
  DISCOUNT_VISUAL_DYNAMIC_FIELD_KEYS,
  DISCOUNT_VISUAL_PRESET_META,
  DISCOUNT_VISUAL_REQUIRED_FIELD_KEYS,
  defaultDiscountVisualTemplateDesign,
  discountVisualPresetDesign,
  type DiscountVisualPresetId,
} from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { gastroKeys } from '@/lib/query/keys';
import { Button, Input, Select, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { anyElementHitsQr, clampQrZone } from '@/lib/producer/ticket-studio-qr-rules';
import { StudioColorField } from '@/components/producer/ticket-studio/StudioColorField';
import { useGcsImageUpload } from '@/lib/upload/use-gcs-image-upload';
import { GastroQrStudioCanvas, type GastroQrStudioState } from './GastroQrStudioCanvas';

const REQUIRED_FIELD_KEYS = new Set<string>(DISCOUNT_VISUAL_REQUIRED_FIELD_KEYS);

const FIELD_LABELS: Record<DiscountVisualDynamicFieldKey, string> = {
  gastroName: 'Nombre del local',
  discountTitle: 'Título del descuento',
  discountValue: 'Beneficio (real)',
  discountValidity: 'Vigencia',
  shortCode: 'Código corto',
};

function isLastRequiredField(
  elements: DiscountVisualTemplateElement[],
  fieldKey: string | undefined,
): boolean {
  if (!fieldKey || !REQUIRED_FIELD_KEYS.has(fieldKey)) return false;
  return elements.filter((e) => e.type === 'DYNAMIC' && e.fieldKey === fieldKey).length <= 1;
}

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `el-${Date.now()}`;
}

function templateToState(
  t: GastroDiscountVisualTemplateResponse | null,
): GastroQrStudioState {
  if (!t) {
    const d = defaultDiscountVisualTemplateDesign();
    return {
      name: d.name,
      canvasWidth: d.canvasWidth,
      canvasHeight: d.canvasHeight,
      backgroundType: d.backgroundType,
      backgroundValue: d.backgroundValue,
      elementsJson: d.elementsJson,
      qrZoneJson: d.qrZoneJson,
    };
  }
  return {
    name: t.name,
    canvasWidth: t.canvasWidth,
    canvasHeight: t.canvasHeight,
    backgroundType: t.backgroundType === 'IMAGE' ? 'IMAGE' : 'SOLID',
    backgroundValue: t.backgroundValue,
    elementsJson: t.elementsJson,
    qrZoneJson: t.qrZoneJson,
  };
}

type Props = {
  discountId: string;
  gastroProfileId: string;
  previewCtx: DiscountVisualRenderContext;
};

export function GastroQrStudioClient({ discountId, gastroProfileId, previewCtx }: Props) {
  const repos = useRepositories();
  const qc = useQueryClient();
  const { addToast } = useToast();
  const [state, setState] = useState<GastroQrStudioState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const upload = useGcsImageUpload({ scope: 'gastro', entityId: gastroProfileId });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: gastroKeys.discountVisualTemplate(discountId),
    queryFn: () => repos.gastro.getDiscountVisualTemplate(discountId),
  });

  useEffect(() => {
    if (!data) return;
    setState(templateToState(data.template));
    setDirty(false);
  }, [data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!state) throw new Error('Sin estado');
      const qr = clampQrZone(state.qrZoneJson);
      if (anyElementHitsQr(state.elementsJson, qr)) {
        throw new Error('Algún elemento tapa la zona QR. Mové las capas o achicá el QR.');
      }
      return repos.gastro.upsertDiscountVisualTemplate(discountId, {
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
      addToast('Diseño guardado', 'success');
      setDirty(false);
      qc.invalidateQueries({ queryKey: gastroKeys.discountVisualTemplate(discountId) });
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const resetMut = useMutation({
    mutationFn: () => repos.gastro.resetDiscountVisualTemplate(discountId),
    onSuccess: () => {
      addToast('Diseño restablecido al estándar Yo Te Invito', 'success');
      setState(templateToState(null));
      setSelectedId(null);
      setDirty(false);
      qc.invalidateQueries({ queryKey: gastroKeys.discountVisualTemplate(discountId) });
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const patchState = useCallback((patch: Partial<GastroQrStudioState>) => {
    setState((s) => (s ? { ...s, ...patch } : s));
    setDirty(true);
  }, []);

  const updateElement = useCallback((id: string, patch: Partial<DiscountVisualTemplateElement>) => {
    setState((s) => {
      if (!s) return s;
      return {
        ...s,
        elementsJson: s.elementsJson.map((el) => (el.id === id ? { ...el, ...patch } : el)),
      };
    });
    setDirty(true);
  }, []);

  const addElement = (el: DiscountVisualTemplateElement) => {
    setState((s) => (s ? { ...s, elementsJson: [...s.elementsJson, el] } : s));
    setSelectedId(el.id);
    setDirty(true);
  };

  const selected = useMemo(
    () => state?.elementsJson.find((e) => e.id === selectedId) ?? null,
    [state, selectedId],
  );

  if (isLoading || !state) {
    return <p className="text-sm text-text-muted">Cargando QR Studio…</p>;
  }
  if (isError) {
    return <p className="text-sm text-red-400">{getErrorMessage(error)}</p>;
  }

  return (
    <div className="w-full min-w-0 space-y-3">
      <p className="rounded-lg border border-border bg-bg-muted/40 px-3 py-2 text-xs text-text-muted md:hidden">
        En el celular podés previsualizar, aplicar un preset y guardar. El arrastre de capas es más
        cómodo en tablet o escritorio.
      </p>
      {dirty ? (
        <p className="text-xs font-medium text-amber-300">Hay cambios sin guardar.</p>
      ) : null}

      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(11rem,1fr)_minmax(0,2fr)_minmax(14rem,1.4fr)]">
        <aside className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            Elementos
          </h3>
          <div className="flex flex-col gap-1">
            <Button
              type="button"
              size="xs"
              variant="secondary"
              onClick={() =>
                addElement({
                  id: newId(),
                  type: 'TEXT',
                  x: 0.1,
                  y: 0.12,
                  w: 0.8,
                  h: 0.07,
                  zIndex: 10,
                  content: 'Presentá este QR',
                  style: { fontSize: 14, color: '#fafafa', textAlign: 'center' },
                })
              }
            >
              + Texto
            </Button>
            <Button
              type="button"
              size="xs"
              variant="secondary"
              onClick={() =>
                addElement({
                  id: newId(),
                  type: 'DYNAMIC',
                  x: 0.1,
                  y: 0.2,
                  w: 0.8,
                  h: 0.07,
                  zIndex: 11,
                  fieldKey: 'discountTitle',
                  style: { fontSize: 16, color: '#fafafa', textAlign: 'center' },
                })
              }
            >
              + Campo
            </Button>
            <label className="inline-flex min-h-[1.75rem] cursor-pointer items-center justify-center rounded border border-border bg-bg px-2 text-xs text-text hover:bg-bg-muted">
              + Logo
              <input
                type="file"
                accept="image/*"
                className="absolute h-px w-px overflow-hidden opacity-0"
                aria-label="Subir logo"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  const url = await upload.uploadFile(file, 'logo');
                  if (!url) return;
                  addElement({
                    id: newId(),
                    type: 'LOGO',
                    x: 0.35,
                    y: 0.04,
                    w: 0.3,
                    h: 0.1,
                    zIndex: 12,
                    imageUrl: url,
                  });
                }}
              />
            </label>
          </div>
          <h3 className="pt-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            Plantillas
          </h3>
          <div className="flex flex-col gap-1">
            {DISCOUNT_VISUAL_PRESET_META.map((p) => (
              <Button
                key={p.id}
                type="button"
                size="xs"
                variant="secondary"
                onClick={() => {
                  const d = discountVisualPresetDesign(p.id as DiscountVisualPresetId);
                  patchState({
                    name: d.name,
                    canvasWidth: d.canvasWidth,
                    canvasHeight: d.canvasHeight,
                    backgroundType: d.backgroundType,
                    backgroundValue: d.backgroundValue,
                    elementsJson: d.elementsJson,
                    qrZoneJson: d.qrZoneJson,
                  });
                  setSelectedId(null);
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </aside>

        <div className="min-w-0">
          <GastroQrStudioCanvas
            state={state}
            selectedId={selectedId}
            previewCtx={previewCtx}
            onSelect={setSelectedId}
            onUpdateElement={updateElement}
            onUpdateQr={(qr) => patchState({ qrZoneJson: clampQrZone(qr) })}
          />
        </div>

        <aside className="space-y-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            Propiedades
          </h3>
          <Input
            density="dense"
            label="Nombre del diseño"
            value={state.name}
            onChange={(e) => patchState({ name: e.target.value })}
          />
          <StudioColorField
            label="Color de fondo"
            value={state.backgroundType === 'SOLID' ? state.backgroundValue : '#0a0a0a'}
            onChange={(hex) => patchState({ backgroundType: 'SOLID', backgroundValue: hex })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              density="dense"
              label="Ancho QR %"
              type="number"
              min={18}
              max={80}
              value={Math.round(state.qrZoneJson.w * 100)}
              onChange={(e) =>
                patchState({
                  qrZoneJson: clampQrZone({
                    ...state.qrZoneJson,
                    w: Number(e.target.value) / 100,
                  }),
                })
              }
            />
            <Input
              density="dense"
              label="Alto QR %"
              type="number"
              min={18}
              max={80}
              value={Math.round(state.qrZoneJson.h * 100)}
              onChange={(e) =>
                patchState({
                  qrZoneJson: clampQrZone({
                    ...state.qrZoneJson,
                    h: Number(e.target.value) / 100,
                  }),
                })
              }
            />
          </div>
          <label className="block text-xs text-text-muted">
            Imagen de fondo
            <input
              type="file"
              accept="image/*"
              className="mt-1 block w-full text-xs"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const url = await upload.uploadFile(file, 'gallery');
                if (url) patchState({ backgroundType: 'IMAGE', backgroundValue: url });
              }}
            />
          </label>
          {selected ? (
            <div className="space-y-2 rounded-lg border border-border p-2">
              <p className="text-xs text-text-muted">{selected.type}</p>
              {selected.type === 'TEXT' ? (
                <Input
                  density="dense"
                  label="Texto"
                  value={selected.content ?? ''}
                  onChange={(e) => updateElement(selected.id, { content: e.target.value })}
                />
              ) : null}
              {selected.type === 'DYNAMIC' ? (
                <Select
                  density="dense"
                  label="Campo"
                  value={selected.fieldKey ?? 'discountTitle'}
                  onChange={(e) => {
                    const next = e.target.value as DiscountVisualDynamicFieldKey;
                    if (
                      isLastRequiredField(state.elementsJson, selected.fieldKey) &&
                      next !== selected.fieldKey
                    ) {
                      addToast(
                        'El beneficio, el título y el código corto son obligatorios y no se pueden quitar.',
                        'error',
                      );
                      return;
                    }
                    updateElement(selected.id, { fieldKey: next });
                  }}
                  options={DISCOUNT_VISUAL_DYNAMIC_FIELD_KEYS.map((k) => ({
                    value: k,
                    label: FIELD_LABELS[k],
                  }))}
                />
              ) : null}
              {(selected.type === 'TEXT' || selected.type === 'DYNAMIC') && (
                <>
                  <StudioColorField
                    label="Color de texto"
                    value={selected.style?.color ?? '#fafafa'}
                    onChange={(hex) =>
                      updateElement(selected.id, {
                        style: { ...selected.style, color: hex },
                      })
                    }
                  />
                  <Input
                    density="dense"
                    label="Tamaño"
                    type="number"
                    min={
                      selected.fieldKey && REQUIRED_FIELD_KEYS.has(selected.fieldKey) ? 12 : 8
                    }
                    max={48}
                    value={selected.style?.fontSize ?? 14}
                    onChange={(e) =>
                      updateElement(selected.id, {
                        style: { ...selected.style, fontSize: Number(e.target.value) },
                      })
                    }
                  />
                  <Select
                    density="dense"
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
                </>
              )}
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ['x', 'X %'],
                    ['y', 'Y %'],
                    ['w', 'Ancho %'],
                    ['h', 'Alto %'],
                  ] as const
                ).map(([key, label]) => (
                  <Input
                    key={key}
                    density="dense"
                    label={label}
                    type="number"
                    min={0}
                    max={100}
                    value={Math.round(selected[key] * 100)}
                    onChange={(e) =>
                      updateElement(selected.id, {
                        [key]: Math.min(1, Math.max(0, Number(e.target.value) / 100)),
                      })
                    }
                  />
                ))}
              </div>
              {(selected.type === 'IMAGE' || selected.type === 'LOGO') && (
                <label className="block text-xs text-text-muted">
                  Reemplazar imagen
                  <input
                    type="file"
                    accept="image/*"
                    className="mt-1 block w-full text-xs"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = await upload.uploadFile(file, 'logo');
                      if (url) updateElement(selected.id, { imageUrl: url });
                    }}
                  />
                </label>
              )}
              <Button
                type="button"
                size="xs"
                variant="secondary"
                disabled={isLastRequiredField(state.elementsJson, selected.fieldKey)}
                onClick={() => {
                  if (isLastRequiredField(state.elementsJson, selected.fieldKey)) {
                    addToast(
                      'El beneficio, el título y el código corto son obligatorios y no se pueden quitar.',
                      'error',
                    );
                    return;
                  }
                  setState((s) =>
                    s
                      ? { ...s, elementsJson: s.elementsJson.filter((el) => el.id !== selected.id) }
                      : s,
                  );
                  setSelectedId(null);
                  setDirty(true);
                }}
              >
                Eliminar capa
              </Button>
            </div>
          ) : (
            <p className="text-xs text-text-muted">
              Seleccioná una capa o la zona QR. El QR y el código corto se rellenan al mostrar el
              cupón; no se pueden editar sus valores.
            </p>
          )}
        </aside>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
          Guardar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            if (confirm('¿Restablecer el diseño estándar? Se elimina el custom.')) {
              resetMut.mutate();
            }
          }}
          disabled={resetMut.isPending}
        >
          Restablecer diseño
        </Button>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input } from '@/components';
import type { ContentMainCategory, CategoryBannerAdminItem } from '@/repositories/interfaces';
import { useRepositories } from '@/repositories/context';
import { useAdminCategoryBanner } from '@/lib/query/useCategoryBanner';
import { categoryBannersKeys } from '@/lib/query/keys';
import { useTenant } from '@/hooks/useTenant';
import { getErrorMessage } from '@/lib/errors';

const TENANT_ID = 'tenant-demo';
const MAX_ITEMS = 5;

type DraftItem = {
  eventId: string;
  title: string;
  coverImageUrl: string | null;
};

function toDraft(items: CategoryBannerAdminItem[]): DraftItem[] {
  return items.map((i) => ({
    eventId: i.eventId,
    title: i.title,
    coverImageUrl: i.coverImageUrl,
  }));
}

export function AdminCategoryBannerPanel({ category }: { category: ContentMainCategory }) {
  const repos = useRepositories();
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_ID;
  const { data, isLoading } = useAdminCategoryBanner(category);
  const [draft, setDraft] = useState<DraftItem[]>([]);
  const [search, setSearch] = useState('');
  const [pickerError, setPickerError] = useState<string | null>(null);

  useEffect(() => {
    if (data?.items) setDraft(toDraft(data.items));
  }, [data?.items]);

  const mode = draft.length > 0 || data?.mode === 'manual' ? 'manual' : 'automatic';

  const pickerQuery = useQuery({
    queryKey: ['categoryBannerPicker', t, category, search],
    queryFn: async () => {
      const res = await repos.events.list({
        tenantId: t,
        category,
        limit: 40,
        sort: 'recent',
      });
      return res.data;
    },
    enabled: !!t && !!category,
  });

  const filteredPicker = useMemo(() => {
    const q = search.trim().toLowerCase();
    const selected = new Set(draft.map((d) => d.eventId));
    return (pickerQuery.data ?? [])
      .filter((ev) => {
        if (selected.has(ev.id)) return false;
        const evCat = (ev.category ?? 'event').toLowerCase();
        if (evCat !== category && !(category === 'event' && evCat === 'event')) {
          return false;
        }
        if (!q) return true;
        return ev.title.toLowerCase().includes(q);
      })
      .slice(0, 12);
  }, [pickerQuery.data, draft, search, category]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: categoryBannersKeys.admin(category) });
    qc.invalidateQueries({ queryKey: categoryBannersKeys.public(t, category) });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      repos.categoryBanners.updateAdmin(
        category,
        draft.map((item, index) => ({ eventId: item.eventId, position: index + 1 })),
      ),
    onSuccess: invalidate,
  });

  const clearMutation = useMutation({
    mutationFn: () => repos.categoryBanners.updateAdmin(category, []),
    onSuccess: () => {
      setDraft([]);
      invalidate();
    },
  });

  const addItem = (ev: { id: string; title: string; coverImageUrl?: string | null; category?: string }) => {
    setPickerError(null);
    if (draft.length >= MAX_ITEMS) {
      setPickerError(`Máximo ${MAX_ITEMS} ítems en el banner.`);
      return;
    }
    const evCat = (ev.category ?? 'event').toLowerCase();
    if (evCat !== category && !(category === 'event' && evCat === 'event')) {
      setPickerError('Solo podés agregar contenido de esta categoría.');
      return;
    }
    if (draft.some((d) => d.eventId === ev.id)) {
      setPickerError('Este ítem ya está en el banner.');
      return;
    }
    setDraft((prev) => [
      ...prev,
      { eventId: ev.id, title: ev.title, coverImageUrl: ev.coverImageUrl ?? null },
    ]);
  };

  const move = (index: number, delta: number) => {
    const next = index + delta;
    if (next < 0 || next >= draft.length) return;
    setDraft((items) => {
      const copy = [...items];
      const [removed] = copy.splice(index, 1);
      copy.splice(next, 0, removed);
      return copy;
    });
  };

  return (
    <div className="mt-8 space-y-6">
      <div className="rounded-xl border border-border bg-bg-muted p-4">
        <p className="text-sm font-medium text-text">Modo actual</p>
        <p className="mt-1 text-text-muted">
          {mode === 'manual'
            ? 'Manual: los ítems seleccionados aparecen primero en el banner público.'
            : 'Automático: se mostrarán automáticamente las últimas 5 cargas de esta categoría.'}
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-text">Ítems del banner ({draft.length}/{MAX_ITEMS})</p>
        {isLoading ? (
          <p className="text-text-muted">Cargando configuración…</p>
        ) : draft.length === 0 ? (
          <p className="text-sm text-text-muted">
            Sin selección manual. El banner público usa las últimas 5 cargas aprobadas.
          </p>
        ) : (
          draft.map((item, index) => (
            <div
              key={item.eventId}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-bg-muted p-3"
            >
              {item.coverImageUrl ? (
                <img
                  src={item.coverImageUrl}
                  alt=""
                  className="h-14 w-20 rounded object-cover"
                />
              ) : (
                <div className="flex h-14 w-20 items-center justify-center rounded bg-bg text-xs text-text-muted">
                  Sin img
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-text">{item.title}</p>
                <p className="text-xs text-text-muted">Posición {index + 1}</p>
              </div>
              <div className="flex gap-1">
                <Button type="button" variant="secondary" onClick={() => move(index, -1)} disabled={index === 0}>
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => move(index, 1)}
                  disabled={index === draft.length - 1}
                >
                  ↓
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setDraft((d) => d.filter((x) => x.eventId !== item.eventId))}
                >
                  Quitar
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {draft.length < MAX_ITEMS && (
        <div className="rounded-xl border border-border bg-bg-muted p-4">
          <p className="text-sm font-medium text-text">Agregar contenido</p>
          <Input
            label="Buscar por título"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {pickerError && <p className="mt-2 text-sm text-red-400">{pickerError}</p>}
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {pickerQuery.isLoading ? (
              <li className="text-sm text-text-muted">Buscando contenido…</li>
            ) : filteredPicker.length === 0 ? (
              <li className="text-sm text-text-muted">No hay resultados para agregar.</li>
            ) : (
              filteredPicker.map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-center justify-between gap-2 rounded border border-border px-3 py-2"
                >
                  <span className="truncate text-sm text-text">{ev.title}</span>
                  <Button type="button" variant="secondary" onClick={() => addItem(ev)}>
                    Agregar
                  </Button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Guardando…' : 'Guardar banner'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => clearMutation.mutate()}
          disabled={clearMutation.isPending || draft.length === 0}
        >
          Volver a automático
        </Button>
      </div>
      {(saveMutation.isError || clearMutation.isError) && (
        <p className="text-sm text-red-400">
          {getErrorMessage(saveMutation.error ?? clearMutation.error)}
        </p>
      )}
    </div>
  );
}

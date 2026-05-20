'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PageContainer, SectionTitle, Button, Input } from '@/components';
import { useAdminSubcategories } from '@/lib/query/subcategories';
import { useRepositories } from '@/repositories/context';
import { subcategoriesKeys } from '@/lib/query/keys';
import type { ContentCategory, ContentMainCategory } from '@/repositories/interfaces';
import { getErrorMessage } from '@/lib/errors';
import { AdminCategoryBannerPanel } from '@/components/categories/AdminCategoryBannerPanel';

const TABS: { id: ContentCategory; label: string }[] = [
  { id: 'event', label: 'Eventos' },
  { id: 'gastro', label: 'Gastronomía' },
  { id: 'rental', label: 'Equipos y Rentals' },
  { id: 'excursion', label: 'Excursiones' },
  { id: 'hotel', label: 'Hoteles' },
];

type AdminSection = 'subcategories' | 'banner';

export default function AdminCategoriasPage() {
  const [tab, setTab] = useState<ContentCategory>('event');
  const [section, setSection] = useState<AdminSection>('subcategories');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const repos = useRepositories();
  const qc = useQueryClient();
  const { data, isLoading } = useAdminSubcategories(tab);
  const items = data?.data ?? [];
  const comingSoon = data?.comingSoon === true;

  const invalidate = () => qc.invalidateQueries({ queryKey: subcategoriesKeys.admin(tab) });

  const createMutation = useMutation({
    mutationFn: () =>
      repos.subcategories.create({
        category: tab as ContentMainCategory,
        name: name.trim(),
        description: description.trim() || null,
        sortOrder: parseInt(sortOrder, 10) || 0,
        isActive: true,
      }),
    onSuccess: () => {
      setName('');
      setDescription('');
      setSortOrder('0');
      invalidate();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      isActive ? repos.subcategories.deactivate(id) : repos.subcategories.update(id, { isActive: true }),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, sortOrder: so }: { id: string; sortOrder: number }) =>
      repos.subcategories.update(id, { sortOrder: so }),
    onSuccess: invalidate,
  });

  return (
    <PageContainer>
      <Link href="/admin" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Admin
      </Link>
      <SectionTitle>Categorías</SectionTitle>
      <p className="mt-2 text-text-muted">
        Gestioná subcategorías por tipo de contenido. Solo las activas aparecen en la app pública.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              if (t.id === 'hotel') setSection('subcategories');
            }}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              tab === t.id ? 'bg-accent text-bg' : 'border border-border text-text-muted hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!comingSoon && tab !== 'hotel' && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSection('subcategories')}
            className={`rounded-lg px-3 py-2 text-sm ${
              section === 'subcategories'
                ? 'border border-accent text-accent'
                : 'border border-border text-text-muted hover:text-text'
            }`}
          >
            Subcategorías
          </button>
          <button
            type="button"
            onClick={() => setSection('banner')}
            className={`rounded-lg px-3 py-2 text-sm ${
              section === 'banner'
                ? 'border border-accent text-accent'
                : 'border border-border text-text-muted hover:text-text'
            }`}
          >
            Banner de categoría
          </button>
        </div>
      )}

      {comingSoon ? (
        <div className="mt-8 rounded-xl border border-border bg-bg-muted p-6">
          <p className="text-lg font-semibold text-text">Próximamente</p>
          <p className="mt-2 text-sm text-text-muted">
            Las subcategorías de hoteles se habilitarán en una próxima etapa.
          </p>
        </div>
      ) : section === 'banner' && tab !== 'hotel' ? (
        <AdminCategoryBannerPanel category={tab as ContentMainCategory} />
      ) : (
        <>
          <form
            className="mt-8 grid gap-4 rounded-xl border border-border bg-bg-muted p-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              createMutation.mutate();
            }}
          >
            <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input
              label="Orden"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-text-muted">Descripción</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-text"
                rows={2}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creando…' : 'Crear subcategoría'}
              </Button>
              {createMutation.isError && (
                <p className="mt-2 text-sm text-red-400">{getErrorMessage(createMutation.error)}</p>
              )}
            </div>
          </form>

          <div className="mt-8 space-y-3">
            {isLoading ? (
              <p className="text-text-muted">Cargando…</p>
            ) : items.length === 0 ? (
              <p className="text-text-muted">No hay subcategorías en esta categoría.</p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-bg-muted p-4"
                >
                  <div>
                    <p className="font-medium text-text">
                      {item.name}{' '}
                      <span className="text-xs text-text-muted">/{item.slug}</span>
                    </p>
                    {item.description && (
                      <p className="mt-1 text-sm text-text-muted">{item.description}</p>
                    )}
                    <p className="mt-1 text-xs text-text-muted">
                      {item.isActive ? 'Activa' : 'Inactiva'} · orden {item.sortOrder}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        updateMutation.mutate({
                          id: item.id,
                          sortOrder: Math.max(0, item.sortOrder - 1),
                        })
                      }
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        updateMutation.mutate({
                          id: item.id,
                          sortOrder: item.sortOrder + 1,
                        })
                      }
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        toggleMutation.mutate({ id: item.id, isActive: item.isActive })
                      }
                      disabled={toggleMutation.isPending}
                    >
                      {item.isActive ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </PageContainer>
  );
}

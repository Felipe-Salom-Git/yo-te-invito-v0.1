'use client';

import { useMemo, useState } from 'react';
import { useExploreEvents } from '@/lib/query/explore';
import { usePlatformConfig } from '@/hooks/usePlatformConfig';
import { ContentCard, type ContentCardItem } from '@/components/home/ContentCard';
import { ContentCardSkeleton } from '@/components/home/ContentCardSkeleton';
import { PageContainer, SectionTitle, EmptyState } from '@/components';

const TENANT_ID = 'tenant-demo';

const DEFAULT_CATEGORIES = [
  { value: '', label: 'Todos' },
  { value: 'event', label: 'Eventos' },
  { value: 'gastro', label: 'Gastronomía' },
  { value: 'excursion', label: 'Excursiones' },
  { value: 'rental', label: 'Alquileres' },
];

export default function ExplorePage() {
  const { data: config } = usePlatformConfig();
  const categories = useMemo(() => {
    const fromConfig = config?.categories ?? [];
    if (fromConfig.length === 0) return DEFAULT_CATEGORIES;
    return [
      { value: '', label: 'Todos' },
      ...fromConfig.map((c) => ({ value: c.id, label: c.label })),
    ];
  }, [config?.categories]);

  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [category, setCategory] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [page, setPage] = useState(1);

  const filters = submitted || q || city || category ? { q, city, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, category: category || undefined, page } : { page: 1 };
  const { data, isLoading } = useExploreEvents(filters);
  const events = data?.data ?? [];
  const meta = data?.meta ?? { page: 1, limit: 24, total: 0, totalPages: 0 };

  return (
    <PageContainer>
      <SectionTitle>Explorar</SectionTitle>

      <form
        onSubmit={(e) => { e.preventDefault(); setSubmitted(true); setPage(1); }}
        className="mt-6 space-y-4 rounded-xl border border-border bg-bg-muted p-4"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-text-muted">Búsqueda</label>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Título"
              className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-text"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted">Ciudad</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Buenos Aires"
              className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-text"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-text"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-text"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-text-muted">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 rounded border border-border bg-bg px-3 py-2 text-text"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="mt-6 rounded bg-accent px-4 py-2 text-bg hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
            aria-label="Buscar eventos"
          >
            Buscar
          </button>
        </div>
      </form>

      <div className="mt-8 flex flex-wrap gap-5 sm:gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <ContentCardSkeleton key={i} />)
        ) : (
          events.map((ev) => (
            <ContentCard
              key={ev.id}
              item={ev as ContentCardItem}
              tenantId={TENANT_ID}
            />
          ))
        )}
      </div>

      {events.length === 0 && !isLoading && (
        <div className="mt-8">
          <EmptyState
            title="No se encontraron resultados"
            description="Probá cambiar los filtros o la búsqueda."
          />
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="mt-8 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded border border-border bg-bg-muted px-3 py-1 text-sm disabled:opacity-50 hover:bg-border focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label="Página anterior"
          >
            Anterior
          </button>
          <span className="text-sm text-text-muted">
            Página {meta.page} de {meta.totalPages} ({meta.total} resultados)
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= meta.totalPages}
            className="rounded border border-border bg-bg-muted px-3 py-1 text-sm disabled:opacity-50 hover:bg-border focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label="Página siguiente"
          >
            Siguiente
          </button>
        </div>
      )}
    </PageContainer>
  );
}

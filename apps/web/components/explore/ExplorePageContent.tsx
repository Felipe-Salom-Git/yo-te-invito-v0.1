'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EXPLORE_CATEGORY_OPTIONS,
  hasActiveExploreFilters,
  isExploreMainCategory,
  type ExploreFiltersState,
} from '@/lib/explore/exploreFilters';
import { useExploreUrlFilters } from '@/lib/explore/useExploreUrlFilters';
import { useExploreEvents } from '@/lib/query/explore';
import { usePublicSubcategories } from '@/lib/query/subcategories';
import { ContentCard, type ContentCardItem } from '@/components/home/ContentCard';
import { ContentCardSkeleton } from '@/components/home/ContentCardSkeleton';
import { PageContainer, SectionTitle, EmptyState, QueryError } from '@/components';
import { RENTAL_EXPLORE_EMPTY_HINT, RENTAL_PUBLIC_TAGLINE } from '@/lib/rentals/publicCopy';
import type { ContentMainCategory } from '@/repositories/interfaces';

const TENANT_ID = 'tenant-demo';

const inputClass =
  'mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent';

const selectClass =
  'mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50';

export function ExplorePageContent() {
  const { filters: urlFilters, applyFilters, clearFilters } = useExploreUrlFilters();

  const [draft, setDraft] = useState<ExploreFiltersState>(urlFilters);

  useEffect(() => {
    setDraft(urlFilters);
  }, [urlFilters]);

  const mainCategory = isExploreMainCategory(draft.category)
    ? (draft.category as ContentMainCategory)
    : null;

  const { data: subcategories = [], isLoading: subcategoriesLoading } =
    usePublicSubcategories(mainCategory);

  const subcategoryOptions = useMemo(() => {
    if (!mainCategory) return [];
    return subcategories;
  }, [mainCategory, subcategories]);

  useEffect(() => {
    if (!mainCategory || subcategoriesLoading) return;
    if (subcategoryOptions.length === 0) return;

    const slug = urlFilters.subcategorySlug?.trim();
    if (slug && !urlFilters.subcategoryId) {
      const bySlug = subcategoryOptions.find((s) => s.slug === slug);
      if (bySlug) {
        applyFilters({
          ...urlFilters,
          subcategoryId: bySlug.id,
          subcategorySlug: '',
        });
        return;
      }
    }

    if (
      urlFilters.subcategoryId &&
      !subcategoryOptions.some((s) => s.id === urlFilters.subcategoryId)
    ) {
      applyFilters({ ...urlFilters, subcategoryId: '', subcategorySlug: '' });
    }
  }, [
    mainCategory,
    subcategoryOptions,
    subcategoriesLoading,
    urlFilters,
    applyFilters,
  ]);

  const { data, isLoading, isError, error, refetch, isFetching } = useExploreEvents(
    urlFilters,
    subcategoryOptions,
  );

  const events = data?.data ?? [];
  const meta = data?.meta ?? { page: 1, limit: 24, total: 0, totalPages: 0 };
  const showResults = !isLoading || events.length > 0;
  const loading = isLoading || (isFetching && events.length === 0);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      applyFilters({ ...draft, page: 1 });
    },
    [applyFilters, draft],
  );

  const handleCategoryChange = useCallback(
    (category: string) => {
      const next = {
        ...draft,
        category,
        subcategoryId: '',
        subcategorySlug: '',
        page: 1,
      };
      setDraft(next);
      applyFilters(next);
    },
    [applyFilters, draft],
  );

  const handleSubcategoryChange = useCallback(
    (subcategoryId: string) => {
      const next = { ...draft, subcategoryId, subcategorySlug: '', page: 1 };
      setDraft(next);
      applyFilters(next);
    },
    [applyFilters, draft],
  );

  const handleClear = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  return (
    <PageContainer>
      <header className="mb-2">
        <SectionTitle>Explorá Bariloche</SectionTitle>
        <p className="mt-2 max-w-2xl text-sm text-text-muted">
          {mainCategory === 'rental'
            ? RENTAL_PUBLIC_TAGLINE
            : 'Encontrá eventos, gastronomía, equipos y rentals, y excursiones en un solo lugar.'}
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-4 rounded-xl border border-border bg-bg-muted/80 p-4 sm:p-5"
      >
        <div>
          <label htmlFor="explore-q" className="block text-sm font-medium text-text-muted">
            Buscar por texto
          </label>
          <input
            id="explore-q"
            type="search"
            value={draft.q}
            onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
            placeholder="Nombre del evento o lugar"
            className={inputClass}
            autoComplete="off"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="explore-category" className="block text-sm font-medium text-text-muted">
              Categoría
            </label>
            <select
              id="explore-category"
              value={draft.category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className={selectClass}
            >
              {EXPLORE_CATEGORY_OPTIONS.map((c) => (
                <option key={c.value || 'all'} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="explore-subcategory"
              className="block text-sm font-medium text-text-muted"
            >
              Subcategoría
              {mainCategory === 'rental' ? (
                <span className="mt-0.5 block text-xs font-normal text-text-muted/80">
                  Autos, bicis, kayaks, equipos de nieve…
                </span>
              ) : null}
            </label>
            <select
              id="explore-subcategory"
              value={draft.subcategoryId}
              onChange={(e) => handleSubcategoryChange(e.target.value)}
              disabled={!mainCategory || subcategoriesLoading}
              className={selectClass}
            >
              <option value="">
                {mainCategory
                  ? subcategoriesLoading
                    ? 'Cargando…'
                    : 'Todas las subcategorías'
                  : 'Elegí una categoría primero'}
              </option>
              {subcategoryOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="explore-city" className="block text-sm font-medium text-text-muted">
              Ciudad
            </label>
            <input
              id="explore-city"
              type="text"
              value={draft.city}
              onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
              placeholder="Bariloche"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:col-span-1 lg:col-span-1">
            <div>
              <label htmlFor="explore-from" className="block text-sm font-medium text-text-muted">
                Desde
              </label>
              <input
                id="explore-from"
                type="date"
                value={draft.dateFrom}
                onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="explore-to" className="block text-sm font-medium text-text-muted">
                Hasta
              </label>
              <input
                id="explore-to"
                type="date"
                value={draft.dateTo}
                onChange={(e) => setDraft((d) => ({ ...d, dateTo: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            className="rounded bg-accent px-5 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
          >
            Buscar
          </button>
          {hasActiveExploreFilters(urlFilters) ? (
            <button
              type="button"
              onClick={handleClear}
              className="rounded border border-border px-4 py-2.5 text-sm text-text-muted transition-colors hover:border-accent hover:text-accent"
            >
              Limpiar filtros
            </button>
          ) : null}
        </div>
      </form>

      <section className="mt-10" aria-label="Resultados">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">Resultados</h2>
          {!loading && showResults ? (
            <p className="text-sm text-text-muted">
              {meta.total} {meta.total === 1 ? 'resultado' : 'resultados'}
            </p>
          ) : null}
        </div>

        {isError ? (
          <QueryError
            message={error instanceof Error ? error.message : 'No pudimos cargar los resultados.'}
            onRetry={() => refetch()}
          />
        ) : null}

        {!isError && (
          <div className="flex flex-wrap justify-center gap-5 sm:justify-start sm:gap-6">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <ContentCardSkeleton key={i} />)
              : events.map((ev) => (
                  <ContentCard
                    key={ev.id}
                    item={ev as ContentCardItem}
                    tenantId={TENANT_ID}
                  />
                ))}
          </div>
        )}

        {!isError && events.length === 0 && !loading && (
          <div className="mt-8">
            <EmptyState
              title="No encontramos resultados con esos filtros"
              description={
                urlFilters.category === 'rental'
                  ? RENTAL_EXPLORE_EMPTY_HINT
                  : 'Probá cambiar la categoría, la subcategoría, la fecha o la ciudad.'
              }
            />
          </div>
        )}

        {!isError && meta.totalPages > 1 && (
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                applyFilters({ ...urlFilters, page: Math.max(1, urlFilters.page - 1) })
              }
              disabled={urlFilters.page <= 1 || isFetching}
              className="rounded border border-border bg-bg-muted px-3 py-1.5 text-sm disabled:opacity-50 hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label="Página anterior"
            >
              Anterior
            </button>
            <span className="text-sm text-text-muted">
              Página {meta.page} de {meta.totalPages}
            </span>
            <button
              type="button"
              onClick={() => applyFilters({ ...urlFilters, page: urlFilters.page + 1 })}
              disabled={urlFilters.page >= meta.totalPages || isFetching}
              className="rounded border border-border bg-bg-muted px-3 py-1.5 text-sm disabled:opacity-50 hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label="Página siguiente"
            >
              Siguiente
            </button>
          </div>
        )}
      </section>
    </PageContainer>
  );
}

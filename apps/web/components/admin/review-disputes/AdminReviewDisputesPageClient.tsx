'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, PageLoader, QueryError, EmptyState } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { adminReviewDisputesKeys } from '@/lib/query/keys';
import {
  ADMIN_REVIEW_DISPUTE_DEFAULT_FILTERS,
  filtersToAdminReviewDisputeQuery,
  hasActiveAdminReviewDisputeFilters,
  type AdminReviewDisputeFiltersState,
} from '@/lib/admin/admin-review-dispute-filters';
import { useAdminReviewDisputeUrlFilters } from '@/lib/admin/useAdminReviewDisputeUrlFilters';
import { AdminReviewDisputeFilters } from './AdminReviewDisputeFilters';
import { AdminReviewDisputeTable } from './AdminReviewDisputeTable';
import { AdminReviewDisputeMobileCard } from './AdminReviewDisputeMobileCard';
import { AdminReviewDisputeDetailPanel } from './AdminReviewDisputeDetailPanel';

export function AdminReviewDisputesPageClient() {
  const repos = useRepositories();
  const searchParams = useSearchParams();
  const { filters, setFilters, clearFilters } = useAdminReviewDisputeUrlFilters();
  const [draft, setDraft] = useState<AdminReviewDisputeFiltersState>(filters);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => searchParams.get('id'),
  );

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  const apiQuery = useMemo(() => filtersToAdminReviewDisputeQuery(filters), [filters]);

  const listQuery = useQuery({
    queryKey: adminReviewDisputesKeys.list(filtersKey),
    queryFn: () => repos.adminReviewDisputes.list(apiQuery),
  });

  const { data: selected } = useQuery({
    queryKey: adminReviewDisputesKeys.detail(selectedId ?? ''),
    queryFn: () => repos.adminReviewDisputes.get(selectedId!),
    enabled: !!selectedId,
  });

  const disputes = listQuery.data?.disputes ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / 30);
  const hasFilters = hasActiveAdminReviewDisputeFilters(filters);

  return (
    <PageContainer>
      <Link href="/admin" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Administración
      </Link>

      <header>
        <SectionTitle>Solicitudes de revisión de valoraciones</SectionTitle>
        <p className="mt-1 max-w-2xl text-sm text-text-muted">
          Productoras que pidieron revisar comentarios. Aceptar oculta la reseña del listado
          público. Todas las acciones sensibles quedan en auditoría.
        </p>
      </header>

      <AdminReviewDisputeFilters
        draft={draft}
        onDraftChange={setDraft}
        onApply={() => setFilters(draft)}
        onClear={() => {
          clearFilters();
          setDraft(ADMIN_REVIEW_DISPUTE_DEFAULT_FILTERS);
        }}
      />

      {listQuery.isLoading ? (
        <div className="mt-8">
          <PageLoader message="Cargando disputas…" />
        </div>
      ) : listQuery.isError ? (
        <QueryError
          className="mt-8"
          message={getErrorMessage(listQuery.error)}
          onRetry={() => void listQuery.refetch()}
        />
      ) : disputes.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={hasFilters ? 'Sin resultados' : 'No hay solicitudes de revisión'}
            description={
              hasFilters
                ? 'Probá ampliar los filtros o buscar con otros términos.'
                : 'Cuando una productora solicite revisar una valoración, aparecerá en esta cola.'
            }
          />
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm text-text-muted">
            {total} solicitud{total === 1 ? '' : 'es'}
            {hasFilters ? ' (filtradas)' : ''}
          </p>
          <AdminReviewDisputeTable
            disputes={disputes}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <ul className="mt-6 space-y-3 md:hidden">
            {disputes.map((d) => (
              <li key={d.id}>
                <AdminReviewDisputeMobileCard
                  dispute={d}
                  selected={selectedId === d.id}
                  onSelect={() => setSelectedId(d.id)}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      {totalPages > 1 ? (
        <footer className="mt-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={filters.page <= 1}
            onClick={() => setFilters({ page: filters.page - 1 })}
            className="rounded-lg border border-border px-3 py-2 text-sm text-text-muted disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-sm text-text-muted">
            Página {filters.page} de {totalPages}
          </span>
          <button
            type="button"
            disabled={filters.page >= totalPages}
            onClick={() => setFilters({ page: filters.page + 1 })}
            className="rounded-lg border border-border px-3 py-2 text-sm text-text-muted disabled:opacity-40"
          >
            Siguiente
          </button>
        </footer>
      ) : null}

      {selected && selectedId ? (
        <AdminReviewDisputeDetailPanel
          dispute={selected}
          filtersKey={filtersKey}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </PageContainer>
  );
}

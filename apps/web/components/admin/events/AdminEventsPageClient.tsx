'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import type { AdminEventsListView } from '@yo-te-invito/shared';
import {
  PageContainer,
  SectionTitle,
  PageLoader,
  QueryError,
  EmptyState,
  Button,
} from '@/components';
import { useRepositories } from '@/repositories/context';
import { getErrorMessage } from '@/lib/errors';
import { useAdminEventsUrlFilters } from '@/lib/admin/useAdminEventsUrlFilters';
import {
  ADMIN_EVENTS_DEFAULT_FILTERS,
  filtersToAdminEventsQuery,
  type AdminEventsFiltersState,
} from '@/lib/admin/admin-events-filters';
import { useAdminEventsList } from '@/lib/query/admin-events';
import { adminProducersKeys } from '@/lib/query/keys';
import type { ContentCategory } from '@/repositories/interfaces';
import { subcategoriesKeys } from '@/lib/query/keys';
import { AdminEventsStatusTabs } from './AdminEventsStatusTabs';
import { AdminEventsFilters } from './AdminEventsFilters';
import { AdminEventsTable } from './AdminEventsTable';
import { AdminEventsMobileCard } from './AdminEventsMobileCard';

export function AdminEventsPageClient() {
  const { data: session, status } = useSession();
  const repos = useRepositories();
  const { filters, setFilters, clearFilters } = useAdminEventsUrlFilters();
  const [draft, setDraft] = useState<AdminEventsFiltersState>(filters);

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  const apiQuery = useMemo(() => filtersToAdminEventsQuery(filters, 20), [filters]);

  const listQuery = useAdminEventsList(
    apiQuery,
    filtersKey,
    status === 'authenticated',
  );

  const producersQuery = useQuery({
    queryKey: adminProducersKeys.list('events-filter'),
    queryFn: () => repos.adminProducers.listProducers({ limit: 100 }),
    enabled: status === 'authenticated',
  });

  const subcategoriesQuery = useQuery({
    queryKey: subcategoriesKeys.admin((draft.category || 'none') as ContentCategory),
    queryFn: () =>
      repos.subcategories.listAdmin(draft.category as ContentCategory),
    enabled: !!draft.category && status === 'authenticated',
  });

  const events = listQuery.data?.data ?? [];
  const meta = listQuery.data?.meta;

  const handleViewChange = (view: AdminEventsListView) => {
    setFilters({
      view,
      status: '',
      pendingOnly: view === 'pending',
      page: 1,
    });
  };

  if (status === 'loading') {
    return (
      <PageContainer>
        <PageLoader message="Cargando eventos…" />
      </PageContainer>
    );
  }

  if (!session?.user) {
    return (
      <PageContainer>
        <p className="text-text-muted">Debés iniciar sesión como administrador.</p>
        <Link href="/login" className="mt-4 inline-block text-accent hover:underline">
          Iniciar sesión
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link href="/admin" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Administración
      </Link>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <SectionTitle>Eventos y contenidos</SectionTitle>
          <p className="mt-1 max-w-2xl text-sm text-text-muted">
            Buscá, filtrá y abrí la revisión por productora. La moderación (aprobar/rechazar) sigue
            en la ficha de cada productora.
          </p>
        </div>
        <Link href="/admin#cola-pendientes" className="shrink-0 text-sm text-accent hover:underline">
          Cola en dashboard →
        </Link>
      </header>

      <div className="mt-6">
        <AdminEventsStatusTabs activeView={filters.view} onChange={handleViewChange} />
      </div>

      <div className="mt-4">
        <AdminEventsFilters
          filters={draft}
          onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
          onApply={() => setFilters({ ...draft, page: 1 })}
          onClear={() => {
            clearFilters();
            setDraft(ADMIN_EVENTS_DEFAULT_FILTERS);
          }}
          producers={producersQuery.data?.data ?? []}
          subcategories={
            draft.category ? (subcategoriesQuery.data?.data ?? []) : []
          }
        />
      </div>

      {listQuery.isError ? (
        <QueryError
          className="mt-6"
          message={getErrorMessage(listQuery.error)}
          onRetry={() => listQuery.refetch()}
        />
      ) : null}

      <div className="mt-6">
        {listQuery.isLoading ? (
          <div className="space-y-3" aria-busy="true">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl border border-border/60 bg-bg-muted/40"
              />
            ))}
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            title="Sin resultados"
            description="Probá otros filtros o la vista «Pendientes»."
            actionLabel="Ver pendientes"
            actionHref="/admin/eventos?view=pending"
          />
        ) : (
          <>
            <p className="mb-3 text-sm text-text-muted">
              {meta?.total ?? events.length} resultado(s)
              {meta && meta.totalPages > 1
                ? ` · página ${meta.page} de ${meta.totalPages}`
                : ''}
            </p>
            <AdminEventsTable events={events} />
            <ul className="mt-4 space-y-3 md:hidden">
              {events.map((ev) => (
                <li key={ev.id}>
                  <AdminEventsMobileCard event={ev} />
                </li>
              ))}
            </ul>
            {meta && meta.totalPages > 1 ? (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page <= 1}
                  onClick={() => setFilters({ page: meta.page - 1 })}
                >
                  Anterior
                </Button>
                <span className="text-sm text-text-muted">
                  Página {meta.page} / {meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => setFilters({ page: meta.page + 1 })}
                >
                  Siguiente
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </PageContainer>
  );
}

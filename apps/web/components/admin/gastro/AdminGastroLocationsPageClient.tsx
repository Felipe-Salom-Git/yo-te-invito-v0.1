'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import type { AdminGastroLocationStatusInput } from '@yo-te-invito/shared';
import {
  PageContainer,
  SectionTitle,
  PageLoader,
  QueryError,
  EmptyState,
  Button,
  useToast,
} from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { useAdminGastroUrlFilters } from '@/lib/admin/useAdminGastroUrlFilters';
import {
  ADMIN_GASTRO_DEFAULT_FILTERS,
  applyAdminGastroClientFilters,
  filtersToAdminGastroListQuery,
  type AdminGastroFiltersState,
} from '@/lib/admin/admin-gastro-filters';
import {
  useAdminGastroLocationsList,
  useAdminGastroLocationStatusMutation,
} from '@/lib/query/admin-gastro';
import type { AdminGastroLocationListItem } from '@/repositories/interfaces';
import { AdminGastroLocationsFilters } from './AdminGastroLocationsFilters';
import { AdminGastroLocationsTable } from './AdminGastroLocationsTable';
import { AdminGastroLocationsMobileCard } from './AdminGastroLocationsMobileCard';

const SUSPEND_CONFIRM_MESSAGE =
  'Suspender este local lo ocultará del descubrimiento público, pero conservará descuentos, reseñas, seguidores e historial. ¿Continuar?';

export function AdminGastroLocationsPageClient() {
  const { data: session, status } = useSession();
  const { addToast } = useToast();
  const { filters, setFilters, clearFilters } = useAdminGastroUrlFilters();
  const [draft, setDraft] = useState<AdminGastroFiltersState>(filters);
  const [statusTargetId, setStatusTargetId] = useState<string | null>(null);

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  const apiQuery = useMemo(() => filtersToAdminGastroListQuery(filters, 100), [filters]);

  const listQuery = useAdminGastroLocationsList(
    apiQuery,
    filtersKey,
    status === 'authenticated',
  );

  const statusMutation = useAdminGastroLocationStatusMutation();

  const rawLocations = listQuery.data?.data ?? [];
  const locations = useMemo(
    () => applyAdminGastroClientFilters(rawLocations, filters),
    [rawLocations, filters],
  );
  const meta = listQuery.data?.meta;
  const hasClientOnlyFilters =
    Boolean(filters.hasOwner) || Boolean(filters.hasPublic) || Boolean(filters.city.trim());

  const handleToggleStatus = (loc: AdminGastroLocationListItem) => {
    const nextStatus: AdminGastroLocationStatusInput =
      loc.status === 'active' ? 'SUSPENDED' : 'ACTIVE';
    if (nextStatus === 'SUSPENDED') {
      const ok = window.confirm(SUSPEND_CONFIRM_MESSAGE);
      if (!ok) return;
    } else {
      const ok = window.confirm(
        `¿Activar «${loc.displayName}» y restaurar visibilidad en descubrimiento público?`,
      );
      if (!ok) return;
    }
    setStatusTargetId(loc.id);
    statusMutation.mutate(
      { profileId: loc.id, status: nextStatus },
      {
        onSuccess: () => {
          addToast(
            nextStatus === 'SUSPENDED' ? 'Local suspendido' : 'Local activado',
            'success',
          );
        },
        onError: (err) => addToast(getErrorMessage(err), 'error'),
        onSettled: () => setStatusTargetId(null),
      },
    );
  };

  if (status === 'loading') {
    return (
      <PageContainer>
        <PageLoader message="Cargando locales gastronómicos…" />
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

  const showEmptyGlobal = !listQuery.isLoading && rawLocations.length === 0 && !filters.search && !filters.status && !filters.pendingDiscounts;
  const showEmptyFiltered = !listQuery.isLoading && locations.length === 0 && !showEmptyGlobal;

  return (
    <PageContainer>
      <Link href="/admin" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Administración
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <SectionTitle>Locales gastronómicos</SectionTitle>
          <p className="mt-1 max-w-2xl text-sm text-text-muted">
            Gestioná restaurantes, bares, cafeterías y comercios gastronómicos visibles en la
            plataforma.
          </p>
        </div>
        <Link href="/admin/gastronomicos/nuevo" className="shrink-0">
          <Button type="button" size="sm">
            Nuevo local gastronómico
          </Button>
        </Link>
      </header>

      <div className="mt-6">
        <AdminGastroLocationsFilters
          filters={draft}
          onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
          onApply={() => setFilters({ ...draft, page: 1 })}
          onClear={() => {
            clearFilters();
            setDraft(ADMIN_GASTRO_DEFAULT_FILTERS);
          }}
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
                className="h-24 animate-pulse rounded-xl border border-border/60 bg-bg-muted/40"
              />
            ))}
          </div>
        ) : showEmptyGlobal ? (
          <EmptyState
            title="Sin locales gastronómicos"
            description="Todavía no hay locales cargados. Creá el primero desde el botón de arriba."
            actionLabel="Nuevo local gastronómico"
            actionHref="/admin/gastronomicos/nuevo"
          />
        ) : showEmptyFiltered ? (
          <EmptyState
            title="Sin resultados"
            description={
              hasClientOnlyFilters
                ? 'No hay locales que coincidan con los filtros (incluidos dueño, ficha pública o ciudad en esta página).'
                : 'No hay locales que coincidan con estos filtros.'
            }
          />
        ) : (
          <>
            <p className="mb-3 text-sm text-text-muted">
              {hasClientOnlyFilters
                ? `${locations.length} local(es) en esta vista`
                : `${meta?.total ?? locations.length} local(es)`}
              {meta && meta.totalPages > 1 && !hasClientOnlyFilters
                ? ` · página ${meta.page} de ${meta.totalPages}`
                : ''}
            </p>
            <AdminGastroLocationsTable
              locations={locations}
              statusPendingId={statusTargetId}
              onToggleStatus={handleToggleStatus}
            />
            <ul className="mt-4 space-y-3 md:hidden">
              {locations.map((loc) => (
                <li key={loc.id}>
                  <AdminGastroLocationsMobileCard
                    location={loc}
                    statusPending={statusTargetId === loc.id}
                    onToggleStatus={() => handleToggleStatus(loc)}
                  />
                </li>
              ))}
            </ul>
            {meta && meta.totalPages > 1 && !hasClientOnlyFilters ? (
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

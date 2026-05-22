'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  PageContainer,
  SectionTitle,
  PageLoader,
  QueryError,
  EmptyState,
  Button,
} from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { useAdminAuditUrlFilters } from '@/lib/admin/useAdminAuditUrlFilters';
import {
  ADMIN_AUDIT_DEFAULT_FILTERS,
  filtersToAdminAuditQuery,
  type AdminAuditFiltersState,
} from '@/lib/admin/admin-audit-filters';
import { useAdminAuditLogs } from '@/lib/query/admin-audit';
import { AdminAuditFilters } from './AdminAuditFilters';
import { AdminAuditTable } from './AdminAuditTable';
import { AdminAuditMobileCard } from './AdminAuditMobileCard';

export function AdminAuditPageClient() {
  const { data: session, status } = useSession();
  const { filters, setFilters, clearFilters } = useAdminAuditUrlFilters();
  const [draft, setDraft] = useState<AdminAuditFiltersState>(filters);

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  const apiQuery = useMemo(() => filtersToAdminAuditQuery(filters, 20), [filters]);

  const listQuery = useAdminAuditLogs(
    apiQuery,
    filtersKey,
    status === 'authenticated',
  );

  const logs = listQuery.data?.data ?? [];
  const meta = listQuery.data?.meta;

  if (status === 'loading') {
    return (
      <PageContainer>
        <PageLoader message="Cargando auditoría…" />
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

      <header>
        <SectionTitle>Auditoría operativa</SectionTitle>
        <p className="mt-1 max-w-2xl text-sm text-text-muted">
          Trazabilidad de acciones administrativas: moderación de eventos, disputas de reseñas,
          tickets y más. Los registros provienen de la base de datos — no se inventan entradas.
        </p>
      </header>

      <div className="mt-6">
        <AdminAuditFilters
          filters={draft}
          onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
          onApply={() => setFilters({ ...draft, page: 1 })}
          onClear={() => {
            clearFilters();
            setDraft(ADMIN_AUDIT_DEFAULT_FILTERS);
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
                className="h-20 animate-pulse rounded-xl border border-border/60 bg-bg-muted/40"
              />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            title="Sin registros"
            description="No hay logs para estos filtros. Probá ampliar el rango de fechas o limpiar filtros."
          />
        ) : (
          <>
            <p className="mb-3 text-sm text-text-muted">
              {meta?.total ?? logs.length} registro(s)
              {meta && meta.totalPages > 1
                ? ` · página ${meta.page} de ${meta.totalPages}`
                : ''}
            </p>
            <AdminAuditTable logs={logs} />
            <ul className="mt-4 space-y-3 md:hidden">
              {logs.map((log) => (
                <li key={log.id}>
                  <AdminAuditMobileCard log={log} />
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

'use client';

import { useMemo, useState } from 'react';
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
import { AdminDashboardKpiCard } from '@/components/admin/dashboard/AdminDashboardKpiCard';
import { useAdminLegalDocuments } from '@/lib/query/admin-legal-documents';
import { AdminLegalFilters, type LegalListFilter } from './AdminLegalFilters';
import {
  computeLegalListKpis,
  filterAdminLegalDocuments,
} from './admin-legal-filters.util';
import { AdminLegalDocumentsTable } from './AdminLegalDocumentsTable';
import { AdminLegalDocumentsMobileCard } from './AdminLegalDocumentsMobileCard';

export function AdminLegalDocumentsPageClient() {
  const { data: session, status } = useSession();
  const [filter, setFilter] = useState<LegalListFilter>('all');
  const filtersKey = 'all';

  const listQuery = useAdminLegalDocuments(
    undefined,
    filtersKey,
    status === 'authenticated',
  );

  const allItems = listQuery.data?.data ?? [];
  const items = useMemo(
    () => filterAdminLegalDocuments(allItems, filter),
    [allItems, filter],
  );
  const kpis = useMemo(() => computeLegalListKpis(allItems), [allItems]);

  if (status === 'loading') {
    return (
      <PageContainer>
        <PageLoader message="Cargando documentos legales…" />
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
        <SectionTitle>Legales</SectionTitle>
        <p className="mt-1 max-w-2xl text-sm text-text-muted">
          Gestioná términos, políticas, condiciones por perfil y procedimientos internos.
        </p>
      </header>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminDashboardKpiCard label="Documentos totales" value={kpis.total} />
        <AdminDashboardKpiCard label="Públicos" value={kpis.publicCount} />
        <AdminDashboardKpiCard label="Internos" value={kpis.internalCount} />
        <AdminDashboardKpiCard
          label="Pendientes de publicación"
          value={kpis.pendingPublish}
          hint="Sin versión publicada o con borrador"
        />
      </div>

      <div className="mt-6">
        <AdminLegalFilters value={filter} onChange={setFilter} />
      </div>

      <div className="mt-6">
        {listQuery.isLoading ? (
          <PageLoader message="Cargando listado…" />
        ) : listQuery.isError ? (
          <QueryError
            message="No se pudo cargar el listado de documentos legales."
            onRetry={() => listQuery.refetch()}
          />
        ) : allItems.length === 0 ? (
          <EmptyState
            title="Sin documentos legales"
            description="Ejecutá el seed legal en el backend o contactá soporte técnico."
          />
        ) : items.length === 0 ? (
          <div className="space-y-4 text-center">
            <EmptyState
              title="Sin resultados"
              description="Probá otro filtro para ver documentos."
            />
            <Button type="button" variant="secondary" onClick={() => setFilter('all')}>
              Ver todos
            </Button>
          </div>
        ) : (
          <>
            <AdminLegalDocumentsTable items={items} />
            <div className="mt-3 space-y-3 md:hidden">
              {items.map((item) => (
                <AdminLegalDocumentsMobileCard key={item.key} item={item} />
              ))}
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}

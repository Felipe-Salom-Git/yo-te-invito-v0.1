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
import { useAdminPaymentsUrlFilters } from '@/lib/admin/useAdminPaymentsUrlFilters';
import {
  ADMIN_PAYMENTS_DEFAULT_FILTERS,
  filtersToAdminPaymentsQuery,
  type AdminPaymentsFiltersState,
} from '@/lib/admin/admin-payments-filters';
import { useAdminPayments, useReconcileAdminPayment } from '@/lib/query/admin-payments';
import { AdminPaymentsFilters } from './AdminPaymentsFilters';
import { AdminPaymentsTable } from './AdminPaymentsTable';
import { AdminPaymentsMobileCard } from './AdminPaymentsMobileCard';

export function AdminPaymentsPageClient() {
  const { data: session, status } = useSession();
  const { filters, setFilters, clearFilters } = useAdminPaymentsUrlFilters();
  const [draft, setDraft] = useState<AdminPaymentsFiltersState>(filters);
  const reconcile = useReconcileAdminPayment();

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  const apiQuery = useMemo(() => filtersToAdminPaymentsQuery(filters, 20), [filters]);

  const listQuery = useAdminPayments(apiQuery, filtersKey, status === 'authenticated');

  const payments = listQuery.data?.data ?? [];
  const meta = listQuery.data?.meta;

  const handleReconcile = (paymentId: string) => {
    if (!window.confirm('¿Reconciliar este pago con Getnet ahora?')) return;
    reconcile.mutate(paymentId);
  };

  if (status === 'loading') {
    return (
      <PageContainer>
        <PageLoader message="Cargando pagos…" />
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
        <SectionTitle>Pagos</SectionTitle>
        <p className="mt-1 max-w-2xl text-sm text-text-muted">
          Seguimiento operativo de pagos, Getnet y casos de revisión manual.
        </p>
      </header>

      <div className="mt-6">
        <AdminPaymentsFilters
          filters={draft}
          onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
          onApply={() => setFilters({ ...draft, page: 1 })}
          onClear={() => {
            clearFilters();
            setDraft(ADMIN_PAYMENTS_DEFAULT_FILTERS);
          }}
        />
      </div>

      {reconcile.isError ? (
        <p className="mt-4 text-sm text-red-400">{getErrorMessage(reconcile.error)}</p>
      ) : null}
      {reconcile.isSuccess ? (
        <p className="mt-4 text-sm text-accent">
          Reconciliación: {reconcile.data.outcome}
          {reconcile.data.message ? ` — ${reconcile.data.message}` : ''}
        </p>
      ) : null}

      {listQuery.isError ? (
        <QueryError
          className="mt-6"
          message={getErrorMessage(listQuery.error)}
          onRetry={() => listQuery.refetch()}
        />
      ) : null}

      <div className="mt-6">
        {listQuery.isLoading ? (
          <PageLoader message="Cargando pagos…" />
        ) : payments.length === 0 ? (
          <EmptyState
            title="Sin pagos"
            description="No hay pagos que coincidan con los filtros."
          />
        ) : (
          <>
            <AdminPaymentsTable
              payments={payments}
              onReconcile={handleReconcile}
              reconcilePendingId={reconcile.isPending ? reconcile.variables : null}
            />
            <ul className="space-y-3 md:hidden">
              {payments.map((p) => (
                <AdminPaymentsMobileCard
                  key={p.id}
                  payment={p}
                  onReconcile={handleReconcile}
                  reconcilePending={reconcile.isPending && reconcile.variables === p.id}
                />
              ))}
            </ul>
          </>
        )}
      </div>

      {meta && meta.totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="text-sm text-text-muted">
            Página {meta.page} de {meta.totalPages} · {meta.total} pagos
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={meta.page <= 1}
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              disabled={meta.page >= meta.totalPages}
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            >
              Siguiente
            </Button>
          </div>
        </div>
      ) : null}
    </PageContainer>
  );
}

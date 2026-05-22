'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  PageContainer,
  SectionTitle,
  PageLoader,
  QueryError,
  EmptyState,
  Button,
} from '@/components';
import { useGastroValidationsList } from '@/lib/query/gastro-dashboard';
import { useRepositories } from '@/repositories/context';
import { gastroKeys } from '@/lib/query/keys';
import { getErrorMessage } from '@/lib/errors';
import type { GastroValidationListParams } from '@/repositories/interfaces';

function formatValueLabel(type: string, value: number): string {
  if (type === 'PERCENT') return `${value}%`;
  return `$${value}`;
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activo',
  PENDING_REVIEW: 'En revisión',
  COMMISSION_NEGOTIATION: 'Comisión',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Vencido',
};

export function GastroValidationsContent() {
  const repos = useRepositories();
  const [discountId, setDiscountId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  const params = useMemo((): GastroValidationListParams => {
    const p: GastroValidationListParams = { page, limit: 30 };
    if (discountId.trim()) p.discountId = discountId.trim();
    if (fromDate) p.from = new Date(`${fromDate}T00:00:00`).toISOString();
    if (toDate) p.to = new Date(`${toDate}T23:59:59.999`).toISOString();
    return p;
  }, [discountId, fromDate, toDate, page]);

  const listQuery = useGastroValidationsList(params);
  const discountsQuery = useQuery({
    queryKey: gastroKeys.discounts(),
    queryFn: () => repos.gastro.listMyDiscounts(),
  });

  const discounts = discountsQuery.data?.data ?? [];
  const items = listQuery.data?.data ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (listQuery.data?.limit ?? 30)));

  const discountOptions = useMemo(
    () =>
      discounts.map((d) => ({
        id: d.id,
        label: d.title?.trim() || d.code,
      })),
    [discounts],
  );

  const resetFilters = () => {
    setDiscountId('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  return (
    <PageContainer>
      <Link href="/gastro" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Dashboard
      </Link>
      <SectionTitle>Resumen de descuentos</SectionTitle>
      <p className="mt-2 text-sm text-text-muted">
        Validaciones registradas al escanear QR en puerta. No se muestran datos personales del
        comensal.
      </p>

      <div className="mt-6 grid gap-3 rounded-xl border border-border bg-bg-muted/40 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs text-text-muted">
          Descuento
          <select
            value={discountId}
            onChange={(e) => {
              setDiscountId(e.target.value);
              setPage(1);
            }}
            className="mt-1 block w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text"
          >
            <option value="">Todos</option>
            {discountOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-text-muted">
          Desde
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="mt-1 block w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text"
          />
        </label>
        <label className="text-xs text-text-muted">
          Hasta
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="mt-1 block w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text"
          />
        </label>
        <div className="flex items-end">
          <Button type="button" variant="secondary" onClick={resetFilters} className="w-full sm:w-auto">
            Limpiar filtros
          </Button>
        </div>
      </div>

      {!listQuery.isLoading && total > 0 && (
        <p className="mt-4 text-sm text-text-muted">
          <span className="font-semibold text-text">{total}</span> validación
          {total === 1 ? '' : 'es'} en total
        </p>
      )}

      {listQuery.isLoading && (
        <div className="mt-8">
          <PageLoader message="Cargando validaciones…" />
        </div>
      )}

      {listQuery.isError && (
        <div className="mt-8">
          <QueryError
            message={getErrorMessage(listQuery.error)}
            onRetry={() => listQuery.refetch()}
          />
        </div>
      )}

      {!listQuery.isLoading && !listQuery.isError && items.length === 0 && (
        <div className="mt-8">
          <EmptyState
            title="Sin validaciones"
            description="Cuando escanees descuentos en la PWA, aparecerán acá."
          />
        </div>
      )}

      {!listQuery.isLoading && items.length > 0 && (
        <>
          <ul className="mt-6 hidden space-y-2 md:block">
            <li className="grid grid-cols-[1fr_auto_auto] gap-4 px-2 text-xs font-medium uppercase text-text-muted">
              <span>Descuento</span>
              <span>Estado ticket</span>
              <span>Fecha</span>
            </li>
            {items.map((v) => (
              <li
                key={v.id}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-lg border border-border bg-bg-muted/50 px-4 py-3"
              >
                <div>
                  <Link
                    href="/gastro/descuentos"
                    className="font-medium text-accent hover:underline"
                  >
                    {v.discountTitle}
                  </Link>
                  <p className="text-xs text-text-muted">ID {v.discountId.slice(0, 10)}…</p>
                </div>
                <span className="rounded-full bg-bg px-2 py-0.5 text-xs text-text-muted">
                  {STATUS_LABEL[v.discountStatus] ?? v.discountStatus}
                </span>
                <span className="text-sm text-text-muted tabular-nums">
                  {new Date(v.validatedAt).toLocaleString('es-AR')}
                </span>
              </li>
            ))}
          </ul>

          <ul className="mt-6 space-y-3 md:hidden">
            {items.map((v) => (
              <li
                key={v.id}
                className="rounded-xl border border-border bg-bg-muted/50 p-4 shadow-sm"
              >
                <p className="font-semibold text-text">{v.discountTitle}</p>
                <p className="mt-1 text-xs text-text-muted">
                  {STATUS_LABEL[v.discountStatus] ?? v.discountStatus} ·{' '}
                  {new Date(v.validatedAt).toLocaleString('es-AR')}
                </p>
                <Link
                  href="/gastro/descuentos"
                  className="mt-3 inline-block text-sm text-accent hover:underline"
                >
                  Ver descuentos →
                </Link>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between gap-4">
              <Button
                type="button"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <span className="text-sm text-text-muted">
                Página {page} de {totalPages}
              </span>
              <Button
                type="button"
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}

      {!listQuery.isLoading && discounts.length > 0 && (
        <div className="mt-10 rounded-lg border border-border/60 bg-bg-muted/30 p-4">
          <p className="text-sm font-medium text-text">Tus descuentos</p>
          <ul className="mt-2 space-y-1 text-sm text-text-muted">
            {discounts.slice(0, 8).map((d) => (
              <li key={d.id} className="flex justify-between gap-2">
                <span className="text-text">{d.title ?? d.code}</span>
                <span>
                  {formatValueLabel(d.type, d.value)} · {STATUS_LABEL[d.status] ?? d.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </PageContainer>
  );
}

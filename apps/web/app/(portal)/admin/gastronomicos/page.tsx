'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { adminGastroKeys } from '@/lib/query/keys';
import { PageContainer, SectionTitle, Input } from '@/components';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'active', label: 'Activas' },
  { value: 'draft', label: 'Borrador' },
  { value: 'rejected', label: 'Rechazadas' },
  { value: 'suspended', label: 'Suspendidas' },
];

export default function AdminGastronomicosPage() {
  const repos = useRepositories();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [pendingOnly, setPendingOnly] = useState(false);

  const filterKey = useMemo(
    () => JSON.stringify({ search, status, pendingOnly }),
    [search, status, pendingOnly],
  );

  const { data, isLoading } = useQuery({
    queryKey: adminGastroKeys.list(filterKey),
    queryFn: () =>
      repos.adminGastro.listLocations({
        search: search.trim() || undefined,
        status: status || undefined,
        hasPendingDiscounts: pendingOnly || undefined,
        limit: 100,
      }),
  });

  const locations = data?.data ?? [];

  return (
    <PageContainer>
      <Link href="/admin" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Admin
      </Link>
      <SectionTitle>Gastronómicos</SectionTitle>
      <p className="mt-2 text-text-muted">
        Locales gastronómicos. Abrí un local para revisar tickets de descuento, curar imágenes y
        aprobar publicaciones.
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div className="min-w-[200px] flex-1">
          <Input
            label="Buscar"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre o email del titular"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Estado</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded border border-border bg-bg px-3 py-2 text-text"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-text">
          <input
            type="checkbox"
            checked={pendingOnly}
            onChange={(e) => setPendingOnly(e.target.checked)}
          />
          Con descuentos pendientes
        </label>
      </div>

      {isLoading ? (
        <p className="mt-6 text-text-muted">Cargando…</p>
      ) : locations.length === 0 ? (
        <p className="mt-6 text-text-muted">No hay locales que coincidan.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {locations.map((loc) => (
            <li
              key={loc.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-bg-muted p-4"
            >
              <div className="min-w-0">
                <Link
                  href={`/admin/gastronomicos/${loc.id}`}
                  className="font-medium text-text hover:text-accent"
                >
                  {loc.displayName}
                </Link>
                <p className="text-sm text-text-muted">
                  {loc.owner.email ?? 'Sin email'}
                  {loc.owner.name ? ` · ${loc.owner.name}` : ''}
                  {loc.city ? ` · ${loc.city}` : ''}
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  {loc.discountsCount} ticket(s) · {loc.pendingDiscountsCount} pendiente(s) ·{' '}
                  {loc.activeDiscountsCount} activo(s)
                </p>
                <p className="text-xs text-text-muted">
                  Alta: {new Date(loc.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Link
                href={`/admin/gastronomicos/${loc.id}`}
                className="text-sm font-medium text-accent hover:underline"
              >
                Ver descuentos →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}

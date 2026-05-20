'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { adminProducersKeys } from '@/lib/query/keys';
import { PageContainer, SectionTitle, Input } from '@/components';
import { AdminProducerStatusBadge } from '@/components/admin/producers/AdminProducerStatusBadge';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'active', label: 'Activas' },
  { value: 'draft', label: 'Borrador' },
  { value: 'rejected', label: 'Rechazadas' },
  { value: 'suspended', label: 'Suspendidas' },
];

export default function AdminProductorasPage() {
  const repos = useRepositories();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [pendingOnly, setPendingOnly] = useState(false);

  const filterKey = useMemo(
    () => JSON.stringify({ search, status, pendingOnly }),
    [search, status, pendingOnly],
  );

  const { data, isLoading } = useQuery({
    queryKey: adminProducersKeys.list(filterKey),
    queryFn: () =>
      repos.adminProducers.listProducers({
        search: search.trim() || undefined,
        status: status || undefined,
        hasPendingEvents: pendingOnly || undefined,
        limit: 100,
      }),
  });

  const producers = data?.data ?? [];

  return (
    <PageContainer>
      <Link href="/admin" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Admin
      </Link>
      <SectionTitle>Productoras</SectionTitle>
      <p className="mt-2 text-text-muted">
        Perfiles de productoras creados por usuarios. Abrí una productora para moderar sus eventos y
        ver métricas.
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
          Con eventos pendientes
        </label>
      </div>

      {isLoading ? (
        <p className="mt-6 text-text-muted">Cargando…</p>
      ) : producers.length === 0 ? (
        <p className="mt-6 text-text-muted">No hay productoras que coincidan.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {producers.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-bg-muted p-4"
            >
              <div className="min-w-0">
                <Link
                  href={`/admin/productoras/${p.id}`}
                  className="font-medium text-text hover:text-accent"
                >
                  {p.displayName}
                </Link>
                <p className="text-sm text-text-muted">
                  {p.owner.email ?? 'Sin email'}
                  {p.owner.name ? ` · ${p.owner.name}` : ''}
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  {p.eventsCount} evento(s) · {p.pendingEventsCount} pendiente(s) ·{' '}
                  {p.approvedEventsCount} aprobado(s)
                </p>
                <p className="text-xs text-text-muted">
                  Alta: {new Date(p.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <AdminProducerStatusBadge status={p.status} />
                <Link
                  href={`/admin/productoras/${p.id}`}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  Ver eventos →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}

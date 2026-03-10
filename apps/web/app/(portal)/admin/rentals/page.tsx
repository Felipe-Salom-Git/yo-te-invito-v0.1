'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle } from '@/components';

const TENANT_ID = 'tenant-demo';

export default function AdminRentalsPage() {
  const repos = useRepositories();

  const { data, isLoading } = useQuery({
    queryKey: ['events', 'admin', 'rentals', TENANT_ID],
    queryFn: () =>
      repos.events.list({ tenantId: TENANT_ID, category: 'rental', limit: 100 }),
  });

  const events = data?.data ?? [];

  return (
    <PageContainer>
      <Link href="/admin" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Admin
      </Link>
      <SectionTitle>Rentals (Alquileres)</SectionTitle>
      <p className="mt-2 text-text-muted">CRUD de alquileres.</p>

      <Link
        href="/admin/rentals/nuevo"
        className="mt-6 inline-block rounded border border-accent px-4 py-2 text-accent hover:bg-accent/10"
      >
        Crear rental
      </Link>

      {isLoading ? (
        <p className="mt-6 text-text-muted">Cargando…</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {events.map((ev) => (
            <li
              key={ev.id}
              className="flex items-center justify-between rounded-lg border border-border bg-bg-muted p-4"
            >
              <div>
                <Link href={`/rentals/${ev.id}`} className="font-medium text-text hover:text-accent">
                  {ev.title}
                </Link>
                <p className="text-sm text-text-muted">
                  {ev.city ?? ev.venueName ?? '—'} · {ev.startAt ? new Date(ev.startAt).toLocaleDateString() : '—'}
                </p>
              </div>
              <Link
                href={`/admin/rentals/${ev.id}/editar`}
                className="text-sm text-accent hover:underline"
              >
                Editar
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && events.length === 0 && (
        <p className="mt-6 text-text-muted">No hay rentals. Creá uno nuevo.</p>
      )}
    </PageContainer>
  );
}

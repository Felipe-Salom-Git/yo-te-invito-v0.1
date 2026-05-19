'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle } from '@/components';

const TENANT_ID = 'tenant-demo';

export default function AdminRentalsPage() {
  const repos = useRepositories();

  const { data, isLoading } = useQuery({
    queryKey: ['rental-locations', 'admin', TENANT_ID],
    queryFn: () => repos.rentalLocations.listAdmin({ tenantId: TENANT_ID, includeInactive: true }),
  });

  const locations = data?.data ?? [];

  return (
    <PageContainer>
      <Link href="/admin" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Admin
      </Link>
      <SectionTitle>Rentals (Alquileres)</SectionTitle>
      <p className="mt-2 text-text-muted">
        Gestioná locales y los productos que se muestran al usuario en cada uno.
      </p>

      <Link
        href="/admin/rentals/locales/nuevo"
        className="mt-6 inline-block rounded border border-accent px-4 py-2 text-accent hover:bg-accent/10"
      >
        Crear local
      </Link>

      {isLoading ? (
        <p className="mt-6 text-text-muted">Cargando…</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {locations.map((loc) => (
            <li
              key={loc.id}
              className="flex items-center justify-between rounded-lg border border-border bg-bg-muted p-4"
            >
              <div>
                <Link
                  href={`/admin/rentals/locales/${loc.id}`}
                  className="font-medium text-text hover:text-accent"
                >
                  {loc.name}
                </Link>
                <p className="text-sm text-text-muted">
                  {loc.address ?? 'Sin dirección'}
                  {loc.productCount != null ? ` · ${loc.productCount} producto(s)` : ''}
                  {!loc.isActive ? ' · Inactivo' : ''}
                </p>
              </div>
              <Link
                href={`/admin/rentals/locales/${loc.id}/editar`}
                className="text-sm text-accent hover:underline"
              >
                Editar local
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && locations.length === 0 && (
        <p className="mt-6 text-text-muted">No hay locales. Creá el primero.</p>
      )}
    </PageContainer>
  );
}

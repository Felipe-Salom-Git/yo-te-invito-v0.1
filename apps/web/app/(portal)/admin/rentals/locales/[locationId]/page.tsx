'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle } from '@/components';
import { LatLngMapPreview } from '@/components/admin/LatLngMapPreview';
import { RentalOpeningHoursDisplay } from '@/lib/rentals/openingHoursDisplay';

export default function AdminRentalLocalDetailPage() {
  const params = useParams();
  const locationId = (params?.locationId as string) ?? '';
  const repos = useRepositories();

  const { data: location, isLoading } = useQuery({
    queryKey: ['rental-locations', 'admin', locationId],
    queryFn: () => repos.rentalLocations.getAdmin(locationId),
    enabled: !!locationId,
  });

  const products = location?.products ?? [];

  return (
    <PageContainer>
      <Link href="/admin/rentals" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Rentals
      </Link>

      {isLoading ? (
        <p className="text-text-muted">Cargando…</p>
      ) : !location ? (
        <p className="text-text-muted">Local no encontrado</p>
      ) : (
        <>
          <SectionTitle>{location.name}</SectionTitle>
          <p className="mt-2 text-text-muted">{location.address ?? 'Sin dirección'}</p>
          <div className="mt-3">
            <p className="text-sm font-medium text-text">Horario de atención</p>
            <RentalOpeningHoursDisplay
              schedule={location.openingHours}
              note={location.openingHoursNote}
            />
          </div>
          {(location.geoLat != null || location.geoLng != null) && (
            <div className="mt-4">
              <p className="text-sm text-text-muted">
                {location.geoLat}, {location.geoLng}
              </p>
              <LatLngMapPreview
                lat={location.geoLat != null ? String(location.geoLat) : ''}
                lng={location.geoLng != null ? String(location.geoLng) : ''}
              />
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/admin/rentals/locales/${locationId}/editar`}
              className="rounded border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent/10"
            >
              Editar local
            </Link>
            <Link
              href={`/admin/rentals/locales/${locationId}/productos/nuevo`}
              className="rounded border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent/10"
            >
              Agregar producto
            </Link>
          </div>

          <h2 className="mt-10 text-lg font-semibold text-text">Productos</h2>
          {products.length === 0 ? (
            <p className="mt-4 text-text-muted">Este local aún no tiene productos.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {products.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-bg-muted p-4"
                >
                  <div>
                    <Link
                      href={`/rentals/${p.id}`}
                      className="font-medium text-text hover:text-accent"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {p.title}
                    </Link>
                    {p.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-text-muted">{p.description}</p>
                    )}
                  </div>
                  <Link
                    href={`/admin/rentals/locales/${locationId}/productos/${p.id}/editar`}
                    className="text-sm text-accent hover:underline"
                  >
                    Editar
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </PageContainer>
  );
}

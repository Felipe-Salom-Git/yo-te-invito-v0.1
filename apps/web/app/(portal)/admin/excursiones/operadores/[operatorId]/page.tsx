'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { excursionOperatorsKeys } from '@/lib/query/keys';
import { PageContainer, SectionTitle } from '@/components';
import { LatLngMapPreview } from '@/components/admin/LatLngMapPreview';
import { RentalOpeningHoursDisplay } from '@/lib/rentals/openingHoursDisplay';
import { AdminExcursionOperatorLifecycleActions } from '@/components/admin/AdminExcursionOperatorLifecycleActions';
import { AdminEventLifecycleActions } from '@/components/admin/AdminEventLifecycleActions';

export default function AdminExcursionOperadorDetailPage() {
  const params = useParams();
  const operatorId = (params?.operatorId as string) ?? '';
  const repos = useRepositories();

  const { data: operator, isLoading } = useQuery({
    queryKey: excursionOperatorsKeys.adminDetail(operatorId),
    queryFn: () => repos.excursionOperators.getAdmin(operatorId),
    enabled: !!operatorId,
  });

  const excursions = operator?.excursions ?? [];

  return (
    <PageContainer>
      <Link
        href="/admin/excursiones"
        className="mb-4 inline-block text-sm text-text-muted hover:text-text"
      >
        ← Excursiones
      </Link>

      {isLoading ? (
        <p className="text-text-muted">Cargando…</p>
      ) : !operator ? (
        <p className="text-text-muted">Operador no encontrado</p>
      ) : (
        <>
          <SectionTitle>{operator.name}</SectionTitle>
          <p className="mt-2 text-text-muted">
            {[operator.city, operator.address].filter(Boolean).join(' · ') || 'Sin dirección'}
          </p>
          {operator.contactPhone && (
            <p className="mt-1 text-sm text-text-muted">Contacto: {operator.contactPhone}</p>
          )}
          <div className="mt-3">
            <p className="text-sm font-medium text-text">Horario de atención</p>
            <RentalOpeningHoursDisplay
              schedule={operator.openingHours}
              note={operator.openingHoursNote}
            />
          </div>
          {(operator.geoLat != null || operator.geoLng != null) && (
            <div className="mt-4">
              <LatLngMapPreview
                lat={operator.geoLat != null ? String(operator.geoLat) : ''}
                lng={operator.geoLng != null ? String(operator.geoLng) : ''}
              />
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href={`/admin/excursiones/operadores/${operatorId}/editar`}
              className="rounded border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent/10"
            >
              Editar operador
            </Link>
            <Link
              href={`/admin/excursiones/operadores/${operatorId}/excursiones/nuevo`}
              className="rounded border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent/10"
            >
              Nueva excursión
            </Link>
            <AdminExcursionOperatorLifecycleActions
              operatorId={operatorId}
              isActive={operator.isActive}
            />
          </div>

          <h2 className="mt-10 text-lg font-semibold text-text">Excursiones</h2>
          {excursions.length === 0 ? (
            <p className="mt-4 text-text-muted">Este operador aún no tiene excursiones.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {excursions.map((ex) => (
                <li
                  key={ex.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-bg-muted p-4"
                >
                  <div>
                    <Link
                      href={`/excursiones/${ex.id}`}
                      className="font-medium text-text hover:text-accent"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {ex.title}
                    </Link>
                    {ex.summary && (
                      <p className="mt-1 line-clamp-2 text-sm text-text-muted">{ex.summary}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Link
                      href={`/admin/excursiones/operadores/${operatorId}/excursiones/${ex.id}/editar`}
                      className="text-sm text-accent hover:underline"
                    >
                      Editar excursión
                    </Link>
                    <AdminEventLifecycleActions
                      eventId={ex.id}
                      status={(ex.status ?? 'APPROVED').toLowerCase()}
                      compact
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </PageContainer>
  );
}

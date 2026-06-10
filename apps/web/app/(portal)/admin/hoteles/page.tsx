'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PageContainer,
  SectionTitle,
  Button,
  EmptyState,
  QueryError,
  useToast,
} from '@/components';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { AdminArchiveConfirmModal } from '@/components/admin/AdminArchiveConfirmModal';
import { useRepositories } from '@/repositories/context';
import { getErrorMessage } from '@/lib/errors';
import { useHotelProfileLifecycleMutation } from '@/lib/query/admin-content-lifecycle';
import type { AdminHotelProfileListItem } from '@yo-te-invito/shared';

const STATUS_LABEL: Record<AdminHotelProfileListItem['status'], string> = {
  ACTIVE: 'Activo',
  SUSPENDED: 'Archivado',
  PENDING: 'Pendiente',
  DRAFT: 'Borrador',
  REJECTED: 'Rechazado',
};

export default function AdminHotelesPage() {
  const repos = useRepositories();
  const { addToast } = useToast();
  const [target, setTarget] = useState<AdminHotelProfileListItem | null>(null);
  const lifecycle = useHotelProfileLifecycleMutation();

  const listQuery = useQuery({
    queryKey: ['admin', 'hotel-profiles'],
    queryFn: () => repos.adminHotelProfiles.list({ includeInactive: true }),
  });

  const hotels = listQuery.data?.data ?? [];

  const handleConfirm = (reason?: string) => {
    if (!target) return;
    const action = target.status === 'ACTIVE' ? 'suspend' : 'activate';
    lifecycle.mutate(
      { profileId: target.id, action, reason },
      {
        onSuccess: () => {
          addToast(
            action === 'suspend' ? 'Hotel archivado' : 'Hotel restaurado',
            'success',
          );
          setTarget(null);
        },
        onError: (err) => addToast(getErrorMessage(err), 'error'),
      },
    );
  };

  return (
    <PageContainer>
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Hoteles' }]} />
      <SectionTitle>Hoteles</SectionTitle>
      <p className="mt-2 max-w-2xl text-sm text-text-muted">
        Archivar o restaurar perfiles hotel sin borrar datos. Los hoteles archivados no aparecen en
        fichas públicas. La vertical sigue en Próximamente en discovery principal.
      </p>

      {listQuery.isError ? (
        <div className="mt-6">
          <QueryError message={getErrorMessage(listQuery.error)} onRetry={() => listQuery.refetch()} />
        </div>
      ) : listQuery.isLoading ? (
        <p className="mt-6 text-text-muted">Cargando…</p>
      ) : hotels.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No hay perfiles hotel" />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {hotels.map((hotel) => {
            const isSuspended = hotel.status === 'SUSPENDED';
            const canArchive = hotel.status === 'ACTIVE';
            const canRestore = hotel.status === 'SUSPENDED';
            return (
              <li
                key={hotel.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-bg-muted p-4"
              >
                <div>
                  <p className="font-medium text-text">{hotel.displayName}</p>
                  <p className="text-sm text-text-muted">
                    {hotel.city?.trim() || 'Sin ciudad'} · {STATUS_LABEL[hotel.status]}
                  </p>
                </div>
                <div className="flex gap-2">
                  {canArchive ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTarget(hotel)}
                      disabled={lifecycle.isPending}
                    >
                      Archivar
                    </Button>
                  ) : null}
                  {canRestore ? (
                    <Button size="sm" onClick={() => setTarget(hotel)} disabled={lifecycle.isPending}>
                      Restaurar
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-8 text-sm text-text-muted">
        <Link href="/admin" className="text-accent hover:underline">
          ← Volver a administración
        </Link>
      </p>

      <AdminArchiveConfirmModal
        open={target != null}
        title={target?.status === 'ACTIVE' ? 'Archivar hotel' : 'Restaurar hotel'}
        description={
          target?.status === 'ACTIVE'
            ? `«${target.displayName}» dejará de mostrarse públicamente. No se borran reseñas ni historial.`
            : `¿Restaurar «${target?.displayName ?? ''}» y volver a mostrarlo si corresponde?`
        }
        confirmLabel={target?.status === 'ACTIVE' ? 'Archivar' : 'Restaurar'}
        onClose={() => setTarget(null)}
        onConfirm={handleConfirm}
        isPending={lifecycle.isPending}
      />
    </PageContainer>
  );
}

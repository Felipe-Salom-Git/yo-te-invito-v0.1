'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  canArchiveGastroDiscount,
  canUnarchiveGastroDiscount,
} from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { PageContainer, PageLoader, QueryError, useToast } from '@/components';
import { GastroDiscountDetailContent } from '@/components/gastro/GastroDiscountDetailContent';
import { useGastroActiveLocation } from '@/lib/gastro/GastroActiveLocationContext';
import { gastroKeys } from '@/lib/query/keys';
import { getErrorMessage } from '@/lib/errors';

function profileQuery(profileId?: string) {
  return profileId ? `?profileId=${encodeURIComponent(profileId)}` : '';
}

export default function GastroDescuentoDetallePage() {
  const params = useParams();
  const id = (params?.id as string) ?? '';
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { profileId } = useGastroActiveLocation();

  const summaryQuery = useQuery({
    queryKey: gastroKeys.discountSummary(id),
    queryFn: () => repos.gastro.getMyDiscountSummary(id),
    enabled: !!id,
  });

  const discountQuery = useQuery({
    queryKey: gastroKeys.discount(id),
    queryFn: () => repos.gastro.getMyDiscount(id),
    enabled: !!id,
  });

  const discountProfileId =
    discountQuery.data?.gastroProfileId ??
    summaryQuery.data?.discount.locationId ??
    profileId ??
    undefined;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: gastroKeys.discountSummary(id) });
    queryClient.invalidateQueries({ queryKey: gastroKeys.discount(id) });
    queryClient.invalidateQueries({ queryKey: gastroKeys.discounts(discountProfileId) });
  };

  const statusMutation = useMutation({
    mutationFn: (status: 'ACTIVE' | 'CANCELLED') =>
      repos.gastro.updateMyDiscountStatus(id, { status }),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: (_, status) => {
      addToast(status === 'ACTIVE' ? 'Descuento activado' : 'Descuento desactivado', 'success');
      invalidate();
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (archived: boolean) => repos.gastro.archiveMyDiscount(id, { archived }),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: (_, archived) => {
      addToast(archived ? 'Descuento archivado' : 'Descuento restaurado del archivo', 'success');
      invalidate();
    },
  });

  const discount = discountQuery.data;
  const archiveInput = discount
    ? {
        status: discount.status,
        archivedAt: discount.archivedAt,
        validityMode: discount.validityMode,
        validTo: discount.validTo,
        discountDate: discount.discountDate,
      }
    : null;
  const showArchive = archiveInput ? canArchiveGastroDiscount(archiveInput) : false;
  const showUnarchive = archiveInput ? canUnarchiveGastroDiscount(archiveInput) : false;

  return (
    <PageContainer>
      <Link
        href={`/gastro/descuentos${profileQuery(discountProfileId)}`}
        className="mb-4 inline-block text-sm text-accent"
      >
        ← Volver a descuentos
      </Link>

      {summaryQuery.isLoading ? <PageLoader message="Cargando detalle…" /> : null}
      {summaryQuery.isError ? (
        <QueryError
          message={getErrorMessage(summaryQuery.error)}
          onRetry={() => summaryQuery.refetch()}
        />
      ) : null}

      {summaryQuery.data ? (
        <GastroDiscountDetailContent
          summary={summaryQuery.data}
          editHref={`/gastro/descuentos/${id}/editar${profileQuery(discountProfileId)}`}
          statusLoading={statusMutation.isPending}
          onActivate={() => statusMutation.mutate('ACTIVE')}
          onDeactivate={() => statusMutation.mutate('CANCELLED')}
        />
      ) : null}

      {discount?.hasPendingUpdate && (
        <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          Tu descuento publicado sigue activo con la versión actual mientras revisamos los cambios.
        </p>
      )}

      {discount && (showArchive || showUnarchive) && (
        <div className="mt-6">
          {showUnarchive ? (
            <button
              type="button"
              className="rounded-lg border border-border px-4 py-2 text-sm"
              disabled={archiveMutation.isPending}
              onClick={() => archiveMutation.mutate(false)}
            >
              Restaurar del archivo
            </button>
          ) : (
            <button
              type="button"
              className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted"
              disabled={archiveMutation.isPending}
              onClick={() => {
                if (window.confirm('¿Archivar este descuento? No se borra el histórico de claims.')) {
                  archiveMutation.mutate(true);
                }
              }}
            >
              Archivar
            </button>
          )}
        </div>
      )}
    </PageContainer>
  );
}

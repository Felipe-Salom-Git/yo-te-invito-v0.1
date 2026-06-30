'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, PageLoader, QueryError, useToast } from '@/components';
import { GastroDiscountDetailContent } from '@/components/gastro/GastroDiscountDetailContent';
import { gastroKeys } from '@/lib/query/keys';
import { getErrorMessage } from '@/lib/errors';

export default function GastroDescuentoDetallePage() {
  const params = useParams();
  const id = (params?.id as string) ?? '';
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const summaryQuery = useQuery({
    queryKey: gastroKeys.discountSummary(id),
    queryFn: () => repos.gastro.getMyDiscountSummary(id),
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: gastroKeys.discountSummary(id) });
    queryClient.invalidateQueries({ queryKey: gastroKeys.discount(id) });
    queryClient.invalidateQueries({ queryKey: gastroKeys.discounts() });
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

  return (
    <PageContainer>
      <Link href="/gastro/descuentos" className="mb-4 inline-block text-sm text-accent">
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
          editHref={`/gastro/descuentos/${id}/editar`}
          statusLoading={statusMutation.isPending}
          onActivate={() => statusMutation.mutate('ACTIVE')}
          onDeactivate={() => statusMutation.mutate('CANCELLED')}
        />
      ) : null}
    </PageContainer>
  );
}

'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, PageLoader, QueryError, SectionTitle, useToast } from '@/components';
import { GastroDiscountForm } from '@/components/gastro/GastroDiscountForm';
import { getErrorMessage } from '@/lib/errors';
import { useMe } from '@/hooks/useMe';
import { gastroKeys } from '@/lib/query/keys';

export default function GastroDescuentoEditarPage() {
  const params = useParams();
  const id = (params?.id as string) ?? '';
  const repos = useRepositories();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: local } = useQuery({
    queryKey: gastroKeys.local(),
    queryFn: () => repos.gastro.getMyLocal(),
    staleTime: 60_000,
  });
  const { user: me } = useMe();
  const gastroProfileId = local?.id ?? me?.availableProfiles?.gastro?.profiles?.[0]?.id;

  const discountQuery = useQuery({
    queryKey: gastroKeys.discount(id),
    queryFn: () => repos.gastro.getMyDiscount(id),
    enabled: !!id,
  });

  const summaryQuery = useQuery({
    queryKey: gastroKeys.discountSummary(id),
    queryFn: () => repos.gastro.getMyDiscountSummary(id),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof repos.gastro.updateMyDiscount>[1]) =>
      repos.gastro.updateMyDiscount(id, payload),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gastroKeys.discount(id) });
      queryClient.invalidateQueries({ queryKey: gastroKeys.discountSummary(id) });
      queryClient.invalidateQueries({ queryKey: gastroKeys.discounts() });
      addToast('Descuento actualizado', 'success');
      router.push(`/gastro/descuentos/${id}`);
    },
  });

  const discount = discountQuery.data;
  const hasClaims = summaryQuery.data?.hasExistingClaims ?? false;

  return (
    <PageContainer>
      <Link href={`/gastro/descuentos/${id}`} className="mb-4 inline-block text-sm text-accent">
        ← Volver al detalle
      </Link>
      <SectionTitle>Editar ticket de descuento</SectionTitle>

      {discountQuery.isLoading ? <PageLoader message="Cargando…" /> : null}
      {discountQuery.isError ? (
        <QueryError
          message={getErrorMessage(discountQuery.error)}
          onRetry={() => discountQuery.refetch()}
        />
      ) : null}

      {hasClaims ? (
        <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Este descuento ya tiene cupones emitidos. Los cambios afectarán futuras validaciones de
          cupones disponibles.
        </p>
      ) : null}

      {discount ? (
        <GastroDiscountForm
          mode="edit"
          gastroProfileId={gastroProfileId}
          submitting={updateMutation.isPending}
          initial={{
            title: discount.title ?? '',
            summary: discount.summary ?? '',
            detail: discount.detail ?? '',
            validFrom: discount.validFrom ?? discount.discountDate ?? undefined,
            validTo: discount.validTo ?? discount.discountDate ?? undefined,
            validityMode: discount.validityMode,
            validWeekday: discount.validWeekday ?? undefined,
            imageUrls: discount.imageUrls ?? discount.submittedImageUrls,
          }}
          onSubmit={(payload) => {
            const { commissionCoordinationAccepted: _c, ...patch } = payload;
            updateMutation.mutate(patch);
          }}
        />
      ) : null}
    </PageContainer>
  );
}

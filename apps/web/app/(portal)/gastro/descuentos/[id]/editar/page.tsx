'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, PageLoader, QueryError, SectionTitle, useToast } from '@/components';
import { GastroDiscountForm } from '@/components/gastro/GastroDiscountForm';
import { getErrorMessage } from '@/lib/errors';
import { gastroKeys } from '@/lib/query/keys';

function profileQuery(profileId?: string) {
  return profileId ? `?profileId=${encodeURIComponent(profileId)}` : '';
}

export default function GastroDescuentoEditarPage() {
  const params = useParams();
  const id = (params?.id as string) ?? '';
  const repos = useRepositories();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

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

  const gastroProfileId =
    discountQuery.data?.gastroProfileId ??
    summaryQuery.data?.discount.locationId ??
    undefined;

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof repos.gastro.updateMyDiscount>[1]) =>
      repos.gastro.updateMyDiscount(id, payload),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: gastroKeys.discount(id) });
      queryClient.invalidateQueries({ queryKey: gastroKeys.discountSummary(id) });
      queryClient.invalidateQueries({ queryKey: gastroKeys.discounts(gastroProfileId) });
      addToast(
        updated.hasPendingUpdate
          ? 'Cambios enviados a revisión. El descuento publicado sigue activo.'
          : 'Descuento actualizado',
        'success',
      );
      router.push(`/gastro/descuentos/${id}${profileQuery(gastroProfileId)}`);
    },
  });

  const discount = discountQuery.data;
  const hasClaims = summaryQuery.data?.hasExistingClaims ?? false;

  return (
    <PageContainer>
      <Link
        href={`/gastro/descuentos/${id}${profileQuery(gastroProfileId)}`}
        className="mb-4 inline-block text-sm text-accent"
      >
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

      {discount?.hasPendingUpdate ? (
        <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Tu descuento publicado sigue activo con la versión actual mientras revisamos los cambios.
          Si volvés a guardar, se reemplaza la propuesta pendiente.
        </p>
      ) : discount && ['ACTIVE', 'APPROVED'].includes(discount.status) ? (
        <p className="mb-4 rounded-lg border border-border bg-bg-muted/40 px-4 py-3 text-sm text-text-muted">
          Los cambios de contenido se envían a revisión. El descuento publicado sigue activo con la
          versión actual hasta que administración apruebe la edición.
        </p>
      ) : discount?.status === 'PENDING_REVIEW' ? (
        <p className="mb-4 rounded-lg border border-border bg-bg-muted/40 px-4 py-3 text-sm text-text-muted">
          Este ticket todavía no está publicado. Los cambios se aplican al envío en revisión.
        </p>
      ) : null}

      {hasClaims ? (
        <p className="mb-4 rounded-lg border border-border px-4 py-3 text-sm text-text-muted">
          Este descuento ya tiene cupones emitidos. Los cupones existentes siguen válidos; no se
          regeneran QR ni códigos cortos.
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

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  buildGastroDiscountStudioPreviewContext,
  courtesyDisplayStateLabel,
  isCourtesyOnlyVisibility,
  resolveCourtesyActions,
} from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { PageContainer, PageLoader, QueryError, Breadcrumbs } from '@/components';
import { GastroQrStudioClient } from '@/components/gastro/qr-studio/GastroQrStudioClient';
import { useGastroActiveLocation } from '@/lib/gastro/GastroActiveLocationContext';
import { gastroKeys } from '@/lib/query/keys';
import { withCourtesyProfileQuery } from '@/lib/gastro/courtesy-scope';

function profileQuery(profileId?: string) {
  return profileId ? `?profileId=${encodeURIComponent(profileId)}` : '';
}

export default function GastroDiscountQrStudioPage() {
  const params = useParams();
  const id = (params?.id as string) ?? '';
  const repos = useRepositories();
  const { profileId } = useGastroActiveLocation();

  const discountQuery = useQuery({
    queryKey: gastroKeys.discount(id),
    queryFn: () => repos.gastro.getMyDiscount(id),
    enabled: !!id,
  });

  const discount = discountQuery.data;
  const gastroProfileId = discount?.gastroProfileId ?? profileId ?? '';

  // Same editor for PUBLIC discounts and COURTESY_ONLY: a courtesy previews its campaign
  // benefit label (never "0%") through the same canonical `discountValue` binding.
  const previewCtx = buildGastroDiscountStudioPreviewContext(discount);
  const isCourtesy = isCourtesyOnlyVisibility(discount?.visibility);
  const subject = isCourtesy ? 'cortesía' : 'descuento';

  if (!id) {
    return (
      <PageContainer className="!max-w-7xl">
        <p className="text-text-muted">Ruta inválida.</p>
      </PageContainer>
    );
  }

  if (discountQuery.isLoading) {
    return (
      <PageContainer className="!max-w-7xl">
        <PageLoader message="Cargando QR Studio…" />
      </PageContainer>
    );
  }

  if (discountQuery.isError || !discount) {
    return (
      <PageContainer className="!max-w-7xl">
        <QueryError message="No se pudo cargar el descuento o la cortesía." />
      </PageContainer>
    );
  }

  if (!gastroProfileId) {
    return (
      <PageContainer className="!max-w-7xl">
        <p className="text-text-muted">Este descuento no tiene un local asociado.</p>
      </PageContainer>
    );
  }

  // G8.9.8: a rejected / cancelled / expired / archived courtesy is never seen again by its
  // recipients, so its design is not editable.
  if (
    isCourtesy &&
    !resolveCourtesyActions({
      actor: 'OWNER',
      status: discount.status,
      archivedAt: discount.archivedAt,
      validTo: discount.validTo,
      createdByOrigin: discount.createdByOrigin,
    }).editDesign
  ) {
    return (
      <PageContainer className="!max-w-7xl">
        <p className="text-text-muted">
          El diseño de esta cortesía ya no se puede editar (
          {courtesyDisplayStateLabel(discount).toLowerCase()}).
        </p>
        <Link
          href={`/gastro/descuentos/${id}${profileQuery(gastroProfileId)}`}
          className="mt-4 inline-block text-sm text-accent hover:underline"
        >
          Volver a la cortesía
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="!max-w-7xl">
      <Breadcrumbs
        items={[
          isCourtesy
            ? {
                href: withCourtesyProfileQuery('/gastro/descuentos?tipo=cortesias', gastroProfileId),
                label: 'Cortesías',
              }
            : { href: `/gastro/descuentos${profileQuery(gastroProfileId)}`, label: 'Descuentos' },
          {
            href: `/gastro/descuentos/${id}${profileQuery(gastroProfileId)}`,
            label: discount.title ?? 'Descuento',
          },
          { label: 'QR Studio' },
        ]}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-text">Editar diseño de la {subject}</h1>
        <Link
          href={`/gastro/descuentos/${id}${profileQuery(gastroProfileId)}`}
          className="text-sm text-accent hover:underline"
        >
          Volver a la {subject}
        </Link>
      </div>
      <GastroQrStudioClient
        discountId={id}
        gastroProfileId={gastroProfileId}
        previewCtx={previewCtx}
      />
    </PageContainer>
  );
}

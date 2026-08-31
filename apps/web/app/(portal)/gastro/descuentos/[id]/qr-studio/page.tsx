'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  DISCOUNT_VISUAL_STUDIO_PREVIEW_CONTEXT,
  type DiscountVisualRenderContext,
} from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { PageContainer, PageLoader, QueryError, Breadcrumbs } from '@/components';
import { GastroQrStudioClient } from '@/components/gastro/qr-studio/GastroQrStudioClient';
import { useGastroActiveLocation } from '@/lib/gastro/GastroActiveLocationContext';
import { gastroKeys } from '@/lib/query/keys';

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

  const previewCtx: DiscountVisualRenderContext = {
    ...DISCOUNT_VISUAL_STUDIO_PREVIEW_CONTEXT,
    gastroName: discount?.gastroProfileName ?? DISCOUNT_VISUAL_STUDIO_PREVIEW_CONTEXT.gastroName,
    discountTitle: discount?.title ?? DISCOUNT_VISUAL_STUDIO_PREVIEW_CONTEXT.discountTitle,
    discountType: (discount?.type as 'PERCENT' | 'FIXED') ?? 'PERCENT',
    discountValue: discount?.value ?? 20,
    validityMode: discount?.validityMode,
    validWeekday: discount?.validWeekday ?? null,
    validFrom: discount?.validFrom,
    validTo: discount?.validTo,
    discountDate: discount?.discountDate,
    shortCode: 'ABC-123',
  };

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
        <QueryError message="No se pudo cargar el descuento." />
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

  return (
    <PageContainer className="!max-w-7xl">
      <Breadcrumbs
        items={[
          { href: `/gastro/descuentos${profileQuery(gastroProfileId)}`, label: 'Descuentos' },
          {
            href: `/gastro/descuentos/${id}${profileQuery(gastroProfileId)}`,
            label: discount.title ?? 'Descuento',
          },
          { label: 'QR Studio' },
        ]}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-text">Diseñar QR</h1>
        <Link
          href={`/gastro/descuentos/${id}${profileQuery(gastroProfileId)}`}
          className="text-sm text-accent hover:underline"
        >
          Volver al descuento
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

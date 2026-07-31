'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageContainer, SectionTitle } from '@/components';
import { GastroDiscountClaimForm } from '@/components/gastro/GastroDiscountClaimForm';
import {
  formatGastroDiscountBenefit,
  formatGastroDiscountValidityLabel,
} from '@/lib/gastro/discount-status-ui';
import { useGastroPublishedDiscount } from '@/lib/query/useGastroPublishedDiscounts';

export default function PublicGastroDiscountPage() {
  const params = useParams();
  const discountId = (params?.id as string) ?? '';
  const { data: discount, isLoading, isError } = useGastroPublishedDiscount(discountId);

  if (isLoading) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando descuento…</p>
      </PageContainer>
    );
  }

  if (isError || !discount) {
    return (
      <PageContainer>
        <p className="text-text-muted">Descuento no encontrado.</p>
        <Link href="/categoria/gastro" className="mt-4 inline-block text-accent hover:underline">
          ← Gastronomía
        </Link>
      </PageContainer>
    );
  }

  const title = discount.title?.trim() || 'Descuento';
  const benefit = formatGastroDiscountBenefit(discount);
  const validityLabel = formatGastroDiscountValidityLabel(discount);
  const isWeekly = discount.validityMode === 'WEEKLY_RECURRING';

  return (
    <PageContainer>
      <Link
        href="/categoria/gastro?subcategory=descuentos"
        className="mb-4 inline-block text-sm text-text-muted hover:text-text"
      >
        ← Descuentos
      </Link>

      <SectionTitle>{title}</SectionTitle>
      <p className="mt-1 text-text-muted">
        {discount.locationName}
        {discount.locationCity ? ` · ${discount.locationCity}` : ''}
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div>
          {discount.headerImageUrl || discount.imageUrls[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={discount.headerImageUrl ?? discount.imageUrls[0] ?? ''}
              alt=""
              className="w-full rounded-xl border border-border object-cover"
            />
          ) : null}
          {discount.summary?.trim() && (
            <p className="mt-4 text-text">{discount.summary.trim()}</p>
          )}
          {discount.detail?.trim() && (
            <p className="mt-2 text-sm text-text-muted">{discount.detail.trim()}</p>
          )}
          <p className="mt-4 text-sm font-medium text-accent">{benefit}</p>
          {validityLabel ? (
            <p className="mt-1 text-sm text-text-muted">
              {isWeekly ? 'Recurrencia: ' : 'Vigencia: '}
              {validityLabel}
            </p>
          ) : null}
          <Link
            href={`/gastronomicos/${discount.locationId}`}
            className="mt-4 inline-block text-sm text-accent hover:underline"
          >
            Ver local →
          </Link>
        </div>

        <GastroDiscountClaimForm discountId={discount.id} claimable={discount.claimable} />
      </div>
    </PageContainer>
  );
}

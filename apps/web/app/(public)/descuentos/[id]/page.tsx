'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageContainer, SectionTitle } from '@/components';
import { GastroDiscountClaimForm } from '@/components/gastro/GastroDiscountClaimForm';
import { useGastroPublishedDiscount } from '@/lib/query/useGastroPublishedDiscounts';

function formatValue(type: 'PERCENT' | 'FIXED', value: number): string {
  return type === 'PERCENT' ? `${value}%` : `$${value}`;
}

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
          <p className="mt-4 text-sm font-medium text-accent">
            {formatValue(discount.type, discount.value)}
            {discount.discountDate && (
              <span className="text-text-muted">
                {' '}
                · Válido desde{' '}
                {new Date(discount.discountDate).toLocaleDateString('es-AR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            )}
          </p>
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

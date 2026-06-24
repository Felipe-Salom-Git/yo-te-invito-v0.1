'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle } from '@/components';
import { GastroDiscountQrCard } from '@/components/gastro/GastroDiscountQrCard';
import { formatGastroDiscountValidTo } from '@/lib/gastro/discount-status-ui';
import type { MeGastroDiscountItem } from '@yo-te-invito/shared';

function DiscountCard({ item }: { item: MeGastroDiscountItem }) {
  const restaurantHref = item.locationSlug
    ? `/gastronomicos/${item.locationId}`
    : `/gastronomicos/${item.locationId}`;
  const validToLabel = formatGastroDiscountValidTo(item.validTo);

  return (
    <li className="space-y-4">
      <GastroDiscountQrCard
        locationName={item.locationName}
        discountTitle={item.discountTitle ?? item.discountLabel ?? 'Descuento'}
        discountDescription={item.discountDescription}
        discountLabel={item.discountLabel}
        qrPayload={item.qrPayload}
        qrCode={item.qrCode}
        status={item.status}
        validTo={item.validTo}
        type={item.type}
      />

      <dl className="mx-auto grid max-w-sm gap-1 px-1 text-sm text-text-muted">
        {validToLabel ? (
          <div>
            <dt className="inline">Vencimiento: </dt>
            <dd className="inline">{validToLabel}</dd>
          </div>
        ) : null}
        <div>
          <dt className="inline">Emitido: </dt>
          <dd className="inline">
            {new Date(item.createdAt).toLocaleDateString('es-AR', {
              timeZone: 'America/Argentina/Buenos_Aires',
            })}
          </dd>
        </div>
      </dl>

      <div className="mx-auto max-w-sm px-1">
        <Link
          href={restaurantHref}
          className="inline-block text-sm font-medium text-accent hover:underline"
        >
          Ver restaurante →
        </Link>
      </div>
    </li>
  );
}

export default function MeGastroDiscountsPage() {
  const repos = useRepositories();
  const { data, isLoading, error } = useQuery({
    queryKey: ['me', 'gastro-discounts'],
    queryFn: () => repos.mePortal.listGastroDiscounts(),
  });

  const discounts = data?.data ?? [];

  return (
    <PageContainer>
      <SectionTitle>Mis descuentos gastronómicos</SectionTitle>
      <p className="mb-6 text-sm text-text-muted">
        Descuentos que solicitaste o cortesías que recibiste por email.
      </p>

      {isLoading && <p className="text-text-muted">Cargando…</p>}
      {error && (
        <p className="text-sm text-red-400">No se pudieron cargar tus descuentos.</p>
      )}
      {!isLoading && !error && discounts.length === 0 && (
        <p className="rounded-lg border border-border bg-bg-muted px-4 py-8 text-center text-text-muted">
          Todavía no tenés descuentos gastronómicos.
        </p>
      )}

      <ul className="space-y-10">
        {discounts.map((item) => (
          <DiscountCard key={item.claimId} item={item} />
        ))}
      </ul>
    </PageContainer>
  );
}

'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle } from '@/components';
import { GastroDiscountVisualCoupon } from '@/components/gastro/GastroDiscountVisualCoupon';
import { ActivityCouponQrCard } from '@/components/activities/ActivityCouponQrCard';
import { formatGastroDiscountValidTo } from '@/lib/gastro/discount-status-ui';
import { activityCouponsKeys } from '@/lib/query/keys';
import type { ActivityCouponClaimView, MeGastroDiscountItem } from '@yo-te-invito/shared';

function DiscountCard({ item }: { item: MeGastroDiscountItem }) {
  const restaurantHref = item.locationSlug
    ? `/gastronomicos/${item.locationId}`
    : `/gastronomicos/${item.locationId}`;
  const validToLabel = formatGastroDiscountValidTo(item.validTo);

  return (
    <li className="space-y-4">
      <GastroDiscountVisualCoupon
        locationName={item.locationName}
        discountTitle={item.discountTitle ?? item.discountLabel ?? 'Descuento'}
        discountDescription={item.discountDescription}
        discountLabel={item.discountLabel}
        qrPayload={item.qrPayload}
        qrCode={item.qrCode}
        status={item.status}
        validTo={item.validTo}
        type={item.type}
        visualTemplate={item.visualTemplate}
        renderContext={{
          gastroName: item.locationName,
          discountTitle: item.discountTitle ?? item.discountLabel ?? 'Descuento',
          discountType: item.discountType ?? 'PERCENT',
          discountValue: item.discountValue ?? 0,
          validityMode: item.validityMode,
          validWeekday: item.validWeekday ?? null,
          validTo: item.validTo,
          shortCode: item.shortCode,
        }}
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
  const { data: activityData, isLoading: activityLoading, error: activityError } = useQuery({
    queryKey: activityCouponsKeys.me(),
    queryFn: () => repos.activityCoupons.listMine(),
  });

  const discounts = data?.data ?? [];
  const activityClaims = activityData?.data ?? [];

  return (
    <PageContainer>
      <SectionTitle>Mis descuentos</SectionTitle>
      <p className="mb-6 text-sm text-text-muted">
        Cupones gastronómicos y de Actividades que reclamaste.
      </p>

      <h2 className="mb-4 text-lg font-semibold text-text">Gastronomía</h2>
      {isLoading && <p className="text-text-muted">Cargando…</p>}
      {error && (
        <p className="text-sm text-red-400">No se pudieron cargar tus descuentos gastronómicos.</p>
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

      <h2 className="mb-4 mt-12 text-lg font-semibold text-text">Actividades</h2>
      {activityLoading && <p className="text-text-muted">Cargando…</p>}
      {activityError && (
        <p className="text-sm text-red-400">No se pudieron cargar tus cupones de Actividades.</p>
      )}
      {!activityLoading && !activityError && activityClaims.length === 0 && (
        <p className="rounded-lg border border-border bg-bg-muted px-4 py-8 text-center text-text-muted">
          Todavía no tenés cupones de Actividades.
        </p>
      )}
      <ul className="space-y-10">
        {activityClaims.map((item: ActivityCouponClaimView) => (
          <li key={item.claimId} className="space-y-4">
            <ActivityCouponQrCard
              activityName={item.eventTitle || item.operatorName || 'Actividad'}
              couponTitle={item.coupon.title}
              benefitLabel={item.coupon.benefitLabel}
              qrPayload={item.qrPayload}
              shortCodeDisplay={item.shortCodeDisplay}
              status={item.status}
              validTo={item.validTo}
            />
            {item.coupon.eventId ? (
              <div className="mx-auto max-w-sm px-1">
                <Link
                  href={`/excursiones/${item.coupon.eventId}`}
                  className="inline-block text-sm font-medium text-accent hover:underline"
                >
                  Ver actividad →
                </Link>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}

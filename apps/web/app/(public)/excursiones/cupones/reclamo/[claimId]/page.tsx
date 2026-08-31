'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PageContainer, SectionTitle } from '@/components';
import { useRepositories } from '@/repositories/context';
import { ActivityCouponQrCard } from '@/components/activities/ActivityCouponQrCard';

const TENANT_FALLBACK = 'tenant-demo';

export default function PublicActivityCouponClaimPage() {
  const params = useParams();
  const search = useSearchParams();
  const claimId = (params?.claimId as string) ?? '';
  const tenantId = search.get('tenantId') ?? TENANT_FALLBACK;
  const accessToken = search.get('token') ?? undefined;
  const repos = useRepositories();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['activity-coupon-claim', tenantId, claimId, accessToken],
    queryFn: () => repos.activityCoupons.getPublicClaim(tenantId, claimId, accessToken),
    enabled: !!claimId,
  });

  if (isLoading) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando cupón…</p>
      </PageContainer>
    );
  }

  if (isError || !data) {
    return (
      <PageContainer>
        <p className="text-text-muted">No encontramos este reclamo.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <SectionTitle>Tu cupón</SectionTitle>
      <div className="mt-6">
        <ActivityCouponQrCard
          activityName={data.eventTitle || data.operatorName || 'Actividad'}
          couponTitle={data.coupon.title}
          benefitLabel={data.coupon.benefitLabel}
          qrPayload={data.qrPayload}
          shortCodeDisplay={data.shortCodeDisplay}
          status={data.status}
          validTo={data.validTo}
        />
      </div>
      <Link href="/me/descuentos" className="mt-6 inline-block text-sm text-accent hover:underline">
        Ver en Mi cuenta →
      </Link>
    </PageContainer>
  );
}

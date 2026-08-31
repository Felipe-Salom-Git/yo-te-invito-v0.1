'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PageContainer, SectionTitle } from '@/components';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { activityCouponsKeys } from '@/lib/query/keys';
import { ActivityCouponClaimForm } from '@/components/activities/ActivityCouponClaimForm';
import { EXCURSION_PUBLIC_LABEL_SINGULAR } from '@/lib/categories/excursionPublicCopy';

const TENANT_FALLBACK = 'tenant-demo';

export default function PublicActivityCouponPage() {
  const params = useParams();
  const couponId = (params?.id as string) ?? '';
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_FALLBACK;
  const repos = useRepositories();

  const { data: coupon, isLoading, isError } = useQuery({
    queryKey: activityCouponsKeys.publicDetail(t, couponId),
    queryFn: () => repos.activityCoupons.getPublic(t, couponId),
    enabled: !!couponId,
  });

  if (isLoading) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando cupón…</p>
      </PageContainer>
    );
  }

  if (isError || !coupon) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cupón no encontrado.</p>
        <Link href="/categoria/excursion" className="mt-4 inline-block text-accent hover:underline">
          ← {EXCURSION_PUBLIC_LABEL_SINGULAR}
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link
        href={`/excursiones/${coupon.eventId}`}
        className="mb-4 inline-block text-sm text-text-muted hover:text-text"
      >
        ← {coupon.eventTitle ?? EXCURSION_PUBLIC_LABEL_SINGULAR}
      </Link>
      <SectionTitle>{coupon.title}</SectionTitle>
      <p className="mt-1 text-text-muted">
        {coupon.operatorName}
        {coupon.eventTitle ? ` · ${coupon.eventTitle}` : ''}
      </p>
      <p className="mt-4 text-lg font-medium text-accent">{coupon.benefitLabel}</p>
      {coupon.summary ? <p className="mt-3 text-text">{coupon.summary}</p> : null}
      {coupon.detail ? <p className="mt-2 text-sm text-text-muted">{coupon.detail}</p> : null}
      <div className="mt-8 max-w-md">
        <ActivityCouponClaimForm couponId={coupon.id} />
      </div>
    </PageContainer>
  );
}

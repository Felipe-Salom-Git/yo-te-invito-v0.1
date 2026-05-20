'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { ExcursionProductDetailContent } from '@/components/excursions/ExcursionProductDetailContent';

const DEFAULT_TENANT_ID = 'tenant-demo';

export default function ExcursionDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = (params?.id as string) ?? '';
  const tenantId = searchParams?.get('tenantId') ?? DEFAULT_TENANT_ID;

  return <ExcursionProductDetailContent id={id} tenantId={tenantId} />;
}

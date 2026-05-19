'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { RentalProductDetailContent } from '@/components/rentals/RentalProductDetailContent';

const DEFAULT_TENANT_ID = 'tenant-demo';

export default function RentalDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = (params?.id as string) ?? '';
  const tenantId = searchParams?.get('tenantId') ?? DEFAULT_TENANT_ID;

  return <RentalProductDetailContent id={id} tenantId={tenantId} />;
}

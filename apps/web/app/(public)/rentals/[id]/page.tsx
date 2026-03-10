'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { PlaceDetailView } from '@/components/places/PlaceDetailView';

const DEFAULT_TENANT_ID = 'tenant-demo';

export default function RentalDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = (params?.id as string) ?? '';
  const tenantId = searchParams?.get('tenantId') ?? DEFAULT_TENANT_ID;

  return <PlaceDetailView id={id} variant="rental" tenantId={tenantId} />;
}

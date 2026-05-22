'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { HotelLocationDetailView } from '@/components/hotel/HotelLocationDetailView';

const DEFAULT_TENANT_ID = 'tenant-demo';

/** Ficha pública informativa — datos desde HotelProfile (+ fallback evento hotel). */
export default function HotelDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = (params?.id as string) ?? '';
  const tenantId = searchParams?.get('tenantId') ?? DEFAULT_TENANT_ID;

  return <HotelLocationDetailView eventId={eventId} tenantId={tenantId} />;
}

'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { GastroLocationDetailView } from '@/components/gastro/GastroLocationDetailView';

const DEFAULT_TENANT_ID = 'tenant-demo';

/** Ficha pública de local gastronómico (resuelve por evento legacy del catálogo). */
export default function RestaurantDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = (params?.id as string) ?? '';
  const tenantId = searchParams?.get('tenantId') ?? DEFAULT_TENANT_ID;

  return <GastroLocationDetailView eventId={eventId} tenantId={tenantId} />;
}

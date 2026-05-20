'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { GastroLocationDetailView } from '@/components/gastro/GastroLocationDetailView';

const DEFAULT_TENANT_ID = 'tenant-demo';

export default function GastroLocationPublicPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = (params?.id as string) ?? '';
  const tenantId = searchParams?.get('tenantId') ?? DEFAULT_TENANT_ID;

  return <GastroLocationDetailView locationId={id} tenantId={tenantId} />;
}

'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { PageContainer } from '@/components';
import { PublicProducerPageContent } from '@/components/public/producers/PublicProducerPageContent';
import { producersKeys } from '@/lib/query/keys';

const DEFAULT_TENANT_ID = 'tenant-demo';

export default function PublicProducerProfilePage() {
  const params = useParams();
  const id = (params?.id as string) ?? '';
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId || DEFAULT_TENANT_ID;

  const { data: producer, isLoading, error } = useQuery({
    queryKey: producersKeys.detail(id),
    queryFn: () => repos.producers.get(id),
    enabled: !!id,
  });

  if (isLoading || !id) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando productora…</p>
      </PageContainer>
    );
  }

  if (error || !producer) {
    return (
      <PageContainer>
        <p className="text-red-400">Productora no encontrada</p>
        <Link href="/home" className="mt-4 block text-accent hover:underline">
          ← Volver
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PublicProducerPageContent producer={producer} tenantId={t} />
    </PageContainer>
  );
}

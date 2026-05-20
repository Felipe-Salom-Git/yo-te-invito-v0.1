'use client';

import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { producersKeys } from '@/lib/query/keys';
import { PageContainer, SectionTitle } from '@/components';
import { ProducerProfileEmptyState } from './ProducerProfileEmptyState';
import { ProducerProfileHeader } from './ProducerProfileHeader';
import { ProducerProfileBlockGrid } from './ProducerProfileBlockGrid';

export function ProducerProfilePage() {
  const repos = useRepositories();
  const { data: profile, isLoading } = useQuery({
    queryKey: producersKeys.myProfile(),
    queryFn: () => repos.producers.getMyProfile(),
  });

  if (isLoading) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando perfil...</p>
      </PageContainer>
    );
  }

  if (!profile) {
    return (
      <PageContainer>
        <SectionTitle>Perfil de productora</SectionTitle>
        <p className="mt-2 max-w-2xl text-sm text-text-muted">
          Gestioná cómo se ve tu productora en la plataforma.
        </p>
        <div className="mt-10">
          <ProducerProfileEmptyState />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <SectionTitle>Perfil de productora</SectionTitle>
      <p className="mt-2 max-w-2xl text-sm text-text-muted">
        Gestioná cómo se ve tu productora en la plataforma.
      </p>
      <div className="mt-8 space-y-8">
        <ProducerProfileHeader profile={profile} />
        <ProducerProfileBlockGrid profile={profile} />
      </div>
    </PageContainer>
  );
}

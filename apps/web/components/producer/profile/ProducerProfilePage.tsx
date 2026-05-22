'use client';

import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { producersKeys } from '@/lib/query/keys';
import { PageContainer, SectionTitle, PageLoader, QueryError } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { ProducerProfileEmptyState } from './ProducerProfileEmptyState';
import { ProducerProfileHeader } from './ProducerProfileHeader';
import { ProducerProfileBlockGrid } from './ProducerProfileBlockGrid';
import { ProducerProfileCompletenessPanel } from './ProducerProfileCompletenessPanel';
import { ProducerProfileHelp } from './ProducerProfileHelp';
import { ProducerProfilePublicPreview } from './ProducerProfilePublicPreview';

export function ProducerProfilePage() {
  const repos = useRepositories();
  const { data: profile, isLoading, isError, error, refetch } = useQuery({
    queryKey: producersKeys.myProfile(),
    queryFn: () => repos.producers.getMyProfile(),
  });

  if (isLoading) {
    return (
      <PageContainer>
        <PageLoader message="Cargando perfil de productora…" />
      </PageContainer>
    );
  }

  if (isError) {
    return (
      <PageContainer>
        <SectionTitle>Perfil de productora</SectionTitle>
        <QueryError
          className="mt-6"
          message={getErrorMessage(error)}
          onRetry={() => void refetch()}
        />
      </PageContainer>
    );
  }

  if (!profile) {
    return (
      <PageContainer>
        <SectionTitle>Perfil de productora</SectionTitle>
        <p className="mt-2 max-w-2xl text-sm text-text-muted">
          Gestioná cómo se ve tu productora en la plataforma. Completá por bloques y revisá la vista
          pública cuando termines.
        </p>
        <div className="mt-10">
          <ProducerProfileEmptyState />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="max-w-6xl">
      <SectionTitle>Perfil de productora</SectionTitle>
      <p className="mt-2 max-w-2xl text-sm text-text-muted">
        Hub de tu ficha pública: completá identidad, imágenes y contacto. El progreso se calcula acá
        y no se guarda en el servidor.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_min(20rem,100%)] lg:items-start">
        <div className="min-w-0 space-y-8">
          <ProducerProfileHeader profile={profile} />
          <ProducerProfileCompletenessPanel profile={profile} />
          <div className="lg:hidden">
            <ProducerProfilePublicPreview profile={profile} />
          </div>
          <ProducerProfileBlockGrid profile={profile} />
          <ProducerProfileHelp />
        </div>
        <aside className="hidden min-w-0 lg:sticky lg:top-6 lg:block">
          <ProducerProfilePublicPreview profile={profile} />
        </aside>
      </div>
    </PageContainer>
  );
}

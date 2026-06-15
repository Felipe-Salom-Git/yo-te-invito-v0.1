'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { cityDisplayLabel } from '@yo-te-invito/shared';
import { PageContainer, SectionTitle } from '@/components';
import { ContentRail } from '@/components/home/ContentRail';
import type { ContentCardItem } from '@/components/home/ContentCard';
import { RentalLocalCard } from '@/components/rentals/RentalLocalCard';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';

export default function ExcursionOperatorPublicPage() {
  const params = useParams();
  const id = (params?.id as string) ?? '';
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId || 'tenant-demo';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public', 'excursion-operators', t, id],
    queryFn: () => repos.excursionOperators.getPublic(t, id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando operador…</p>
      </PageContainer>
    );
  }

  if (isError || !data) {
    return (
      <PageContainer>
        <p className="text-text-muted">Operador no encontrado o no disponible.</p>
        <Link href="/categoria/excursion" className="mt-4 inline-block text-accent hover:underline">
          Ver excursiones
        </Link>
      </PageContainer>
    );
  }

  const { operator, excursions } = data;
  const cards = excursions as ContentCardItem[];

  return (
    <PageContainer className="pb-16">
      <Link
        href="/categoria/excursion"
        className="mb-4 inline-block text-sm text-text-muted hover:text-text"
      >
        ← Excursiones
      </Link>
      <SectionTitle>{operator.name}</SectionTitle>
      {operator.city && (
        <p className="mt-1 text-sm text-text-muted">{cityDisplayLabel(operator.city)}</p>
      )}

      <div className="mt-8 space-y-6">
        <RentalLocalCard
          name={operator.name}
          address={operator.address}
          openingHours={operator.openingHours}
          openingHoursNote={operator.openingHoursNote}
          hasLocation={!!(operator.geoLat && operator.geoLng)}
        />
        {operator.contactPhone && (
          <p className="text-sm text-text-muted">Contacto: {operator.contactPhone}</p>
        )}
        {operator.websiteUrl && (
          <a
            href={operator.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent hover:underline"
          >
            Sitio web
          </a>
        )}
        {cards.length > 0 ? (
          <ContentRail title="Excursiones disponibles" items={cards} />
        ) : (
          <p className="text-sm text-text-muted">Este operador aún no tiene excursiones publicadas.</p>
        )}
      </div>
    </PageContainer>
  );
}

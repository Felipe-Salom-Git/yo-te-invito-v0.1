'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { cityDisplayLabel } from '@yo-te-invito/shared';
import { PageContainer, SectionTitle } from '@/components';
import { ContentRail } from '@/components/home/ContentRail';
import type { ContentCardItem } from '@/components/home/ContentCard';
import { RentalLocalCard } from '@/components/rentals/RentalLocalCard';
import { RentalContactCard } from '@/components/rentals/RentalContactCard';
import { buildRentalWhatsAppHref } from '@/lib/rentals/whatsapp';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';

export default function RentalLocalePublicPage() {
  const params = useParams();
  const id = (params?.id as string) ?? '';
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId || 'tenant-demo';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public', 'rental-locations', t, id],
    queryFn: () => repos.rentalLocations.getPublic(t, id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando local…</p>
      </PageContainer>
    );
  }

  if (isError || !data) {
    return (
      <PageContainer>
        <p className="text-text-muted">Local no encontrado o no disponible.</p>
        <Link href="/categoria/rental" className="mt-4 inline-block text-accent hover:underline">
          Ver alquileres
        </Link>
      </PageContainer>
    );
  }

  const { location, products } = data;
  const cards = products as ContentCardItem[];
  const whatsAppHref = buildRentalWhatsAppHref(location.whatsappPhone, location.name);

  return (
    <PageContainer className="pb-16">
      <Link href="/categoria/rental" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Alquileres
      </Link>
      <SectionTitle>{location.name}</SectionTitle>
      {location.city && (
        <p className="mt-1 text-sm text-text-muted">{cityDisplayLabel(location.city)}</p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <RentalLocalCard
            name={location.name}
            address={location.address}
            openingHours={location.openingHours}
            openingHoursNote={location.openingHoursNote}
            hasLocation={!!(location.geoLat && location.geoLng)}
          />
          {cards.length > 0 ? (
            <ContentRail title="Productos disponibles" items={cards} />
          ) : (
            <p className="text-sm text-text-muted">Este local aún no tiene productos publicados.</p>
          )}
        </div>
        <aside>
          <RentalContactCard whatsAppHref={whatsAppHref} />
        </aside>
      </div>
    </PageContainer>
  );
}

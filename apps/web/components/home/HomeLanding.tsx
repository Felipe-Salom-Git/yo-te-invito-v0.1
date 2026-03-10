'use client';

import { useMemo } from 'react';
import { ContentRail } from '@/components/home/ContentRail';
import { HomeHero } from '@/components/home/HomeHero';
import { useTenant } from '@/hooks/useTenant';
import { useEventsList } from '@/lib/query/events';
import { useHomeCarousels } from '@/lib/query/home';

const TENANT_ID = 'tenant-demo';

export function HomeLanding() {
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_ID;

  const { data: eventsData, isLoading: eventsLoading } = useEventsList(t, 1, 8);
  const highlights = eventsData?.data ?? [];

  const {
    trending,
    nearYou,
    newEvents,
    gastro,
    excursion,
    rental,
    isLoading,
  } = useHomeCarousels();

  const featuredForHero = useMemo(() => {
    const seen = new Set<string>();
    const out: typeof trending = [];
    for (const item of [...trending, ...highlights]) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        out.push(item);
      }
    }
    return out;
  }, [trending, highlights]);

  return (
    <div className="min-h-screen bg-black">
      <HomeHero
        featuredItems={featuredForHero}
        isLoading={eventsLoading || isLoading}
      />

      {/* Content rails — Netflix-inspired shelves */}
      <div className="w-full overflow-visible px-0 py-8 md:py-12">
        <ContentRail
          title="Destacados"
          subtitle="Los más populares esta semana"
          items={highlights}
          isLoading={eventsLoading}
        />
        <ContentRail
          title="Trending"
          subtitle="Lo que está sonando"
          items={trending}
          isLoading={isLoading}
        />
        <ContentRail
          title="Cerca de ti"
          subtitle="En Buenos Aires"
          items={nearYou}
          isLoading={isLoading}
        />
        <ContentRail
          title="Nuevos"
          subtitle="Recién agregados"
          items={newEvents}
          isLoading={isLoading}
        />
        <ContentRail
          title="Gastronomía"
          subtitle="Restaurantes y experiencias"
          items={gastro}
          isLoading={isLoading}
        />
        <ContentRail
          title="Excursiones"
          subtitle="Salidas y tours"
          items={excursion}
          isLoading={isLoading}
        />
        <ContentRail
          title="Alquileres"
          subtitle="Espacios y propiedades"
          items={rental}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}


'use client';

import Link from 'next/link';
import { ContentRail } from '@/components/home/ContentRail';
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

  const hero = trending[0] ?? highlights[0] ?? null;

  return (
    <div className="min-h-screen bg-black">
      {/* Hero — banner with fade to content */}
      <section className="relative h-[70vh] min-h-[480px] overflow-hidden bg-black">
        {hero && (
          <div className="absolute inset-0">
            {hero.coverImageUrl ? (
              <img
                src={hero.coverImageUrl}
                alt={hero.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-900/50 via-black to-black">
                <span className="text-6xl opacity-70" aria-hidden>🎟️</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
          </div>
        )}

        <div className="relative flex h-full items-end pb-24 px-6 md:px-10 lg:px-16">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold text-white md:text-4xl lg:text-5xl">
              Descubrí eventos cerca tuyo
            </h1>
            <p className="mt-4 max-w-xl text-lg text-white/80">
              Gastronomía, excursiones, alquileres y más en un solo lugar.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/explore"
                className="rounded-lg bg-accent px-6 py-3 font-medium text-bg shadow-lg shadow-accent/20 transition-all hover:bg-accent-hover hover:shadow-accent/30"
              >
                Explorar
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-white/30 bg-white/10 px-6 py-3 font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-bg to-transparent" />
      </section>

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


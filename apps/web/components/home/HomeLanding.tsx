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
      {/* Hero — large editorial background, dark overlay, clear CTAs */}
      <section className="relative h-[72vh] min-h-[520px] overflow-hidden bg-black md:min-h-[560px]">
        {hero && (
          <div className="absolute inset-0">
            {hero.coverImageUrl ? (
              <img
                src={hero.coverImageUrl}
                alt=""
                className="h-full w-full object-cover object-center"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-900/40 via-black to-black">
                <span className="text-6xl opacity-60" aria-hidden>🎟️</span>
              </div>
            )}
            {/* Dark overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />
          </div>
        )}

        <div className="relative flex h-full items-end px-4 pb-20 sm:px-6 md:px-10 md:pb-24 lg:px-16">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] sm:text-4xl md:text-5xl lg:text-6xl">
              Descubrí eventos cerca tuyo
            </h1>
            <p className="mt-4 max-w-lg text-base text-white/90 sm:text-lg md:text-xl">
              Gastronomía, excursiones, alquileres y más en un solo lugar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 sm:gap-4">
              <Link
                href="/explore"
                className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-bg shadow-lg shadow-accent/25 transition-all hover:bg-accent-hover hover:shadow-accent/40 sm:px-6 sm:py-3"
              >
                Explorar
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-white/40 bg-white/5 px-5 py-2.5 font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/15 sm:px-6 sm:py-3"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-bg to-transparent" />
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


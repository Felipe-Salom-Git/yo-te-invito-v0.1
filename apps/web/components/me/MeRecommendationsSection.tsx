'use client';

import Link from 'next/link';
import { PageLoader } from '@/components';
import { EventCard } from '@/components/home/EventCard';
import { useMeRecommendations } from '@/lib/query/me-portal';
import type { EventSummary } from '@yo-te-invito/shared';

function toEventCard(ev: EventSummary) {
  return { ...ev, category: ev.category ?? undefined };
}

type Props = {
  limit?: number;
  showViewAll?: boolean;
};

export function MeRecommendationsSection({ limit = 12, showViewAll = false }: Props) {
  const { data, isLoading } = useMeRecommendations(limit);

  if (isLoading) {
    return <PageLoader message="Cargando recomendaciones…" />;
  }

  const fromFollowed = data?.fromFollowedProducers ?? [];
  const forYou = data?.forYou ?? [];
  const items = [...fromFollowed, ...forYou].slice(0, limit);

  return (
    <section className="mt-8" aria-labelledby="me-recommendations-heading">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 id="me-recommendations-heading" className="text-lg font-semibold text-text">
            Recomendados para vos
          </h3>
          <p className="mt-1 text-sm text-text-muted">
            Eventos de productoras que seguís y sugerencias según tus intereses.
          </p>
        </div>
        {showViewAll && items.length > 0 && (
          <Link href="/me/preferences?tab=interests" className="text-sm text-accent hover:underline">
            Ajustar intereses →
          </Link>
        )}
      </div>

      {items.length > 0 ? (
        <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
          {items.map((ev) => (
            <EventCard key={ev.id} event={toEventCard(ev)} />
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-text-muted">
          Configurá categorías en{' '}
          <Link href="/me/preferences?tab=interests" className="text-accent hover:underline">
            preferencias
          </Link>{' '}
          o seguí productoras para ver sugerencias acá.
        </p>
      )}
    </section>
  );
}

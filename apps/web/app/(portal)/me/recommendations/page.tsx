'use client';

import Link from 'next/link';
import { PageContainer, SectionTitle, PageLoader } from '@/components';
import { EventCard } from '@/components/home/EventCard';
import { useMeRecommendations } from '@/lib/query/me-portal';

export default function MeRecommendationsPage() {
  const { data, isLoading } = useMeRecommendations(16);

  if (isLoading) {
    return (
      <PageContainer>
        <PageLoader message="Cargando recomendaciones…" />
      </PageContainer>
    );
  }

  const fromFollowed = data?.fromFollowedProducers ?? [];
  const forYou = data?.forYou ?? [];

  return (
    <PageContainer>
      <SectionTitle>Recomendados para vos</SectionTitle>
      <p className="mt-1 text-sm text-text-muted">
        Eventos de productoras que seguís y sugerencias según tus categorías favoritas.
      </p>
      <Link href="/me/following" className="mt-2 inline-block text-sm text-accent hover:underline">
        Gestionar productoras seguidas →
      </Link>

      {fromFollowed.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-text">De productoras que seguís</h2>
          <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
            {fromFollowed.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        </section>
      )}

      {forYou.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-text">
            {fromFollowed.length > 0 ? 'También te puede interesar' : 'Para vos'}
          </h2>
          <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
            {forYou.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        </section>
      )}

      {fromFollowed.length === 0 && forYou.length === 0 && (
        <p className="mt-8 text-text-muted">
          Configurá categorías en{' '}
          <Link href="/me/preferences" className="text-accent hover:underline">
            preferencias
          </Link>{' '}
          o seguí productoras para ver eventos aquí.
        </p>
      )}
    </PageContainer>
  );
}

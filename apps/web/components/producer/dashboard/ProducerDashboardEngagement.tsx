'use client';

import type { ProducerDashboardMetrics } from '@/repositories/interfaces';
import { ProducerKpiCard } from './ProducerKpiCard';

type Props = {
  engagement: ProducerDashboardMetrics['engagement'];
  isLoading?: boolean;
};

export function ProducerDashboardEngagement({ engagement, isLoading }: Props) {
  const e = engagement;

  return (
    <section className="mt-8" aria-labelledby="producer-engagement-heading">
      <h2 id="producer-engagement-heading" className="text-lg font-semibold text-text">
        Interacción
      </h2>
      <p className="mt-1 text-sm text-text-muted">
        Vistas públicas, favoritos y seguidores desde datos reales de la plataforma.
      </p>
      <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ProducerKpiCard
          label="Vistas de eventos"
          value={isLoading ? '—' : e.totalEventViews}
          unavailable={isLoading}
        />
        <ProducerKpiCard
          label="Favoritos en eventos"
          value={isLoading ? '—' : e.totalEventFavorites}
          unavailable={isLoading}
        />
        <ProducerKpiCard
          label="Lo esperan"
          value={isLoading ? '—' : e.totalEventExpected}
          unavailable={isLoading}
        />
        <ProducerKpiCard
          label="Vistas del perfil"
          value={isLoading ? '—' : e.profileViews}
          unavailable={isLoading}
        />
        <ProducerKpiCard
          label="Seguidores"
          value={isLoading ? '—' : e.producerFollowers}
          unavailable={isLoading}
          hint="Usuarios que siguen tu productora"
        />
      </div>
    </section>
  );
}

'use client';

import Link from 'next/link';
import {
  PageContainer,
  SectionTitle,
  Card,
  CardContent,
  PageLoader,
  QueryError,
  EmptyState,
} from '@/components';
import { MeDashboardAlerts } from '@/components/me/MeDashboardAlerts';
import { MeDashboardPushCta } from '@/components/me/MeDashboardPushCta';
import { MeDashboardQuickLinks } from '@/components/me/MeDashboardQuickLinks';
import { MeRecommendationsSection } from '@/components/me/MeRecommendationsSection';
import { useMeDashboard } from '@/lib/query/me-portal';
import { getErrorMessage } from '@/lib/errors';

export default function MeDashboardPage() {
  const { data, isLoading, isError, error, refetch } = useMeDashboard();

  if (isLoading) {
    return (
      <PageContainer>
        <PageLoader message="Cargando tu panel…" />
      </PageContainer>
    );
  }

  if (isError) {
    return (
      <PageContainer>
        <SectionTitle>Inicio</SectionTitle>
        <QueryError
          className="mt-6"
          message={getErrorMessage(error)}
          onRetry={() => void refetch()}
        />
      </PageContainer>
    );
  }

  const stats = data?.stats;
  const next = data?.nextExperience;
  const hasContent =
    (stats?.activeTicketsCount ?? 0) > 0 ||
    data?.cartSummary.hasItems ||
    (data?.pendingReviews.length ?? 0) > 0 ||
    (data?.recentFavorites.length ?? 0) > 0 ||
    (data?.recommendedEvents?.length ?? 0) > 0;

  return (
    <PageContainer>
      <SectionTitle>Inicio</SectionTitle>
      <p className="mt-1 text-sm text-text-muted">
        Alertas, recomendaciones y accesos rápidos a tu actividad.
      </p>

      <MeDashboardAlerts dashboard={data} />
      <MeDashboardPushCta />
      <MeRecommendationsSection />
      <MeDashboardQuickLinks />

      {next && (
        <Card className="mt-8">
          <CardContent>
            <h3 className="font-medium text-text">Próxima experiencia</h3>
            <p className="mt-1 text-text">{next.title}</p>
            <p className="text-sm text-text-muted">
              {new Date(next.startAt).toLocaleString('es-AR')}
              {next.venueName ? ` · ${next.venueName}` : ''}
            </p>
            {next.ticketId && (
              <Link
                href={`/me/tickets/${next.ticketId}`}
                className="mt-3 inline-block text-sm text-accent hover:underline"
              >
                Ver ticket
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {data && data.recentFavorites.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-text">Favoritos recientes</h3>
            <Link
              href="/me/preferences?tab=favorites"
              className="text-sm text-accent hover:underline"
            >
              Ver todos
            </Link>
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {data.recentFavorites.map((f) => (
              <li key={f.id}>
                <Link
                  href={f.href ?? '#'}
                  className="rounded border border-border px-3 py-1.5 text-sm hover:bg-bg-muted"
                >
                  {f.title ?? f.entityId}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!hasContent && (
        <div className="mt-8">
          <EmptyState
            title="Tu espacio está listo"
            description="Explorá eventos, guardá favoritos o sumá entradas a Mi Carro para ver actividad acá."
            actionLabel="Explorar eventos"
            actionHref="/explore"
          />
        </div>
      )}
    </PageContainer>
  );
}

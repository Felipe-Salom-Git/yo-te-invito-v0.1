'use client';

import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  PageContainer,
  SectionTitle,
  Button,
  PageLoader,
  QueryError,
  EmptyState,
} from '@/components';
import { ProductoraEventCard } from '@/components/producer/ProductoraEventCard';
import { ProducerPublicPageLink } from '@/components/producer/profile/ProducerPublicPageLink';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { useProducerId } from '@/hooks/useProducerId';
import { producersKeys } from '@/lib/query/keys';
import { useProducerDashboardMetrics } from '@/lib/query/producer-dashboard';
import { isEventPast, isEventActive, isEventFuture } from '@/lib/eventCycleHelpers';
import { getErrorMessage } from '@/lib/errors';
import { ProducerKpiCard } from './ProducerKpiCard';
import {
  ProducerDashboardNextSteps,
  type ProducerNextStep,
} from './ProducerDashboardNextSteps';
import { ProducerDashboardEngagement } from './ProducerDashboardEngagement';
import { ProducerDashboardTopEvents } from './ProducerDashboardTopEvents';
import { ProducerDashboardEventStatusAlerts } from './ProducerDashboardEventStatusAlerts';

function displayNameFromSession(user: {
  name?: string | null;
  email?: string | null;
}): string | null {
  const name = user.name?.trim();
  if (name) return name.split(/\s+/)[0] ?? name;
  const email = user.email?.trim();
  if (email) return email.split('@')[0] ?? null;
  return null;
}

export function ProducerDashboardClient() {
  const { data: session, status } = useSession();
  const { tenantId: TENANT_ID } = useTenant();
  const PRODUCER_ID = useProducerId();
  const repos = useRepositories();

  const dashboardQuery = useProducerDashboardMetrics(status === 'authenticated');
  const metrics = dashboardQuery.data;

  const eventsQuery = useQuery({
    queryKey: ['events', 'producer', PRODUCER_ID, TENANT_ID],
    queryFn: () =>
      repos.events.list({ tenantId: TENANT_ID, producerId: PRODUCER_ID, limit: 50 }),
    enabled: status === 'authenticated',
  });

  const profileQuery = useQuery({
    queryKey: producersKeys.myProfile(),
    queryFn: () => repos.producers.getMyProfile(),
    enabled: status === 'authenticated',
  });

  const referrersQuery = useQuery({
    queryKey: ['producer', 'referrers', 'associated'],
    queryFn: () => repos.referrals.getAssociatedReferrers(),
    enabled: status === 'authenticated',
  });

  const producerEvents = eventsQuery.data?.data ?? [];
  const upcomingEvents = producerEvents
    .filter((e) => isEventFuture(e.startAt))
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const pastEvents = producerEvents.filter((e) =>
    isEventPast(e.startAt, (e as { endAt?: string | null }).endAt),
  );

  const engagementByEventId = useMemo(() => {
    const map = new Map<
      string,
      { viewCount: number; favoriteCount: number; expectedCount: number }
    >();
    for (const row of metrics?.eventEngagement ?? []) {
      map.set(row.id, {
        viewCount: row.viewCount,
        favoriteCount: row.favoriteCount,
        expectedCount: row.expectedCount,
      });
    }
    return map;
  }, [metrics?.eventEngagement]);

  const pendingReferrers =
    referrersQuery.data?.filter((r) => r.status === 'PENDING').length ?? 0;

  const nextSteps = useMemo((): ProducerNextStep[] => {
    const steps: ProducerNextStep[] = [];
    const profile = profileQuery.data;
    const reviewTotal = metrics?.reviews?.totalReviews ?? 0;

    if (!profile) {
      steps.push({
        title: 'Completá tu perfil público',
        description:
          'Las personas que descubren tus eventos pueden conocer tu productora en una página propia.',
        href: '/producer/profile/create',
        cta: 'Crear perfil',
      });
    }

    if ((metrics?.events.total ?? producerEvents.length) === 0) {
      steps.push({
        title: 'Publicá tu primer evento',
        description: 'Configurá entradas, referidos y el diseño de tickets cuando lo necesites.',
        href: '/producer/events/new',
        cta: 'Crear evento',
      });
    } else if (upcomingEvents.length > 0) {
      const next = upcomingEvents[0];
      steps.push({
        title: `Próximo: ${next.title}`,
        description: new Date(next.startAt).toLocaleString('es-AR', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
        href: `/producer/events/${next.id}`,
        cta: 'Gestionar evento',
      });
    }

    if (reviewTotal === 0 && (metrics?.events.total ?? 0) > 0) {
      steps.push({
        title: 'Valoraciones de tus eventos',
        description:
          'Cuando tus eventos reciban comentarios, los vas a ver y podés responder desde Comentarios.',
        href: '/producer/comments',
        cta: 'Ir a comentarios',
      });
    }

    if (pendingReferrers > 0) {
      steps.push({
        title: 'Solicitudes de referidos pendientes',
        description: `Tenés ${pendingReferrers} solicitud${pendingReferrers === 1 ? '' : 'es'} para revisar.`,
        href: '/producer/referrals',
        cta: 'Ver referidos',
      });
    }

    return steps.slice(0, 3);
  }, [
    profileQuery.data,
    metrics?.events.total,
    metrics?.reviews?.totalReviews,
    producerEvents.length,
    upcomingEvents,
    pendingReferrers,
  ]);

  if (status === 'loading') {
    return (
      <PageContainer>
        <PageLoader message="Cargando panel de productora…" />
      </PageContainer>
    );
  }

  if (!session?.user) {
    return (
      <PageContainer>
        <p className="text-text-muted">Debés iniciar sesión para acceder al portal.</p>
        <Link href="/login" className="mt-4 inline-block text-accent hover:underline">
          Iniciar sesión
        </Link>
      </PageContainer>
    );
  }

  const firstName = displayNameFromSession(session.user);
  const hasReviews = (metrics?.reviews?.totalReviews ?? 0) > 0;
  const sales = metrics?.sales;
  const revenueNum =
    sales?.revenue != null ? parseFloat(sales.revenue) : 0;

  return (
    <PageContainer>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <SectionTitle>Panel de productora</SectionTitle>
          <p className="mt-1 max-w-2xl text-sm text-text-muted">
            {firstName ? (
              <>
                Hola, <span className="text-text">{firstName}</span> — gestioná eventos, perfil,
                comentarios y referidos desde un solo lugar.
              </>
            ) : (
              'Gestioná eventos, perfil público, comentarios y referidos desde un solo lugar.'
            )}
          </p>
        </div>
        <Link href="/producer/events/new" className="shrink-0">
          <Button>Crear evento</Button>
        </Link>
      </header>

      {profileQuery.data ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            Perfil público activo
          </span>
          <ProducerPublicPageLink producer={profileQuery.data} label="Ver página pública" />
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-border/80 bg-bg-muted/40 px-4 py-3 text-sm text-text-muted">
          Todavía no configuraste el perfil público de tu productora.{' '}
          <Link href="/producer/profile" className="text-accent hover:underline">
            Completar perfil →
          </Link>
        </p>
      )}

      {dashboardQuery.isError ? (
        <QueryError
          className="mt-6"
          message={getErrorMessage(dashboardQuery.error)}
          onRetry={() => void dashboardQuery.refetch()}
        />
      ) : dashboardQuery.isLoading ? (
        <div className="mt-8">
          <PageLoader message="Cargando métricas…" />
        </div>
      ) : metrics ? (
        <>
          <section className="mt-8" aria-labelledby="producer-kpis-heading">
            <h2 id="producer-kpis-heading" className="sr-only">
              Resumen de actividad
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ProducerKpiCard label="Eventos activos" value={metrics.events.active} />
              <ProducerKpiCard label="Próximos eventos" value={metrics.events.upcoming} />
              <ProducerKpiCard
                label="Tickets vendidos"
                value={sales?.ticketsSold ?? 0}
                hint={metrics.events.total === 0 ? 'Sin eventos aún' : undefined}
              />
              <ProducerKpiCard
                label="Reputación"
                value={
                  hasReviews
                    ? `${metrics.reviews?.averageRating?.toFixed(1) ?? '—'} /10`
                    : '—'
                }
                unavailable={!hasReviews}
                hint={
                  hasReviews
                    ? `${metrics.reviews?.totalReviews} valoración${metrics.reviews?.totalReviews === 1 ? '' : 'es'}`
                    : 'Sin valoraciones aún'
                }
              />
            </div>
            {revenueNum > 0 ? (
              <p className="mt-3 text-xs text-text-muted">
                Recaudación acumulada en tus eventos:{' '}
                <span className="font-medium text-text">
                  ${revenueNum.toLocaleString('es-AR')}
                </span>
              </p>
            ) : null}
          </section>

          <ProducerDashboardEngagement engagement={metrics.engagement} />

          <ProducerDashboardEventStatusAlerts enabled={status === 'authenticated'} />

          <ProducerDashboardTopEvents topEvents={metrics.topEvents} />

          <section className="mt-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-text">
                {upcomingEvents.length > 0 ? 'Próximos eventos' : 'Eventos recientes'}
              </h2>
              <Link
                href="/producer/events"
                className="text-sm text-accent hover:underline"
              >
                Ver todos ({metrics.events.total})
              </Link>
            </div>

            {eventsQuery.isLoading ? (
              <p className="mt-4 text-sm text-text-muted">Cargando eventos…</p>
            ) : producerEvents.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="Todavía no creaste eventos"
                  description="Publicá tu primer evento para vender entradas y gestionar referidos."
                  actionLabel="Crear evento"
                  actionHref="/producer/events/new"
                />
              </div>
            ) : (
              <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(upcomingEvents.length > 0 ? upcomingEvents : [...producerEvents].reverse())
                  .slice(0, 6)
                  .map((ev) => {
                    const eng = engagementByEventId.get(ev.id);
                    return (
                      <ProductoraEventCard
                        key={ev.id}
                        event={ev}
                        viewCount={eng?.viewCount}
                        favoriteCount={eng?.favoriteCount}
                        expectedCount={eng?.expectedCount}
                      />
                    );
                  })}
              </div>
            )}

            {pastEvents.length > 0 && upcomingEvents.length > 0 ? (
              <p className="mt-3 text-xs text-text-muted">
                {pastEvents.length} evento{pastEvents.length === 1 ? '' : 's'} finalizado
                {pastEvents.length === 1 ? '' : 's'} en tu historial.
              </p>
            ) : null}
          </section>

          <ProducerDashboardNextSteps steps={nextSteps} />
        </>
      ) : null}

      {eventsQuery.isError ? (
        <QueryError
          className="mt-6"
          message={getErrorMessage(eventsQuery.error)}
          onRetry={() => void eventsQuery.refetch()}
        />
      ) : null}
    </PageContainer>
  );
}

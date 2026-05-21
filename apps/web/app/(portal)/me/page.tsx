'use client';

import Link from 'next/link';
import { PageContainer, SectionTitle, Card, CardContent, PageLoader } from '@/components';
import { EventCard } from '@/components/home/EventCard';
import { useMeDashboard } from '@/lib/query/me-portal';

export default function MeDashboardPage() {
  const { data, isLoading } = useMeDashboard();

  if (isLoading) {
    return (
      <PageContainer>
        <PageLoader message="Cargando tu panel…" />
      </PageContainer>
    );
  }

  const stats = data?.stats;
  const next = data?.nextExperience;

  return (
    <PageContainer>
      <SectionTitle>Mi espacio</SectionTitle>
      <p className="mt-1 text-sm text-text-muted">
        Tickets, carrito, favoritos y actividad en un solo lugar.
      </p>

      {stats && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Tickets activos" value={stats.activeTicketsCount} href="/me/tickets" />
          <StatCard label="Próximas experiencias" value={stats.upcomingExperiencesCount} href="/me/tickets" />
          <StatCard label="Reseñas pendientes" value={stats.pendingReviewsCount} href="/me/activity?tab=reviews" />
          <StatCard label="Favoritos" value={stats.favoritesCount} href="/me/preferences?tab=favorites" />
          <StatCard
            label="Productoras"
            value={stats.followedProducersCount ?? 0}
            href="/me/following"
          />
          <StatCard label="Eventos asistidos" value={stats.attendedEventsCount} href="/me/activity?tab=attended" />
          {data.cartSummary.hasItems && (
            <StatCard
              label="Carrito"
              value={`${data.cartSummary.itemCount} ítems`}
              href="/me/cart"
            />
          )}
        </div>
      )}

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
              <Link href={`/me/tickets/${next.ticketId}`} className="mt-3 inline-block text-sm text-accent hover:underline">
                Ver ticket
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {data && data.pendingReviews.length > 0 && (
        <section className="mt-8">
          <h3 className="text-lg font-semibold text-text">Valorá tu experiencia</h3>
          <ul className="mt-3 space-y-2">
            {data.pendingReviews.slice(0, 5).map((r) => (
              <li key={r.eventId}>
                <Link
                  href={`/events/${r.eventId}`}
                  className="text-sm text-accent hover:underline"
                >
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data && (data.recommendedEvents?.length ?? 0) > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-text">Recomendados</h3>
            <Link href="/me/recommendations" className="text-sm text-accent hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
            {data.recommendedEvents!.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        </section>
      )}

      {data && data.recentFavorites.length > 0 && (
        <section className="mt-8">
          <h3 className="text-lg font-semibold text-text">Favoritos recientes</h3>
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
    </PageContainer>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number | string;
  href: string;
}) {
  return (
    <Link href={href} className="rounded-lg border border-border bg-bg-muted p-4 hover:border-accent/50 transition-colors">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-text">{value}</p>
    </Link>
  );
}

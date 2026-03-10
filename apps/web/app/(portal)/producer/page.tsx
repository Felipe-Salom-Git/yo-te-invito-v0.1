'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { useProducerId } from '@/hooks/useProducerId';
import { useQuery } from '@tanstack/react-query';
import { PageContainer, SectionTitle, Card, CardContent } from '@/components';
import { ProductoraEventCard } from '@/components/producer/ProductoraEventCard';
import { isEventPast, isEventActive, isEventFuture } from '@/lib/eventCycleHelpers';

export default function ProducerDashboardPage() {
  const { data: session, status } = useSession();
  const { tenantId: TENANT_ID } = useTenant();
  const PRODUCER_ID = useProducerId();
  const repos = useRepositories();
  const userId = (session?.user as { userId?: string })?.userId ?? (session?.user as { id?: string })?.id ?? '';

  const { data: platformMetrics } = useQuery({
    queryKey: ['metrics', 'platform'],
    queryFn: () => repos.metrics.getPlatformMetrics(userId),
    enabled: !!userId && status === 'authenticated',
  });

  const { data: eventsData } = useQuery({
    queryKey: ['events', 'producer', PRODUCER_ID, TENANT_ID],
    queryFn: () => repos.events.list({ tenantId: TENANT_ID, producerId: PRODUCER_ID, limit: 50 }),
    enabled: status === 'authenticated',
  });

  const producerEvents = eventsData?.data ?? [];
  const eventIds = producerEvents.map((e) => e.id);
  const activeEvents = producerEvents.filter((e) =>
    isEventActive(e.startAt, (e as { endAt?: string | null }).endAt)
  );
  const upcomingEvents = producerEvents.filter((e) => isEventFuture(e.startAt));
  const pastEvents = producerEvents.filter((e) =>
    isEventPast(e.startAt, (e as { endAt?: string | null }).endAt)
  );

  const { data: eventMetricsMap } = useQuery({
    queryKey: ['metrics', 'events', eventIds],
    queryFn: async () => {
      const map: Record<string, { ticketsSold: number; revenue: string }> = {};
      for (const id of eventIds) {
        const m = await repos.metrics.getEventMetrics(id, userId);
        map[id] = { ticketsSold: m.ticketsSold, revenue: m.revenue };
      }
      return map;
    },
    enabled: eventIds.length > 0 && !!userId,
  });

  const totalTicketsSold = Object.values(eventMetricsMap ?? {}).reduce((sum, m) => sum + (m.ticketsSold ?? 0), 0);
  const totalRevenue = Object.values(eventMetricsMap ?? {}).reduce(
    (sum, m) => sum + (parseFloat(m.revenue ?? '0') || 0),
    0
  );

  if (status === 'loading') {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando…</p>
      </PageContainer>
    );
  }

  if (!session?.user) {
    return (
      <PageContainer>
        <p className="text-text-muted">Debes iniciar sesión.</p>
        <Link href="/login" className="mt-4 inline-block text-accent hover:underline">
          Iniciar sesión
        </Link>
      </PageContainer>
    );
  }

  const m = platformMetrics ?? {
    totalEvents: 0,
    activeEvents: 0,
    ticketsSold: 0,
    totalReviews: 0,
    totalScans: 0,
  };

  return (
    <PageContainer>
      <Link href="/home" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Volver
      </Link>
      <SectionTitle>Panel del productor</SectionTitle>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent>
            <p className="text-sm text-text-muted">Eventos activos</p>
            <p className="text-2xl font-bold text-text">{activeEvents.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-text-muted">Próximos</p>
            <p className="text-2xl font-bold text-text">{upcomingEvents.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-text-muted">Pasados</p>
            <p className="text-2xl font-bold text-text">{pastEvents.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-text-muted">Tickets vendidos</p>
            <p className="text-2xl font-bold text-text">{totalTicketsSold}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-text-muted">Recaudación</p>
            <p className="text-2xl font-bold text-text">${totalRevenue.toLocaleString('es-AR')}</p>
          </CardContent>
        </Card>
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Mis eventos</h2>
          <Link
            href="/producer/events"
            className="rounded bg-accent px-4 py-2 text-sm font-medium text-bg hover:bg-accent-hover"
          >
            + Crear evento
          </Link>
        </div>
        {producerEvents.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-border bg-bg-muted/50 p-8 text-center">
            <p className="text-text-muted">No tenés eventos todavía.</p>
            <Link
              href="/producer/events"
              className="mt-4 inline-block rounded bg-accent px-4 py-2 text-bg hover:bg-accent-hover"
            >
              Crear tu primer evento
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {producerEvents.slice(0, 6).map((ev) => {
              const em = eventMetricsMap?.[ev.id];
              const rev = em ? parseFloat(em.revenue || '0').toLocaleString('es-AR') : '0';
              return (
                <ProductoraEventCard
                  key={ev.id}
                  event={ev}
                  ticketsSold={em?.ticketsSold ?? 0}
                  revenue={rev}
                />
              );
            })}
          </div>
        )}
      </section>

      <div className="mt-8 flex flex-wrap gap-4">
        <Link href="/producer/events" className="rounded border border-border px-4 py-2 text-text hover:bg-bg-muted">
          Ver todos los eventos
        </Link>
        <Link href="/producer/payouts" className="rounded border border-border px-4 py-2 text-text-muted hover:bg-bg-muted">
          Payouts
        </Link>
      </div>
    </PageContainer>
  );
}

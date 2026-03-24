'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { useProducerId } from '@/hooks/useProducerId';
import { PageContainer, SectionTitle, Card, CardContent, Button, PageLoader, EventCardSkeleton, EmptyState, Breadcrumbs } from '@/components';

export default function ProducerEventsPage() {
  const { data: session, status } = useSession();
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const PRODUCER_ID = useProducerId();
  const t = tenantId ?? 'tenant-demo';

  const { data: eventsData } = useQuery({
    queryKey: ['events', 'producer', PRODUCER_ID, t],
    queryFn: () => repos.events.list({ tenantId: t, producerId: PRODUCER_ID, limit: 50 }),
    enabled: !!t && status === 'authenticated',
  });

  const events = eventsData?.data ?? [];

  if (status === 'loading') return <PageContainer><PageLoader message="Cargando eventos…" /></PageContainer>;
  if (!session?.user) return <PageContainer><p className="text-text-muted">Iniciar sesión</p><Link href="/login" className="text-accent">Login</Link></PageContainer>;

  return (
    <PageContainer>
      <Breadcrumbs items={[{ label: 'Panel', href: '/producer' }, { label: 'Mis eventos' }]} />
      <SectionTitle>Mis eventos</SectionTitle>

      <Link href="/producer/events/new" className="inline-block mt-4">
        <Button>Crear evento</Button>
      </Link>

      <div className="mt-8 space-y-4">
        {!eventsData && (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => <EventCardSkeleton key={i} />)}
          </div>
        )}
        {events.length === 0 && eventsData && (
          <EmptyState
            title="No tenés eventos"
            description="Usá el botón de arriba para crear tu primer evento."
          />
        )}
        {events.map((ev) => (
          <Card key={ev.id}>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-text">{ev.title}</h3>
                  <p className="text-sm text-text-muted">{ev.city ?? ev.venueName ?? '—'} · {new Date(ev.startAt).toLocaleDateString('es-AR')}</p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/producer/events/${ev.id}`} className="rounded border border-accent px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent hover:text-bg transition-colors">
                    Gestionar
                  </Link>
                  <Link href={`/producer/events/${ev.id}/edit`}>
                    <Button size="sm" variant="secondary">
                      Editar
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { adminProducersKeys } from '@/lib/query/keys';
import { PageContainer, SectionTitle } from '@/components';
import { AdminProducerStatusBadge } from '@/components/admin/producers/AdminProducerStatusBadge';
import { AdminProducerEventsTable } from '@/components/admin/producers/AdminProducerEventsTable';

export default function AdminProductoraDetailPage() {
  const params = useParams();
  const producerId = (params?.producerId as string) ?? '';
  const repos = useRepositories();

  const { data: producer, isLoading: loadingProducer } = useQuery({
    queryKey: adminProducersKeys.detail(producerId),
    queryFn: () => repos.adminProducers.getProducer(producerId),
    enabled: !!producerId,
  });

  const { data: eventsData, isLoading: loadingEvents } = useQuery({
    queryKey: adminProducersKeys.events(producerId),
    queryFn: () => repos.adminProducers.listProducerEvents(producerId),
    enabled: !!producerId,
  });

  const events = eventsData?.data ?? [];

  return (
    <PageContainer>
      <Link
        href="/admin/productoras"
        className="mb-4 inline-block text-sm text-text-muted hover:text-text"
      >
        ← Productoras
      </Link>

      {loadingProducer ? (
        <p className="text-text-muted">Cargando…</p>
      ) : !producer ? (
        <p className="text-text-muted">Productora no encontrada</p>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <SectionTitle>{producer.displayName}</SectionTitle>
              <p className="mt-1 text-text-muted">
                {producer.owner.email}
                {producer.owner.name ? ` · ${producer.owner.name}` : ''}
              </p>
            </div>
            <AdminProducerStatusBadge status={producer.status} />
          </div>

          <div className="mt-6 grid gap-4 rounded-lg border border-border bg-bg-muted p-4 sm:grid-cols-2 lg:grid-cols-3">
            <Info label="Teléfono" value={producer.primaryPhone ?? producer.whatsapp} />
            <Info label="Ciudad" value={producer.city} />
            <Info label="Eventos" value={String(producer.eventsCount)} />
            <Info label="Pendientes" value={String(producer.pendingEventsCount)} />
            <Info label="Aprobados" value={String(producer.approvedEventsCount)} />
            <Info
              label="Alta"
              value={new Date(producer.createdAt).toLocaleDateString()}
            />
            {producer.shortDescription && (
              <div className="sm:col-span-2 lg:col-span-3">
                <Info label="Descripción" value={producer.shortDescription} />
              </div>
            )}
          </div>

          <h2 className="mt-10 text-lg font-semibold text-text">Eventos de la productora</h2>
          <p className="mt-1 text-sm text-text-muted">
            Hacé clic en el título para ver métricas. Usá las acciones para moderar cada evento.
          </p>

          {loadingEvents ? (
            <p className="mt-4 text-text-muted">Cargando eventos…</p>
          ) : (
            <div className="mt-4">
              <AdminProducerEventsTable producerId={producerId} events={events} />
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-0.5 text-sm text-text">{value?.trim() ? value : '—'}</p>
    </div>
  );
}

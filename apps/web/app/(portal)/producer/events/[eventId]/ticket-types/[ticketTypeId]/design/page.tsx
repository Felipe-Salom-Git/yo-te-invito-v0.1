'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { ticketTypesKeys } from '@/lib/query/keys';
import { PageContainer, SectionTitle, Breadcrumbs } from '@/components';
import { TicketStudioClient } from '@/components/producer/ticket-studio/TicketStudioClient';

export default function ProducerTicketDesignPage() {
  const params = useParams();
  const eventId = (params?.eventId as string) ?? '';
  const ticketTypeId = (params?.ticketTypeId as string) ?? '';
  const repos = useRepositories();

  const { data: event, isLoading: evLoading } = useQuery({
    queryKey: ['event', 'producer', eventId],
    queryFn: () => repos.events.getDetailForProducer(eventId),
    enabled: !!eventId,
  });

  const { data: types, isLoading: tyLoading } = useQuery({
    queryKey: ticketTypesKeys.producerByEvent(eventId),
    queryFn: () => repos.ticketTypes.list(eventId),
    enabled: !!eventId,
  });

  const tt = types?.find((t) => t.id === ticketTypeId);

  if (!eventId || !ticketTypeId) {
    return (
      <PageContainer className="!max-w-7xl">
        <p className="text-text-muted">Ruta inválida.</p>
      </PageContainer>
    );
  }

  if (evLoading || tyLoading || !event || !tt) {
    return (
      <PageContainer className="!max-w-7xl">
        <p className="text-text-muted">Cargando…</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="!max-w-7xl">
      <Breadcrumbs
        items={[
          { label: 'Mis eventos', href: '/producer/events' },
          { label: event.title, href: `/producer/events/${eventId}` },
          { label: `Ticket: ${tt.name}` },
        ]}
      />
      <SectionTitle className="mt-6">Estudio de ticket</SectionTitle>
      <p className="mt-2 max-w-2xl text-sm text-text-muted">
        Editor guiado: fondo, textos, imágenes y campos dinámicos. La zona QR es obligatoria y no puede taparse.
        El <span className="font-medium text-text">payload del QR</span> se define al emitir el ticket; esto solo
        afecta el diseño cuando integremos el render final.
      </p>
      <div className="mt-8">
        <TicketStudioClient
          eventId={eventId}
          ticketTypeId={ticketTypeId}
          eventTitle={event.title}
          ticketTypeName={tt.name}
        />
      </div>
    </PageContainer>
  );
}

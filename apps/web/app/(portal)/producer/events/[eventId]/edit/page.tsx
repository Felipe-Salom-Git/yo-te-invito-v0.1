'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, PageLoader, Breadcrumbs } from '@/components';
import { ProducerEventEditForm } from '@/components/producer/events/ProducerEventEditForm';

export default function EditEventPage() {
  const params = useParams();
  const eventId = params?.eventId as string;
  const { status } = useSession();
  const repos = useRepositories();

  const { data: eventData, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => repos.events.getDetailForProducer(eventId),
    enabled: !!eventId,
  });

  if (status === 'unauthenticated') {
    return (
      <PageContainer>
        <p className="text-text-muted">Iniciá sesión para continuar.</p>
        <Link href="/login" className="mt-2 block text-accent underline">
          Login
        </Link>
      </PageContainer>
    );
  }

  if (isLoading || !eventData) {
    return <PageLoader />;
  }

  return (
    <PageContainer>
      <Breadcrumbs
        items={[
          { label: 'Mis eventos', href: '/producer/events' },
          { label: eventData.title, href: `/producer/events/${eventId}` },
          { label: 'Editar ficha' },
        ]}
      />

      <div className="mb-8">
        <SectionTitle>Editar ficha del evento</SectionTitle>
        <p className="mt-2 max-w-2xl text-text-muted">
          Modificá datos generales, ubicación e imagen. Los precios, tandas y cupos por tipo de
          entrada se gestionan desde el detalle del evento — no se pierden al guardar acá.
        </p>
      </div>

      <ProducerEventEditForm eventId={eventId} eventData={eventData} />
    </PageContainer>
  );
}

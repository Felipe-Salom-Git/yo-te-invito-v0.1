'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PageContainer, Breadcrumbs } from '@/components';
import { ProducerEventModeSelector } from '@/components/producer/events/ProducerEventModeSelector';
import { ProducerEventCreateForm } from '@/components/producer/events/ProducerEventCreateForm';
import { EventModeBadge } from '@/components/producer/events/EventModeBadge';
import { parseProducerEventModeFromQuery } from '@/lib/producer/event-mode';

export default function CreateEventPage() {
  const { status } = useSession();
  const searchParams = useSearchParams();
  const mode = parseProducerEventModeFromQuery(searchParams.get('mode'));

  if (status === 'unauthenticated') {
    return (
      <PageContainer>
        <p className="text-text-muted">Iniciá sesión para continuar.</p>
        <Link href="/login" className="text-accent underline mt-2 block">
          Login
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Breadcrumbs
        items={[
          { label: 'Mis eventos', href: '/producer/events' },
          { label: mode ? (mode === 'TICKETED' ? 'Con ticketera' : 'Solo publicidad') : 'Crear evento' },
        ]}
      />

      {!mode ? (
        <ProducerEventModeSelector />
      ) : (
        <div className="max-w-3xl">
          <div className="mb-8 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-text">
              {mode === 'TICKETED' ? 'Nuevo evento con ticketera' : 'Nueva publicación'}
            </h1>
            <EventModeBadge mode={mode} />
          </div>
          <ProducerEventCreateForm mode={mode} />
        </div>
      )}
    </PageContainer>
  );
}

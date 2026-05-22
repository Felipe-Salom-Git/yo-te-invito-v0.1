'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import {
  PageContainer,
  SectionTitle,
  Breadcrumbs,
  Button,
  PageLoader,
  useToast,
} from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { courtesyKeys, ticketTypesKeys } from '@/lib/query/keys';
import { mapCourtesyApiMessage } from '@/lib/producer/courtesy.utils';
import type { CreateCourtesyBody } from '@yo-te-invito/shared';
import { ProducerCourtesiesHelp } from './ProducerCourtesiesHelp';
import { ProducerCourtesyCreateForm } from './ProducerCourtesyCreateForm';
import { ProducerCourtesyGrantsList } from './ProducerCourtesyGrantsList';

type Props = {
  eventId: string;
};

export function ProducerCourtesiesPageClient({ eventId }: Props) {
  const { status } = useSession();
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [lastSuccess, setLastSuccess] = useState<{ issued: number; grantId: string } | null>(null);

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event', 'producer', eventId],
    queryFn: () => repos.events.getDetailForProducer(eventId),
    enabled: !!eventId && status === 'authenticated',
  });

  const { data: ticketTypes = [], isLoading: typesLoading } = useQuery({
    queryKey: courtesyKeys.ticketTypes(eventId),
    queryFn: () => repos.courtesies.fetchTicketTypes(eventId),
    enabled: !!eventId && status === 'authenticated',
  });

  const { data: grantsData, isLoading: grantsLoading } = useQuery({
    queryKey: courtesyKeys.grants(eventId),
    queryFn: () => repos.courtesies.list(eventId),
    enabled: !!eventId && status === 'authenticated',
  });

  const grants = grantsData?.grants ?? [];

  const ticketTypesById = useMemo(() => {
    const m = new Map<string, (typeof ticketTypes)[0]>();
    for (const t of ticketTypes) m.set(t.id, t);
    return m;
  }, [ticketTypes]);

  const createMut = useMutation({
    mutationFn: (body: CreateCourtesyBody) => repos.courtesies.create(eventId, body),
    onSuccess: (res) => {
      setLastSuccess({ issued: res.issued, grantId: res.grantId });
      addToast(
        `Se emitieron ${res.issued} entrada(s) de cortesía correctamente.`,
        'success',
      );
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: courtesyKeys.grants(eventId) });
      queryClient.invalidateQueries({ queryKey: courtesyKeys.ticketTypes(eventId) });
      queryClient.invalidateQueries({ queryKey: ticketTypesKeys.producerByEvent(eventId) });
      queryClient.invalidateQueries({ queryKey: ticketTypesKeys.byEvent(eventId) });
      queryClient.invalidateQueries({ queryKey: ['tickets', 'event', eventId] });
    },
    onError: (e) => addToast(mapCourtesyApiMessage(getErrorMessage(e)), 'error'),
  });

  const scrollToForm = () => {
    setShowForm(true);
    setLastSuccess(null);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  if (status === 'unauthenticated') {
    return (
      <PageContainer>
        <p className="text-text-muted">Iniciá sesión para gestionar cortesías.</p>
        <Link href="/login" className="mt-2 block text-accent underline">
          Login
        </Link>
      </PageContainer>
    );
  }

  if (eventLoading || typesLoading || grantsLoading) {
    return <PageLoader />;
  }

  const eventTitle = event?.title ?? 'Evento';

  return (
    <PageContainer>
      <Breadcrumbs
        items={[
          { label: 'Mis eventos', href: '/producer/events' },
          { label: eventTitle, href: `/producer/events/${eventId}` },
          { label: 'Cortesías' },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <SectionTitle>Cortesías</SectionTitle>
          <p className="mt-2 max-w-2xl text-sm text-text-muted">
            Otorgá entradas gratuitas para {eventTitle}. No pasan por checkout ni generan cobro.
          </p>
        </div>
        <Link
          href={`/producer/events/${eventId}/referrals`}
          className="text-sm text-accent hover:underline"
        >
          Referidos del evento →
        </Link>
      </div>

      <ProducerCourtesiesHelp eventId={eventId} />

      {lastSuccess ? (
        <div className="mt-6 rounded-xl border border-accent/30 bg-accent/5 p-4">
          <p className="font-medium text-text">
            Cortesía registrada ({lastSuccess.issued} entrada
            {lastSuccess.issued === 1 ? '' : 's'})
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Los tickets ya están emitidos. Podés verlos en la gestión del evento (filtro por origen
            cortesía si está disponible) o escanearlos en puerta.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/producer/events/${eventId}`}>
              <Button type="button" size="sm" variant="outline">
                Volver al evento
              </Button>
            </Link>
            <Button type="button" size="sm" variant="ghost" onClick={() => setLastSuccess(null)}>
              Cerrar
            </Button>
          </div>
        </div>
      ) : null}

      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-text">Otorgamientos</h2>
          {!showForm && grants.length > 0 ? (
            <Button type="button" size="sm" onClick={scrollToForm}>
              + Crear cortesía
            </Button>
          ) : null}
        </div>

        <ProducerCourtesyGrantsList
          grants={grants}
          ticketTypesById={ticketTypesById}
          onCreateClick={scrollToForm}
        />
      </section>

      <div ref={formRef} className="mt-10">
        {showForm || grants.length === 0 ? (
          <ProducerCourtesyCreateForm
            eventId={eventId}
            ticketTypes={ticketTypes}
            isSubmitting={createMut.isPending}
            onSubmit={(body) => createMut.mutate(body)}
            onCancel={grants.length > 0 ? () => setShowForm(false) : undefined}
          />
        ) : (
          <div className="text-center">
            <Button type="button" variant="secondary" onClick={scrollToForm}>
              + Crear otra cortesía
            </Button>
          </div>
        )}
      </div>
    </PageContainer>
  );
}

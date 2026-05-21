'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRepositories } from '@/repositories/context';
import { ticketsKeys } from '@/lib/query/keys';
import {
  PageContainer,
  SectionTitle,
  useToast,
  PageLoader,
  TicketCardSkeleton,
  EmptyState,
  QueryError,
} from '@/components';
import { MeTicketListCard } from '@/components/me/MeTicketListCard';
import { PortalListSection } from '@/components/me/portal-ui';
import { groupPortalTickets } from '@/lib/me/ticket-groups';
import { getErrorMessage } from '@/lib/errors';
import type { Ticket } from '@/repositories/interfaces';

function groupTicketsByEvent(tickets: Ticket[]) {
  const map = new Map<string, Ticket[]>();
  for (const t of tickets) {
    const list = map.get(t.eventId) ?? [];
    list.push(t);
    map.set(t.eventId, list);
  }
  return map;
}

function EventTicketGroup({
  eventId,
  eventTickets,
  scanningId,
  onSimulateScan,
}: {
  eventId: string;
  eventTickets: Ticket[];
  scanningId: string | null;
  onSimulateScan: (t: Ticket) => void;
}) {
  const title = eventTickets[0]?.eventTitle ?? `Evento ${eventId}`;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="font-medium text-text">{title}</h3>
        <Link href={`/events/${eventId}`} className="text-sm text-accent hover:underline">
          Ver evento
        </Link>
      </div>
      <ul className="space-y-3">
        {eventTickets.map((t) => (
          <li key={t.id}>
            <MeTicketListCard
              ticket={t}
              eventTitle={title}
              onSimulateScan={() => onSimulateScan(t)}
              isScanning={scanningId === t.id}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function TicketBucket({
  title,
  description,
  tickets,
  scanningId,
  onSimulateScan,
}: {
  title: string;
  description?: string;
  tickets: Ticket[];
  scanningId: string | null;
  onSimulateScan: (t: Ticket) => void;
}) {
  if (tickets.length === 0) return null;
  const byEvent = groupTicketsByEvent(tickets);
  return (
    <PortalListSection title={title} description={description} className="space-y-6">
      {Array.from(byEvent.entries()).map(([eventId, eventTickets]) => (
        <EventTicketGroup
          key={eventId}
          eventId={eventId}
          eventTickets={eventTickets}
          scanningId={scanningId}
          onSimulateScan={onSimulateScan}
        />
      ))}
    </PortalListSection>
  );
}

export default function MyTicketsPage() {
  const { data: session, status } = useSession();
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const userId =
    (session?.user as { userId?: string })?.userId ??
    (session?.user as { id?: string })?.id ??
    '';

  const [scanningId, setScanningId] = useState<string | null>(null);

  const { data: tickets, isLoading, isError, error, refetch } = useQuery({
    queryKey: ticketsKeys.me(userId),
    queryFn: () => repos.tickets.listByOwner(userId),
    enabled: !!userId && status === 'authenticated',
  });

  const scanMutation = useMutation({
    mutationFn: ({ qrPayload, eventId }: { qrPayload: string; eventId?: string }) =>
      repos.scanner.scan(qrPayload, eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketsKeys.me(userId) });
      setScanningId(null);
      addToast('Escaneo simulado correctamente', 'success');
    },
    onError: (err) => {
      setScanningId(null);
      addToast(getErrorMessage(err), 'error');
    },
  });

  const handleSimulateScan = (ticket: Ticket) => {
    setScanningId(ticket.id);
    scanMutation.mutate({ qrPayload: ticket.qrPayload, eventId: ticket.eventId });
  };

  if (status === 'loading') {
    return (
      <PageContainer>
        <PageLoader message="Cargando tickets…" />
      </PageContainer>
    );
  }

  if (!session?.user) {
    return (
      <PageContainer>
        <p className="text-text-muted">Debés iniciar sesión para ver tus tickets.</p>
        <Link href="/login" className="mt-4 inline-block text-accent hover:underline">
          Iniciar sesión
        </Link>
      </PageContainer>
    );
  }

  const list = tickets ?? [];
  const buckets = groupPortalTickets(list);

  return (
    <PageContainer>
      <SectionTitle>Mis tickets</SectionTitle>
      <p className="mt-1 text-sm text-text-muted">
        Entradas activas, usadas o transferidas. La transferencia es personal entre usuarios — no es
        reventa.
      </p>

      {isLoading && (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <TicketCardSkeleton key={i} />
          ))}
        </div>
      )}

      {isError && (
        <QueryError className="mt-6" message={getErrorMessage(error)} onRetry={() => void refetch()} />
      )}

      {!isLoading && !isError && list.length === 0 && (
        <div className="mt-6">
          <EmptyState
            title="No tenés tickets aún"
            description="Comprá entradas en eventos y aparecerán acá con tu código QR."
            actionLabel="Explorar eventos"
            actionHref="/explore"
          />
        </div>
      )}

      {!isLoading && !isError && list.length > 0 && (
        <div className="mt-6 space-y-10">
          <TicketBucket
            title="Próximos y activos"
            description="Entradas válidas o con transferencia en curso."
            tickets={[...buckets.upcoming]}
            scanningId={scanningId}
            onSimulateScan={handleSimulateScan}
          />
          <TicketBucket
            title="Eventos pasados (entrada aún válida)"
            description="El evento ya ocurrió; el estado del ticket puede seguir siendo válido hasta el cierre operativo."
            tickets={buckets.pastActive}
            scanningId={scanningId}
            onSimulateScan={handleSimulateScan}
          />
          <TicketBucket
            title="Usados"
            description="Ya se registró el ingreso con este ticket."
            tickets={buckets.used}
            scanningId={scanningId}
            onSimulateScan={handleSimulateScan}
          />
          <TicketBucket
            title="Transferidos o revocados"
            description="No podés ingresar con estos códigos. Si transferiste, el receptor tiene un ticket nuevo."
            tickets={buckets.inactive}
            scanningId={scanningId}
            onSimulateScan={handleSimulateScan}
          />
        </div>
      )}
    </PageContainer>
  );
}

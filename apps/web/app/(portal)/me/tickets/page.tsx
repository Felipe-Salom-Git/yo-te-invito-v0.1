'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRepositories } from '@/repositories/context';
import { ticketsKeys } from '@/lib/query/keys';
import { PageContainer, SectionTitle, Button, useToast, PageLoader, TicketCardSkeleton, EmptyState } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { StatusBadge } from '@/components/domain/StatusBadge';
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

function TicketCard({
  ticket,
  eventTitle,
  onSimulateScan,
  isScanning,
}: {
  ticket: Ticket;
  eventTitle: string;
  onSimulateScan: () => void;
  isScanning: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-bg-muted p-4">
      <div>
        <p className="font-medium text-text">{eventTitle}</p>
        <p className="text-xs text-text-muted truncate max-w-[200px]">ID: {ticket.id}</p>
      </div>
      <StatusBadge status={ticket.status} kind="ticket" />
      <div className="flex gap-2">
        <Link
          href={`/me/tickets/${ticket.id}`}
          className="rounded border border-border px-2 py-1 text-sm hover:bg-border"
        >
          Ver detalle
        </Link>
        {ticket.status === 'VALID' && (
          <Button size="sm" onClick={onSimulateScan} disabled={isScanning}>
            {isScanning ? '…' : 'Simular scan'}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function MyTicketsPage() {
  const { data: session, status } = useSession();
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const userId = (session?.user as { userId?: string })?.userId ?? (session?.user as { id?: string })?.id ?? '';

  const [scanningId, setScanningId] = useState<string | null>(null);

  const { data: tickets, isLoading } = useQuery({
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

  const list = tickets ?? [];
  const byEvent = groupTicketsByEvent(list);

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
        <p className="text-text-muted">Debes iniciar sesión para ver tus tickets.</p>
        <Link href="/login" className="mt-4 inline-block text-accent hover:underline">
          Iniciar sesión
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link href="/home" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Volver
      </Link>
      <SectionTitle>Mis tickets</SectionTitle>
      {isLoading && (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <TicketCardSkeleton key={i} />)}
        </div>
      )}
      {!isLoading && list.length === 0 && (
        <div className="mt-6">
          <EmptyState
            title="No tenés tickets aún"
            description="Comprá entradas en eventos y aparecerán aquí."
            actionLabel="Explorar eventos"
            actionHref="/explore"
          />
        </div>
      )}
      {!isLoading && list.length > 0 && (
        <div className="mt-6 space-y-8">
          {Array.from(byEvent.entries()).map(([eventId, eventTickets]) => (
            <section key={eventId}>
              <h2 className="text-lg font-semibold text-text mb-4">
                Evento {eventId}
                <Link href={`/events/${eventId}`} className="ml-2 text-sm text-accent hover:underline">
                  Ver evento
                </Link>
              </h2>
              <ul className="space-y-3">
                {eventTickets.map((t) => (
                  <li key={t.id}>
                    <TicketCard
                      ticket={t}
                      eventTitle={`Evento ${eventId}`}
                      onSimulateScan={() => handleSimulateScan(t)}
                      isScanning={scanningId === t.id}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

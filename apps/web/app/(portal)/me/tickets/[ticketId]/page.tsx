'use client';

import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useTicketById } from '@/lib/query/tickets';
import { useEventDetail } from '@/lib/query/events';
import { PageContainer, SectionTitle } from '@/components';
import { StatusBadge } from '@/components/domain/StatusBadge';

const QR_API = 'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=';
const TENANT_ID = 'tenant-demo';

export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = (params?.ticketId as string) ?? '';
  const { data: session, status } = useSession();
  const userId = (session?.user as { userId?: string })?.userId ?? (session?.user as { id?: string })?.id ?? '';

  const { data: ticket, isLoading: ticketLoading } = useTicketById(ticketId, !!userId && status === 'authenticated');
  const { data: event } = useEventDetail(ticket?.eventId ?? '', TENANT_ID);

  if (status === 'loading' || ticketLoading) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando…</p>
      </PageContainer>
    );
  }

  if (!session?.user) {
    return (
      <PageContainer>
        <p className="text-text-muted">Debes iniciar sesión para ver tus tickets.</p>
        <Link href="/login" className="mt-4 block text-accent hover:underline">
          Iniciar sesión
        </Link>
      </PageContainer>
    );
  }

  if (!ticket) {
    return (
      <PageContainer>
        <p className="text-red-400">Ticket no encontrado</p>
        <Link href="/me/tickets" className="mt-4 block text-accent hover:underline">
          ← Volver a mis tickets
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link href="/me/tickets" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Volver a mis tickets
      </Link>
      <SectionTitle>Ticket</SectionTitle>

      <div className="mt-8 flex flex-col items-center gap-6">
        <div className="w-full max-w-sm rounded-xl border border-border bg-bg-muted p-6 text-center">
          <img
            src={`${QR_API}${encodeURIComponent(ticket.qrPayload)}`}
            alt="Código QR del ticket"
            width={280}
            height={280}
            className="mx-auto rounded-lg border border-border"
          />
          <StatusBadge status={ticket.status} kind="ticket" className="mt-4" />
        </div>

        <div className="w-full max-w-sm space-y-2 text-left">
          {(event || ticket.eventTitle) && (
            <>
              <p className="font-semibold text-text">{event?.title ?? ticket.eventTitle}</p>
              {ticket.ticketTypeName ? (
                <p className="text-sm text-text-muted">{ticket.ticketTypeName}</p>
              ) : null}
              {event ? (
                <p className="text-sm text-text-muted">
                  {event.venueName && `${event.venueName} · `}
                  {event.city ?? '—'} · {new Date(event.startAt).toLocaleDateString('es-AR')}
                </p>
              ) : null}
              <Link
                href={`/events/${ticket.eventId}?tenantId=${TENANT_ID}`}
                className="inline-block text-sm text-accent hover:underline"
              >
                Ver evento →
              </Link>
            </>
          )}
          <p className="pt-2 text-xs text-text-muted break-all">ID: {ticket.id}</p>
        </div>
      </div>
    </PageContainer>
  );
}

'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageContainer, SectionTitle, PageLoader } from '@/components';
import { TicketQrCard } from '@/components/me/TicketQrCard';
import { TicketTransferPanel } from '@/components/me/TicketTransferPanel';
import { TicketReminderToggle } from '@/components/me/TicketReminderToggle';
import { useMeTicketDetail } from '@/lib/query/me-portal';

const TENANT_ID = 'tenant-demo';

const SOURCE_LABELS: Record<string, string> = {
  ORDER: 'Compra',
  COURTESY: 'Cortesía',
  TRANSFER: 'Transferencia recibida',
};

export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = (params?.ticketId as string) ?? '';
  const { data: ticket, isLoading, isError } = useMeTicketDetail(ticketId);

  if (isLoading) {
    return (
      <PageContainer>
        <PageLoader message="Cargando ticket…" />
      </PageContainer>
    );
  }

  if (isError || !ticket) {
    return (
      <PageContainer>
        <p className="text-red-400">Ticket no encontrado</p>
        <Link href="/me/tickets" className="mt-4 block text-accent hover:underline">
          ← Volver a mis tickets
        </Link>
      </PageContainer>
    );
  }

  const event = ticket.event;
  const showReminder =
    ticket.status === 'VALID' || ticket.status === 'TRANSFER_PENDING';

  return (
    <PageContainer>
      <Link href="/me/tickets" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Mis tickets
      </Link>
      <SectionTitle>{event.title}</SectionTitle>
      {ticket.ticketType?.name && (
        <p className="mt-1 text-sm text-text-muted">{ticket.ticketType.name}</p>
      )}
      {ticket.source && (
        <p className="mt-1 text-xs text-text-muted">
          Origen: {SOURCE_LABELS[ticket.source] ?? ticket.source}
        </p>
      )}

      <div className="mt-8 flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
        <TicketQrCard qrPayload={ticket.qrPayload} status={ticket.status} />

        <div className="w-full max-w-sm space-y-4">
          <div className="rounded-lg border border-border p-4 text-sm">
            <p className="text-text-muted">
              {event.venueName && <span>{event.venueName} · </span>}
              {new Date(event.startAt).toLocaleString('es-AR', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
            <Link
              href={`/events/${event.id}?tenantId=${TENANT_ID}`}
              className="mt-2 inline-block text-accent hover:underline"
            >
              Ver evento →
            </Link>
            <p className="mt-3 text-xs text-text-muted break-all">ID ticket: {ticket.ticketId}</p>
          </div>

          {showReminder && (
            <TicketReminderToggle
              ticketId={ticket.ticketId}
              reminderEnabled={ticket.reminderEnabled}
            />
          )}

          <TicketTransferPanel
            ticket={ticket}
            offer={ticket.transferOffer}
            canTransfer={ticket.canTransfer}
          />
        </div>
      </div>
    </PageContainer>
  );
}

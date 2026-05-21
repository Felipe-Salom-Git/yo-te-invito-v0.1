'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageContainer, SectionTitle, PageLoader, QueryError, EmptyState } from '@/components';
import { StatusBadge } from '@/components/domain/StatusBadge';
import { MeBuyerTicketPanel } from '@/components/me/MeBuyerTicketPanel';
import { TicketTransferPanel } from '@/components/me/TicketTransferPanel';
import { TicketReminderToggle } from '@/components/me/TicketReminderToggle';
import { useMeTicketDetail } from '@/lib/query/me-portal';
import { getErrorMessage } from '@/lib/errors';

const SOURCE_LABELS: Record<string, string> = {
  ORDER: 'Compra',
  COURTESY: 'Cortesía',
  TRANSFER: 'Transferencia recibida',
};

const STATUS_HINTS: Record<string, string> = {
  USED: 'Este ticket ya se usó para ingresar. No podés reutilizarlo.',
  REVOKED: 'Este ticket fue revocado por la productora o el sistema. Contactá soporte si creés que es un error.',
  TRANSFERRED: 'Transferiste esta entrada. El receptor tiene un ticket nuevo con otro QR.',
  TRANSFER_PENDING:
    'Hay una transferencia personal en curso. El QR de arriba no habilita ingreso hasta completar o cancelar.',
};

export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = (params?.ticketId as string) ?? '';
  const { data: ticket, isLoading, isError, error, refetch } = useMeTicketDetail(ticketId);

  if (isLoading) {
    return (
      <PageContainer>
        <PageLoader message="Cargando ticket…" />
      </PageContainer>
    );
  }

  if (isError) {
    return (
      <PageContainer>
        <Link
          href="/me/tickets"
          className="portal-chrome mb-4 inline-block text-sm text-text-muted hover:text-text"
        >
          ← Mis tickets
        </Link>
        <QueryError message={getErrorMessage(error)} onRetry={() => void refetch()} />
      </PageContainer>
    );
  }

  if (!ticket) {
    return (
      <PageContainer>
        <EmptyState
          title="Ticket no encontrado"
          description="Puede haber sido transferido, revocado o no pertenece a tu cuenta."
          actionLabel="Volver a mis tickets"
          actionHref="/me/tickets"
        />
      </PageContainer>
    );
  }

  const event = ticket.event;
  const showReminder = ticket.status === 'VALID' || ticket.status === 'TRANSFER_PENDING';
  const statusHint = STATUS_HINTS[ticket.status];

  return (
    <PageContainer>
      <Link
        href="/me/tickets"
        className="portal-chrome mb-4 inline-block text-sm text-text-muted hover:text-text"
      >
        ← Mis tickets
      </Link>

      <div className="portal-chrome flex flex-wrap items-center gap-3">
        <SectionTitle className="!mb-0">{event.title}</SectionTitle>
        <StatusBadge status={ticket.status} kind="ticket" />
      </div>
      {ticket.ticketType?.name && (
        <p className="portal-chrome mt-1 text-sm text-text-muted">{ticket.ticketType.name}</p>
      )}
      {ticket.source && (
        <p className="portal-chrome mt-1 text-xs text-text-muted">
          Origen: {SOURCE_LABELS[ticket.source] ?? ticket.source}
          {ticket.ticketTemplate ? ' · Diseño personalizado' : ''}
        </p>
      )}
      {statusHint && (
        <p className="portal-chrome mt-3 max-w-lg rounded-lg border border-border bg-bg-muted/50 px-3 py-2 text-sm text-text-muted">
          {statusHint}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-center">
        <div className="w-full min-w-0 flex-1 lg:max-w-md">
          <MeBuyerTicketPanel ticket={ticket} />
        </div>

        <div className="portal-chrome w-full max-w-sm shrink-0 space-y-4">
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

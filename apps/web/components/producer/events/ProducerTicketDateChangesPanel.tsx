'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, useToast } from '@/components';
import { useRepositories } from '@/repositories/context';
import { getErrorMessage } from '@/lib/errors';
import { TICKET_DATE_CHANGE_STATUS_LABELS } from '@/lib/me/ticket-date-change-labels';

type Props = {
  eventId: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

export function ProducerTicketDateChangesPanel({ eventId }: Props) {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['producer', 'date-change-requests', eventId],
    queryFn: () => repos.events.listDateChangeRequests(eventId, { status: 'PENDING' }),
    enabled: !!eventId,
  });

  const approve = useMutation({
    mutationFn: (requestId: string) => repos.events.approveDateChangeRequest(requestId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['producer', 'date-change-requests', eventId] });
      addToast('Cambio de fecha aprobado y aplicado', 'success');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const reject = useMutation({
    mutationFn: (requestId: string) =>
      repos.events.rejectDateChangeRequest(requestId, { reason: 'No disponible en esta fecha' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['producer', 'date-change-requests', eventId] });
      addToast('Solicitud rechazada', 'success');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  if (isLoading) return null;
  if (requests.length === 0) return null;

  return (
    <section className="mt-8 rounded-lg border border-border p-4">
      <h3 className="text-base font-semibold text-text">Cambios de fecha pendientes</h3>
      <ul className="mt-4 space-y-4">
        {requests.map((req) => (
          <li
            key={req.id}
            className="flex flex-col gap-3 rounded-lg border border-border bg-bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 text-sm">
              <p className="font-medium text-text">
                {req.buyerName ?? req.buyerEmail ?? 'Comprador'}
              </p>
              <p className="text-text-muted">{req.ticketTypeName ?? 'Entrada'}</p>
              <p className="mt-1 text-text-muted">
                {formatDate(req.fromOccurrenceStartAt)} → {formatDate(req.toOccurrenceStartAt)}
              </p>
              <p className="text-xs text-text-muted">
                {TICKET_DATE_CHANGE_STATUS_LABELS[req.status] ?? req.status}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => approve.mutate(req.id)}
                disabled={approve.isPending || reject.isPending}
              >
                Aprobar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => reject.mutate(req.id)}
                disabled={approve.isPending || reject.isPending}
              >
                Rechazar
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

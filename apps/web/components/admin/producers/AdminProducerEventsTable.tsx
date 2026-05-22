'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import {
  adminAuditKeys,
  adminDashboardKeys,
  adminEventsKeys,
  adminProducersKeys,
} from '@/lib/query/keys';
import { Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import type { AdminProducerEventListItem } from '@/repositories/interfaces';
import { EventModeBadge } from '@/components/producer/events/EventModeBadge';
import { deriveEventModeFromEvent } from '@/lib/producer/event-mode';
import { AdminProducerStatusBadge } from './AdminProducerStatusBadge';
import { EventModerationReasonModal } from './EventModerationReasonModal';
import { AdminProducerEventMetricsPanel } from './AdminProducerEventMetricsPanel';

type ModerationKind = 'reject' | 'postpone' | 'cancel' | null;

type AdminProducerEventsTableProps = {
  producerId: string;
  events: AdminProducerEventListItem[];
};

export function AdminProducerEventsTable({ producerId, events }: AdminProducerEventsTableProps) {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModerationKind>(null);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  const metricsQuery = useQuery({
    queryKey: adminProducersKeys.eventMetrics(producerId, expandedId ?? ''),
    queryFn: () => repos.adminProducers.getProducerEventMetrics(producerId, expandedId!),
    enabled: !!expandedId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: adminDashboardKeys.all });
    queryClient.invalidateQueries({ queryKey: adminEventsKeys.all });
    queryClient.invalidateQueries({ queryKey: adminAuditKeys.all });
    queryClient.invalidateQueries({ queryKey: adminProducersKeys.events(producerId) });
    queryClient.invalidateQueries({ queryKey: adminProducersKeys.detail(producerId) });
    queryClient.invalidateQueries({ queryKey: adminProducersKeys.all });
    if (expandedId) {
      queryClient.invalidateQueries({
        queryKey: adminProducersKeys.eventMetrics(producerId, expandedId),
      });
    }
  };

  const approveMutation = useMutation({
    mutationFn: (eventId: string) => repos.adminProducers.approveProducerEvent(producerId, eventId),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      addToast('Evento aprobado', 'success');
      invalidate();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ eventId, reason }: { eventId: string; reason: string }) =>
      repos.adminProducers.rejectProducerEvent(producerId, eventId, reason),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      addToast('Evento rechazado', 'success');
      setModal(null);
      invalidate();
    },
  });

  const postponeMutation = useMutation({
    mutationFn: ({
      eventId,
      reason,
      newStartAt,
    }: {
      eventId: string;
      reason: string;
      newStartAt?: string;
    }) => repos.adminProducers.postponeProducerEvent(producerId, eventId, reason, newStartAt),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      addToast('Evento pospuesto', 'success');
      setModal(null);
      invalidate();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ eventId, reason }: { eventId: string; reason: string }) =>
      repos.adminProducers.cancelProducerEvent(producerId, eventId, reason),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      addToast('Evento cancelado', 'success');
      setModal(null);
      invalidate();
    },
  });

  const isPending =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    postponeMutation.isPending ||
    cancelMutation.isPending;

  const openModal = (kind: ModerationKind, eventId: string) => {
    setActiveEventId(eventId);
    setModal(kind);
  };

  const handleModalConfirm = (reason: string, newStartAt?: string) => {
    if (!activeEventId) return;
    if (modal === 'reject') rejectMutation.mutate({ eventId: activeEventId, reason });
    if (modal === 'postpone') postponeMutation.mutate({ eventId: activeEventId, reason, newStartAt });
    if (modal === 'cancel') cancelMutation.mutate({ eventId: activeEventId, reason });
  };

  if (events.length === 0) {
    return <p className="text-text-muted">Esta productora no tiene eventos.</p>;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-bg-muted text-text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Evento</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Ubicación</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Modo</th>
              <th className="px-4 py-3 font-medium">Resumen</th>
              <th className="px-4 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => {
              const expanded = expandedId === ev.id;
              const summary = ev.isGeneralPublication
                ? 'Solo publicidad'
                : ev.hasTicketing
                  ? `${ev.ticketsSold ?? 0} vendidas · ${ev.revenue ?? '0'}`
                  : ev.ratingCount != null
                    ? `${ev.ratingCount} reseñas`
                    : '—';
              return (
                <Fragment key={ev.id}>
                  <tr className="border-b border-border/60">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="font-medium text-text hover:text-accent"
                        onClick={() => setExpandedId(expanded ? null : ev.id)}
                      >
                        {ev.title}
                      </button>
                      <Link
                        href={`/events/${ev.id}`}
                        className="ml-2 text-xs text-accent hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Ver público
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {new Date(ev.startAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {ev.city ?? ev.venueName ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <AdminProducerStatusBadge status={ev.status} />
                    </td>
                    <td className="px-4 py-3">
                      <EventModeBadge
                        mode={deriveEventModeFromEvent(ev)}
                        hasActiveTicketing={ev.hasTicketing}
                      />
                    </td>
                    <td className="px-4 py-3 text-text-muted">{summary}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(ev.status === 'pending' || ev.status === 'draft') && (
                          <Button
                            size="sm"
                            disabled={isPending}
                            onClick={() => approveMutation.mutate(ev.id)}
                          >
                            Aprobar
                          </Button>
                        )}
                        {ev.status !== 'cancelled' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isPending}
                              onClick={() => openModal('reject', ev.id)}
                            >
                              Rechazar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isPending}
                              onClick={() => openModal('postpone', ev.id)}
                            >
                              Posponer
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isPending}
                              onClick={() => openModal('cancel', ev.id)}
                            >
                              Cancelar
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={7} className="bg-bg-muted/30 px-4 py-4">
                        <AdminProducerEventMetricsPanel
                          metrics={metricsQuery.data}
                          isLoading={metricsQuery.isLoading}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <EventModerationReasonModal
        open={modal === 'reject'}
        title="Motivo de rechazo"
        confirmLabel="Confirmar rechazo"
        onClose={() => setModal(null)}
        onConfirm={handleModalConfirm}
        isPending={rejectMutation.isPending}
      />
      <EventModerationReasonModal
        open={modal === 'postpone'}
        title="Motivo de postergación"
        confirmLabel="Confirmar postergación"
        showNewDate
        onClose={() => setModal(null)}
        onConfirm={handleModalConfirm}
        isPending={postponeMutation.isPending}
      />
      <EventModerationReasonModal
        open={modal === 'cancel'}
        title="Motivo de cancelación"
        confirmLabel="Confirmar cancelación"
        onClose={() => setModal(null)}
        onConfirm={handleModalConfirm}
        isPending={cancelMutation.isPending}
      />
    </>
  );
}

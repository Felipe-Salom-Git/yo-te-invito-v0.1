'use client';

import { Suspense, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Button, Badge, Input, useToast } from '@/components';
import { EventModeBadge } from '@/components/producer/events/EventModeBadge';
import { deriveEventModeFromEvent } from '@/lib/producer/event-mode';
import { getErrorMessage } from '@/lib/errors';
import { TicketTypesEditor } from '@/components/producer/ticket-types/TicketTypesEditor';
import { ProducerEventPostSavePanel } from '@/components/producer/events/ProducerEventPostSavePanel';
import { TicketListPdfDownload } from '@/components/producer/events/TicketListPdfDownload';
import { ProducerTicketDateChangesPanel } from '@/components/producer/events/ProducerTicketDateChangesPanel';
import type { ProducerReviewRow } from '@/repositories/interfaces';

export default function ProducerEventManagePage() {
  const params = useParams();
  const eventId = (params?.eventId as string) ?? '';
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('ALL');
  const [modReview, setModReview] = useState<ProducerReviewRow | null>(null);
  const [modType, setModType] = useState<'HIDE_FROM_PUBLIC' | 'OFFICIAL_REPLY' | 'BOTH'>('HIDE_FROM_PUBLIC');
  const [modReason, setModReason] = useState('');
  const [modReply, setModReply] = useState('');

  const { data: tickets } = useQuery({
    queryKey: ['tickets', 'event', eventId],
    queryFn: () => repos.tickets.listByEvent(eventId),
    enabled: !!eventId,
  });

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', 'producer', eventId],
    queryFn: () => repos.events.getDetailForProducer(eventId),
    enabled: !!eventId,
  });

  const { data: producerReviews } = useQuery({
    queryKey: ['producer', 'reviews', eventId],
    queryFn: () => repos.reviews.listForProducer(eventId),
    enabled: !!eventId,
  });

  const modMutation = useMutation({
    mutationFn: () => {
      if (!modReview) return Promise.resolve(null);
      return repos.inbox.createReviewModeration({
        reviewId: modReview.id,
        requestType: modType,
        reason: modReason.trim(),
        proposedReply:
          modType === 'OFFICIAL_REPLY' || modType === 'BOTH' ? modReply.trim() || undefined : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['producer', 'reviews', eventId] });
      addToast('Solicitud enviada al inbox de administración', 'success');
      setModReview(null);
      setModReason('');
      setModReply('');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  if (isLoading || !eventId) {
    return (
      <PageContainer>
        <p className="text-text-muted">Loading…</p>
      </PageContainer>
    );
  }
  if (!event) {
    return (
      <PageContainer>
        <p className="text-red-400">Evento no encontrado</p>
      </PageContainer>
    );
  }

  const eventMode = deriveEventModeFromEvent(event);

  return (
    <PageContainer>
      <Link href="/producer/events" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Eventos
      </Link>
      <Suspense fallback={null}>
        <ProducerEventPostSavePanel eventId={eventId} mode={eventMode} variant="welcome" />
        <ProducerEventPostSavePanel eventId={eventId} mode={eventMode} variant="saved" />
      </Suspense>
      <div className="flex flex-wrap items-center gap-2">
        <SectionTitle>{event.title}</SectionTitle>
        <EventModeBadge mode={eventMode} hasActiveTicketing={event.isTicketingEnabled} />
        <Badge variant={event.status === 'APPROVED' ? 'accent' : event.status === 'PENDING' ? 'default' : 'muted'}>
          {event.status ?? 'DRAFT'}
        </Badge>
      </div>
      <p className="mt-2 text-text-muted">
        {event.venueName ?? event.city ?? '—'} · {new Date(event.startAt).toLocaleDateString('es-AR')}
      </p>
      <div className="mt-4">
        <Link href={`/producer/events/${eventId}/edit`}>
          <Button type="button" variant="outline" size="sm">
            Editar ficha del evento
          </Button>
        </Link>
      </div>

      {event.isGeneralPublication ? (
        <div className="mt-8 rounded-lg border border-border bg-bg-muted p-4 text-sm text-text-muted">
          Este evento fue creado como <span className="font-medium text-text">Solo publicidad</span>. No
          incluye venta de entradas ni gestión de ticketera.
        </div>
      ) : (
        <TicketTypesEditor eventId={eventId} />
      )}

      {!event.isGeneralPublication && <ProducerTicketDateChangesPanel eventId={eventId} />}

      <section className="mt-12 border-t border-border pt-8">
        <h2 className="font-semibold text-text">Reseñas</h2>
        <p className="mt-1 text-sm text-text-muted">
          Podés pedir al equipo que oculte una reseña del listado público o publique una respuesta oficial.
        </p>
        {producerReviews?.reviews?.length ? (
          <ul className="mt-4 space-y-3">
            {producerReviews.reviews.map((r) => (
              <li key={r.id} className="rounded border border-border bg-bg-muted p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className="font-medium text-text">{r.userName}</span>
                    <span className="ml-2 text-text-muted">{r.score}/5</span>
                    {r.hiddenFromPublic && (
                      <span className="ml-2 rounded bg-border px-1.5 text-xs">Oculta al público</span>
                    )}
                    {r.title && <p className="mt-1 text-text">{r.title}</p>}
                    {r.comment && <p className="text-text-muted">{r.comment}</p>}
                    {r.officialReply && (
                      <p className="mt-2 border-l-2 border-accent pl-2 text-text-muted">
                        Respuesta oficial: {r.officialReply}
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setModReview(r)}>
                    Solicitar moderación
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-text-muted">Sin reseñas todavía.</p>
        )}
      </section>

      {!event.isGeneralPublication ? (
      <section className="mt-12 border-t border-border pt-8">
        <TicketListPdfDownload eventId={eventId} ticketCount={tickets?.length ?? 0} />
        <h2 className="mt-8 font-semibold text-text">Tickets vendidos</h2>
        <div className="mt-2 flex gap-2">
          {['ALL', 'VALID', 'USED', 'REVOKED'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setTicketStatusFilter(s)}
              className={`rounded px-2 py-1 text-sm ${ticketStatusFilter === s ? 'bg-accent text-bg' : 'bg-bg-muted text-text-muted'}`}
            >
              {s}
            </button>
          ))}
        </div>
        {tickets && tickets.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {(ticketStatusFilter === 'ALL' ? tickets : tickets.filter((t) => t.status === ticketStatusFilter)).map(
              (t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded border border-border bg-bg-muted px-4 py-2 text-sm"
                >
                  <span>{t.id}</span>
                  <span className="rounded bg-border px-2 py-0.5 text-xs font-medium">{t.status}</span>
                </li>
              ),
            )}
          </ul>
        ) : (
          <p className="mt-4 text-text-muted">Sin tickets</p>
        )}
      </section>
      ) : null}

      <p className="mt-6 max-w-2xl text-sm text-text-muted">
        <span className="font-medium text-text">Referidos del evento</span>: asignación comercial por evento (link de
        venta y cortesías). Es distinto de la asociación general productora–referidor en{' '}
        <Link href="/producer/referrals" className="text-accent hover:underline">
          /producer/referrals
        </Link>
        .
      </p>

      <nav className="mt-8 flex flex-wrap gap-4">
        <Link
          href={`/producer/events/${eventId}/courtesies`}
          className="rounded border border-accent px-4 py-2 text-accent hover:bg-accent/10"
        >
          Cortesías
        </Link>
        <Link
          href={`/producer/events/${eventId}/referrals`}
          className="rounded border border-accent px-4 py-2 text-accent hover:bg-accent/10"
        >
          Referidos
        </Link>
        <Link
          href="/producer/payouts"
          className="rounded border border-border px-4 py-2 text-text-muted hover:bg-bg-muted"
        >
          Solicitar retiro
        </Link>
      </nav>

      {modReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-bg p-6 shadow-xl">
            <h3 className="font-semibold text-text">Moderación de reseña</h3>
            <p className="mt-1 text-sm text-text-muted line-clamp-3">{modReview.comment ?? modReview.title ?? '—'}</p>
            <label className="mt-4 block text-sm font-medium text-text">Tipo de solicitud</label>
            <select
              value={modType}
              onChange={(e) =>
                setModType(e.target.value as 'HIDE_FROM_PUBLIC' | 'OFFICIAL_REPLY' | 'BOTH')
              }
              className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-text"
            >
              <option value="HIDE_FROM_PUBLIC">Ocultar del público</option>
              <option value="OFFICIAL_REPLY">Respuesta oficial</option>
              <option value="BOTH">Ambos</option>
            </select>
            <Input label="Motivo" value={modReason} onChange={(e) => setModReason(e.target.value)} className="mt-3" />
            {(modType === 'OFFICIAL_REPLY' || modType === 'BOTH') && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-text">Borrador de respuesta oficial</label>
                <textarea
                  value={modReply}
                  onChange={(e) => setModReply(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-text"
                />
              </div>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModReview(null)}>
                Cancelar
              </Button>
              <Button
                onClick={() => modMutation.mutate()}
                disabled={modMutation.isPending || !modReason.trim()}
              >
                Enviar
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

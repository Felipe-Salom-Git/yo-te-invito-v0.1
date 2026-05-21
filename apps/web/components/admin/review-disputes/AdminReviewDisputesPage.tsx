'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { adminReviewDisputesKeys } from '@/lib/query/keys';
import { Button, SectionTitle, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import type { ReviewDisputeDetail, ReviewDisputeStatus } from '@/repositories/interfaces';
import { AdminReviewDisputeStatusBadge } from './AdminReviewDisputeStatusBadge';

const REASON_LABELS: Record<string, string> = {
  UNFAIR_RATING: 'Calificación injusta',
  OFFENSIVE: 'Comentario ofensivo',
  FALSE_INFORMATION: 'Información falsa',
  WRONG_EVENT: 'No corresponde al evento',
  OTHER: 'Otro',
};

const selectClass =
  'rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none';

function DisputeDetailPanel({
  dispute,
  onClose,
  filtersKey,
}: {
  dispute: ReviewDisputeDetail;
  onClose: () => void;
  filtersKey: string;
}) {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [adminNote, setAdminNote] = useState(dispute.adminNote ?? '');
  const [platformReply, setPlatformReply] = useState('');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: adminReviewDisputesKeys.list(filtersKey) });
    queryClient.invalidateQueries({ queryKey: adminReviewDisputesKeys.detail(dispute.id) });
  };

  const onError = (e: unknown) => addToast(getErrorMessage(e), 'error');
  const noteBody = { adminNote: adminNote.trim() || undefined };

  const inReviewMut = useMutation({
    mutationFn: () => repos.adminReviewDisputes.markInReview(dispute.id, noteBody),
    onSuccess: () => {
      addToast('Marcada en revisión', 'success');
      invalidate();
    },
    onError,
  });
  const acceptMut = useMutation({
    mutationFn: () => repos.adminReviewDisputes.accept(dispute.id, noteBody),
    onSuccess: () => {
      addToast('Solicitud aceptada — reseña oculta del público', 'success');
      invalidate();
    },
    onError,
  });
  const rejectMut = useMutation({
    mutationFn: () => repos.adminReviewDisputes.reject(dispute.id, noteBody),
    onSuccess: () => {
      addToast('Solicitud rechazada', 'success');
      invalidate();
    },
    onError,
  });
  const resolveMut = useMutation({
    mutationFn: () => repos.adminReviewDisputes.resolve(dispute.id, noteBody),
    onSuccess: () => {
      addToast('Solicitud resuelta', 'success');
      invalidate();
    },
    onError,
  });

  const replyMut = useMutation({
    mutationFn: () =>
      repos.adminReviews.reply(dispute.reviewId, { body: platformReply.trim() }),
    onSuccess: () => {
      addToast('Respuesta de plataforma publicada', 'success');
      setPlatformReply('');
      invalidate();
    },
    onError,
  });

  const busy =
    inReviewMut.isPending ||
    acceptMut.isPending ||
    rejectMut.isPending ||
    resolveMut.isPending ||
    replyMut.isPending;
  const terminal = ['ACCEPTED', 'REJECTED', 'RESOLVED', 'CANCELLED'].includes(dispute.status);

  return (
    <article className="mt-6 rounded-xl border border-accent/30 bg-bg-muted p-6">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-text">Detalle de solicitud</h3>
        <button type="button" onClick={onClose} className="text-sm text-text-muted hover:text-text">
          Cerrar
        </button>
      </header>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-text-muted">Productora</dt>
          <dd className="text-text">{dispute.producerDisplayName ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Evento</dt>
          <dd className="text-text">{dispute.eventTitle}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Usuario</dt>
          <dd className="text-text">{dispute.reviewUserDisplayName}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Puntaje</dt>
          <dd className="text-amber-400">★ {dispute.reviewScore}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-text-muted">Comentario original</dt>
          <dd className="text-text">{dispute.reviewComment ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Motivo</dt>
          <dd className="text-text">{REASON_LABELS[dispute.reasonType] ?? dispute.reasonType}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Estado</dt>
          <dd>
            <AdminReviewDisputeStatusBadge status={dispute.status} />
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-text-muted">Mensaje de la productora</dt>
          <dd className="whitespace-pre-wrap text-text">{dispute.message}</dd>
        </div>
      </dl>

      <label className="mt-4 block text-sm font-medium text-text">Resolución de administración</label>
      <textarea
        className="mt-1 w-full min-h-[80px] rounded-lg border border-border bg-bg px-3 py-2 text-sm"
        value={adminNote}
        onChange={(e) => setAdminNote(e.target.value)}
        disabled={terminal}
        maxLength={1000}
      />

      <label className="mt-6 block text-sm font-medium text-text">
        Respuesta pública de plataforma
      </label>
      <p className="mt-1 text-xs text-text-muted">
        Visible bajo la reseña (no reemplaza la nota interna de resolución).
      </p>
      <textarea
        className="mt-2 w-full min-h-[80px] rounded-lg border border-border bg-bg px-3 py-2 text-sm"
        value={platformReply}
        onChange={(e) => setPlatformReply(e.target.value)}
        placeholder="Mensaje oficial de Yo Te Invito…"
        maxLength={2000}
      />
      <div className="mt-2">
        <Button
          size="sm"
          variant="outline"
          disabled={busy || platformReply.trim().length < 1}
          onClick={() => replyMut.mutate()}
        >
          Publicar respuesta de plataforma
        </Button>
      </div>

      {!terminal ? (
        <footer className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => inReviewMut.mutate()}>
            Marcar en revisión
          </Button>
          <Button size="sm" disabled={busy} onClick={() => acceptMut.mutate()}>
            Aceptar solicitud
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => rejectMut.mutate()}>
            Rechazar solicitud
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => resolveMut.mutate()}>
            Resolver
          </Button>
        </footer>
      ) : null}
    </article>
  );
}

export function AdminReviewDisputesPage() {
  const repos = useRepositories();
  const [statusFilter, setStatusFilter] = useState<ReviewDisputeStatus | ''>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const filtersKey = JSON.stringify({ statusFilter, page });

  const { data, isLoading } = useQuery({
    queryKey: adminReviewDisputesKeys.list(filtersKey),
    queryFn: () =>
      repos.adminReviewDisputes.list({
        status: statusFilter || undefined,
        page,
        limit: 30,
      }),
  });

  const { data: selected } = useQuery({
    queryKey: adminReviewDisputesKeys.detail(selectedId ?? ''),
    queryFn: () => repos.adminReviewDisputes.get(selectedId!),
    enabled: !!selectedId,
  });

  const totalPages = data ? Math.ceil(data.total / 30) : 0;

  return (
    <section>
      <SectionTitle>Solicitudes de revisión de valoraciones</SectionTitle>
      <p className="mt-1 max-w-2xl text-sm text-text-muted">
        Productoras que pidieron revisar comentarios de eventos. Aceptar oculta la reseña del listado
        público.
      </p>

      <label className="mt-4 block text-sm text-text-muted">
        Filtrar por estado
        <select
          className={`${selectClass} mt-1 block w-full max-w-xs`}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as ReviewDisputeStatus | '');
            setPage(1);
          }}
        >
          <option value="">Todas</option>
          <option value="PENDING">Pendiente</option>
          <option value="IN_REVIEW">En revisión</option>
          <option value="ACCEPTED">Aceptada</option>
          <option value="REJECTED">Rechazada</option>
          <option value="RESOLVED">Resuelta</option>
        </select>
      </label>

      {isLoading ? (
        <p className="mt-6 text-sm text-text-muted">Cargando…</p>
      ) : (
        <table className="mt-6 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-text-muted">
              <th className="py-2 pr-2">Productora</th>
              <th className="py-2 pr-2">Evento</th>
              <th className="py-2 pr-2">Puntaje</th>
              <th className="py-2 pr-2">Estado</th>
              <th className="py-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {(data?.disputes ?? []).map((d) => (
              <tr
                key={d.id}
                className="cursor-pointer border-b border-border/60 hover:bg-bg-muted/50"
                onClick={() => setSelectedId(d.id)}
              >
                <td className="py-3 pr-2">{d.producerDisplayName ?? '—'}</td>
                <td className="py-3 pr-2">{d.eventTitle}</td>
                <td className="py-3 pr-2 text-amber-400">★ {d.reviewScore}</td>
                <td className="py-3 pr-2">
                  <AdminReviewDisputeStatusBadge status={d.status} />
                </td>
                <td className="py-3">{new Date(d.createdAt).toLocaleDateString('es-AR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {totalPages > 1 ? (
        <footer className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded border border-border px-3 py-1 text-sm disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-border px-3 py-1 text-sm disabled:opacity-40"
          >
            Siguiente
          </button>
        </footer>
      ) : null}

      {selected && selectedId ? (
        <DisputeDetailPanel
          dispute={selected}
          onClose={() => setSelectedId(null)}
          filtersKey={filtersKey}
        />
      ) : null}
    </section>
  );
}

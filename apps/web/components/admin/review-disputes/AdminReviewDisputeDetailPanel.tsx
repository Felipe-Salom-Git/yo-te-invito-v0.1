'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { adminReviewDisputesKeys } from '@/lib/query/keys';
import { Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import type { ReviewDisputeDetail } from '@/repositories/interfaces';
import { ReviewPublicStatusBadge } from '@/components/producer/comments/ReviewPublicStatusBadge';
import { AdminReviewDisputeStatusBadge } from './AdminReviewDisputeStatusBadge';
import { AdminReviewDisputeConfirmModal } from './AdminReviewDisputeConfirmModal';
import {
  ADMIN_DISPUTE_ACTION_COPY,
  EVENT_CATEGORY_LABELS,
  REVIEW_DISPUTE_REASON_LABELS,
  formatAdminDateTime,
} from './admin-review-dispute-copy';

type ConfirmKind =
  | 'accept'
  | 'reject'
  | 'resolve'
  | 'inReview'
  | 'hide'
  | 'restore'
  | null;

type Props = {
  dispute: ReviewDisputeDetail;
  filtersKey: string;
  onClose: () => void;
};

export function AdminReviewDisputeDetailPanel({ dispute, filtersKey, onClose }: Props) {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [adminNote, setAdminNote] = useState(dispute.adminNote ?? '');
  const [platformReply, setPlatformReply] = useState('');
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);

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
      setConfirmKind(null);
      invalidate();
    },
    onError,
  });
  const acceptMut = useMutation({
    mutationFn: () => repos.adminReviewDisputes.accept(dispute.id, noteBody),
    onSuccess: () => {
      addToast('Solicitud aceptada — reseña oculta del público', 'success');
      setConfirmKind(null);
      invalidate();
    },
    onError,
  });
  const rejectMut = useMutation({
    mutationFn: () => repos.adminReviewDisputes.reject(dispute.id, noteBody),
    onSuccess: () => {
      addToast('Solicitud rechazada', 'success');
      setConfirmKind(null);
      invalidate();
    },
    onError,
  });
  const resolveMut = useMutation({
    mutationFn: () => repos.adminReviewDisputes.resolve(dispute.id, noteBody),
    onSuccess: () => {
      addToast('Solicitud resuelta', 'success');
      setConfirmKind(null);
      invalidate();
    },
    onError,
  });
  const hideMut = useMutation({
    mutationFn: () =>
      repos.adminReviews.hide(dispute.reviewId, {
        adminNote: adminNote.trim() || undefined,
        reason: 'Moderación administrativa',
      }),
    onSuccess: () => {
      addToast('Reseña oculta del público', 'success');
      setConfirmKind(null);
      invalidate();
    },
    onError,
  });
  const restoreMut = useMutation({
    mutationFn: () => repos.adminReviews.restore(dispute.reviewId, {}),
    onSuccess: () => {
      addToast('Reseña restaurada en público', 'success');
      setConfirmKind(null);
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
    hideMut.isPending ||
    restoreMut.isPending ||
    replyMut.isPending;

  const terminal = ['ACCEPTED', 'REJECTED', 'RESOLVED', 'CANCELLED'].includes(dispute.status);
  const reviewHidden = dispute.reviewHiddenFromPublic;

  const runConfirm = () => {
    switch (confirmKind) {
      case 'accept':
        acceptMut.mutate();
        break;
      case 'reject':
        rejectMut.mutate();
        break;
      case 'resolve':
        resolveMut.mutate();
        break;
      case 'inReview':
        inReviewMut.mutate();
        break;
      case 'hide':
        hideMut.mutate();
        break;
      case 'restore':
        restoreMut.mutate();
        break;
      default:
        break;
    }
  };

  const confirmCopy = confirmKind ? ADMIN_DISPUTE_ACTION_COPY[confirmKind] : null;

  return (
    <>
      <article className="mt-8 rounded-xl border border-accent/30 bg-bg-muted/50 p-5 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Detalle de disputa</h3>
            <p className="mt-1 text-xs text-text-muted">
              Actualizada {formatAdminDateTime(dispute.updatedAt)}
              {dispute.resolvedAt
                ? ` · Resuelta ${formatAdminDateTime(dispute.resolvedAt)}`
                : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-text-muted hover:text-white"
          >
            Cerrar
          </button>
        </header>

        <div className="mt-4 flex flex-wrap gap-2">
          <AdminReviewDisputeStatusBadge status={dispute.status} />
          <ReviewPublicStatusBadge status={dispute.reviewPublicStatus} />
          {reviewHidden ? (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300">
              Oculta al público
            </span>
          ) : (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
              Visible al público
            </span>
          )}
        </div>

        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-muted">Productora</dt>
            <dd className="mt-1 text-white">{dispute.producerDisplayName ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-muted">Entidad reseñada</dt>
            <dd className="mt-1 text-white">{dispute.eventTitle}</dd>
            <dd className="text-xs text-text-muted">
              {EVENT_CATEGORY_LABELS[dispute.eventCategory]}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-muted">Autor de la reseña</dt>
            <dd className="mt-1 text-white">{dispute.reviewUserDisplayName}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-muted">Puntaje</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-accent">
              {dispute.reviewOverallRating}
              <span className="text-sm font-normal text-text-muted"> /10</span>
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-text-muted">Comentario disputado</dt>
            <dd className="mt-1 whitespace-pre-wrap leading-relaxed text-text-muted">
              {dispute.reviewComment ?? 'Sin texto'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-muted">Motivo</dt>
            <dd className="mt-1 text-white">
              {REVIEW_DISPUTE_REASON_LABELS[dispute.reasonType] ?? dispute.reasonType}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-muted">Respuesta oficial previa</dt>
            <dd className="mt-1 text-text-muted">
              {dispute.hasOfficialReply ? 'Sí' : 'No'}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-text-muted">Mensaje de la productora</dt>
            <dd className="mt-1 whitespace-pre-wrap text-text-muted">{dispute.message}</dd>
          </div>
        </dl>

        <p className="mt-4 text-xs text-text-muted">
          Las acciones de disputa y moderación quedan registradas en{' '}
          <Link
            href={`/admin/auditoria?entity=ReviewDisputeRequest&q=${encodeURIComponent(dispute.id)}`}
            className="text-accent hover:underline"
          >
            auditoría
          </Link>
          .
        </p>

        <label className="mt-5 block text-sm font-medium text-white">
          Nota interna de administración
        </label>
        <textarea
          className="mt-1 w-full min-h-[80px] rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text"
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          disabled={terminal && !reviewHidden}
          maxLength={1000}
          placeholder="Visible para el equipo; no se publica en la ficha"
        />

        <div className="mt-6 border-t border-border/60 pt-6">
          <label className="block text-sm font-medium text-white">
            Respuesta pública de plataforma
          </label>
          <p className="mt-1 text-xs text-text-muted">
            Se muestra bajo la reseña en la ficha pública (independiente de la nota interna).
          </p>
          <textarea
            className="mt-2 w-full min-h-[80px] rounded-lg border border-border bg-bg px-3 py-2 text-sm"
            value={platformReply}
            onChange={(e) => setPlatformReply(e.target.value)}
            placeholder="Mensaje oficial de Yo Te Invito…"
            maxLength={2000}
          />
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            disabled={busy || platformReply.trim().length < 1}
            onClick={() => replyMut.mutate()}
          >
            Publicar respuesta
          </Button>
        </div>

        <footer className="mt-6 space-y-4 border-t border-border/60 pt-6">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Disputa
          </p>
          {!terminal ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setConfirmKind('inReview')}
              >
                En revisión
              </Button>
              <Button size="sm" disabled={busy} onClick={() => setConfirmKind('accept')}>
                Aceptar
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirmKind('reject')}>
                Rechazar
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirmKind('resolve')}>
                Resolver
              </Button>
            </div>
          ) : (
            <p className="text-sm text-text-muted">Esta disputa ya está cerrada.</p>
          )}

          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Moderación directa de la reseña
          </p>
          <div className="flex flex-wrap gap-2">
            {!reviewHidden ? (
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500/40 text-amber-200"
                disabled={busy}
                onClick={() => setConfirmKind('hide')}
              >
                Ocultar reseña
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirmKind('restore')}>
                Restaurar reseña
              </Button>
            )}
          </div>
        </footer>
      </article>

      {confirmCopy ? (
        <AdminReviewDisputeConfirmModal
          open={confirmKind != null}
          title={confirmCopy.title}
          description={confirmCopy.body}
          confirmLabel={confirmCopy.confirm}
          variant={confirmKind === 'hide' || confirmKind === 'accept' ? 'danger' : 'primary'}
          busy={busy}
          onClose={() => setConfirmKind(null)}
          onConfirm={runConfirm}
        />
      ) : null}
    </>
  );
}

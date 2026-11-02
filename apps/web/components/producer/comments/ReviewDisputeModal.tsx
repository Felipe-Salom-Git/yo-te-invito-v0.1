'use client';

import { useState } from 'react';
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { PUBLIC_MODAL_PANEL_CLASS, PUBLIC_MODAL_VIEWPORT_CLASS } from '@/lib/ui/publicModalLayout';
import type { CreateReviewDisputePayload, ReviewDisputeReasonType } from '@/repositories/interfaces';

const REASON_OPTIONS: { value: ReviewDisputeReasonType; label: string }[] = [
  { value: 'UNFAIR_RATING', label: 'Calificación injusta' },
  { value: 'OFFENSIVE', label: 'Comentario ofensivo' },
  { value: 'FALSE_INFORMATION', label: 'Información falsa' },
  { value: 'WRONG_EVENT', label: 'No corresponde al evento / local' },
  { value: 'OTHER', label: 'Otro' },
];

type Props = {
  reviewId: string;
  open: boolean;
  onClose: () => void;
  /** Producer or gastro endpoint — same dispute domain and admin queue. */
  createDisputeFn: (reviewId: string, payload: CreateReviewDisputePayload) => Promise<unknown>;
  invalidateQueryKey: QueryKey;
  summaryQueryKey?: QueryKey;
};

export function ReviewDisputeModal({
  reviewId,
  open,
  onClose,
  createDisputeFn,
  invalidateQueryKey,
  summaryQueryKey,
}: Props) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [reasonType, setReasonType] = useState<ReviewDisputeReasonType>('UNFAIR_RATING');
  const [message, setMessage] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      createDisputeFn(reviewId, {
        reasonType,
        message: message.trim(),
      }),
    onSuccess: () => {
      addToast('Tu denuncia fue enviada a administración.', 'success');
      queryClient.invalidateQueries({ queryKey: invalidateQueryKey });
      if (summaryQueryKey) queryClient.invalidateQueries({ queryKey: summaryQueryKey });
      setMessage('');
      onClose();
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  if (!open) return null;

  const trimmed = message.trim();
  const canSubmit = trimmed.length >= 10;

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/60 ${PUBLIC_MODAL_VIEWPORT_CLASS}`}
      onClick={(e) => e.target === e.currentTarget && !mutation.isPending && onClose()}
    >
      <section
        className={`${PUBLIC_MODAL_PANEL_CLASS} w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-bg p-5 shadow-xl sm:p-6`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dispute-modal-title"
      >
        <h2 id="dispute-modal-title" className="text-lg font-semibold text-text">
          Denunciar valoración
        </h2>
        <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-amber-100/90 leading-relaxed">
          Denunciá solo si considerás que el comentario incumple las reglas de la plataforma o no
          corresponde.
        </p>
        <p className="mt-3 text-sm text-text-muted leading-relaxed">
          Un administrador revisará tu caso. La valoración puede quedar en estado «en revisión» mientras tanto.
          <span className="font-medium text-text">
            {' '}
            No se elimina ni modifica el puntaje automáticamente.
          </span>
        </p>

        <label className="mt-4 block text-sm font-medium text-text" htmlFor="dispute-reason">
          Motivo
        </label>
        <select
          id="dispute-reason"
          className="mt-1 w-full rounded-lg border border-border bg-bg-muted px-3 py-2 text-sm text-text"
          value={reasonType}
          onChange={(e) => setReasonType(e.target.value as ReviewDisputeReasonType)}
          disabled={mutation.isPending}
        >
          {REASON_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <label className="mt-4 block text-sm font-medium text-text" htmlFor="dispute-message">
          Detalle / explicación
        </label>
        <textarea
          id="dispute-message"
          className="mt-1 w-full min-h-[120px] rounded-lg border border-border bg-bg-muted px-3 py-2 text-sm text-text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Contanos por qué considerás que esta valoración no corresponde…"
          maxLength={1000}
          disabled={mutation.isPending}
        />
        <p className="mt-1 text-xs text-text-muted">
          {trimmed.length}/1000 · mínimo 10 caracteres
        </p>

        <footer className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !canSubmit}
            className="w-full sm:w-auto"
          >
            {mutation.isPending ? 'Enviando…' : 'Enviar denuncia'}
          </Button>
        </footer>
      </section>
    </div>
  );
}

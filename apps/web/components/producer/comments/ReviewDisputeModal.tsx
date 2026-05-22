'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { producerReviewsKeys } from '@/lib/query/keys';
import { Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import type { ReviewDisputeReasonType } from '@/repositories/interfaces';

const REASON_OPTIONS: { value: ReviewDisputeReasonType; label: string }[] = [
  { value: 'UNFAIR_RATING', label: 'Calificación injusta' },
  { value: 'OFFENSIVE', label: 'Comentario ofensivo' },
  { value: 'FALSE_INFORMATION', label: 'Información falsa' },
  { value: 'WRONG_EVENT', label: 'No corresponde al evento' },
  { value: 'OTHER', label: 'Otro' },
];

type Props = {
  reviewId: string;
  open: boolean;
  onClose: () => void;
  filtersKey: string;
};

export function ReviewDisputeModal({ reviewId, open, onClose, filtersKey }: Props) {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [reasonType, setReasonType] = useState<ReviewDisputeReasonType>('UNFAIR_RATING');
  const [message, setMessage] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      repos.producerReviews.createDispute(reviewId, {
        reasonType,
        message: message.trim(),
      }),
    onSuccess: () => {
      addToast('Tu solicitud fue enviada a administración.', 'success');
      queryClient.invalidateQueries({ queryKey: producerReviewsKeys.list(filtersKey) });
      queryClient.invalidateQueries({ queryKey: producerReviewsKeys.summary() });
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && !mutation.isPending && onClose()}
    >
      <section
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-xl border border-border bg-bg p-5 shadow-xl sm:max-w-lg sm:rounded-xl sm:p-6"
        role="dialog"
        aria-labelledby="dispute-modal-title"
      >
        <h2 id="dispute-modal-title" className="text-lg font-semibold text-text">
          Solicitar revisión a administración
        </h2>
        <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-amber-100/90 leading-relaxed">
          Solicitá revisión solo si considerás que el comentario incumple las reglas de la plataforma o no
          corresponde al evento.
        </p>
        <p className="mt-3 text-sm text-text-muted leading-relaxed">
          Un administrador revisará tu caso. La valoración puede quedar en estado «en revisión» mientras tanto.
          <span className="font-medium text-text">
            {' '}
            No se elimina ni modifica el puntaje automáticamente.
          </span>
        </p>

        <label className="mt-4 block text-sm font-medium text-text">Motivo</label>
        <select
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

        <label className="mt-4 block text-sm font-medium text-text">Detalle / explicación</label>
        <textarea
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
            {mutation.isPending ? 'Enviando…' : 'Enviar solicitud'}
          </Button>
        </footer>
      </section>
    </div>
  );
}

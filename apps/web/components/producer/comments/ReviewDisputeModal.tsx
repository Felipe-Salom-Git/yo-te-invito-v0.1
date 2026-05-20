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

  const panel = 'w-full max-w-lg rounded-xl border border-border bg-bg p-6 shadow-xl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <section className={panel} role="dialog" aria-labelledby="dispute-modal-title">
        <h2 id="dispute-modal-title" className="text-lg font-semibold text-text">
          Solicitar revisión a administración
        </h2>
        <p className="mt-2 text-sm text-text-muted leading-relaxed">
          La administración revisará tu solicitud. No se eliminará ni modificará la valoración
          automáticamente. Te avisaremos cuando haya una resolución.
        </p>

        <label className="mt-4 block text-sm font-medium text-text">Motivo</label>
        <select
          className="mt-1 w-full rounded-lg border border-border bg-bg-muted px-3 py-2 text-sm text-text"
          value={reasonType}
          onChange={(e) => setReasonType(e.target.value as ReviewDisputeReasonType)}
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
        />

        <footer className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || message.trim().length < 10}
          >
            {mutation.isPending ? 'Enviando…' : 'Enviar solicitud'}
          </Button>
        </footer>
      </section>
    </div>
  );
}

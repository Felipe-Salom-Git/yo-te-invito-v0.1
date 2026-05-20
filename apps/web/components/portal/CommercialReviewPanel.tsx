'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { Button, Input, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';

type Props = {
  mode: 'producer' | 'referrer';
  counterpartyId: string;
  counterpartyLabel: string;
};

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex gap-1" role="group" aria-label="Puntuación">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-lg ${n <= value ? 'text-amber-400' : 'text-text-muted'}`}
          aria-label={`${n} estrellas`}
        >
          {n <= value ? '★' : '☆'}
        </button>
      ))}
    </div>
  );
}

export function CommercialReviewPanel({ mode, counterpartyId, counterpartyLabel }: Props) {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const queryKey =
    mode === 'producer'
      ? ['commercial-reviews', 'producer', counterpartyId]
      : ['commercial-reviews', 'referrer', counterpartyId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      mode === 'producer'
        ? repos.commercialReviews.listForProducerReferrer(counterpartyId)
        : repos.commercialReviews.listForReferrerProducer(counterpartyId),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      mode === 'producer'
        ? repos.commercialReviews.createAsProducer(counterpartyId, {
            rating,
            comment: comment.trim() || undefined,
          })
        : repos.commercialReviews.createAsReferrer(counterpartyId, {
            rating,
            comment: comment.trim() || undefined,
          }),
    onSuccess: () => {
      addToast('Valoración guardada', 'success');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const aboutCounterparty = mode === 'producer' ? data?.aboutReferrer : data?.aboutProducer;
  const summaryCounterparty =
    mode === 'producer' ? data?.summaryAboutReferrer : data?.summaryAboutProducer;

  return (
    <div className="mt-4 border-t border-border pt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
        Valoración comercial (privada)
      </p>
      <p className="mt-1 text-xs text-text-muted leading-relaxed">
        Solo visible para tu productora y {counterpartyLabel}. No aparece en perfiles públicos ni
        en reseñas de eventos.
      </p>

      {isLoading ? (
        <p className="mt-3 text-sm text-text-muted">Cargando valoraciones…</p>
      ) : (
        <>
          {summaryCounterparty && summaryCounterparty.totalReviews > 0 ? (
            <p className="mt-3 text-sm text-text">
              Promedio sobre {counterpartyLabel}:{' '}
              <span className="font-semibold text-amber-400">
                {summaryCounterparty.averageRating?.toFixed(1)} ★
              </span>{' '}
              ({summaryCounterparty.totalReviews} valoración
              {summaryCounterparty.totalReviews === 1 ? '' : 'es'})
            </p>
          ) : null}

          {aboutCounterparty && aboutCounterparty.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {aboutCounterparty.slice(0, 3).map((r) => (
                <li key={r.id} className="rounded-lg border border-border/60 bg-bg px-3 py-2 text-xs">
                  <span className="text-amber-400">★ {r.rating}</span>
                  {r.comment ? (
                    <p className="mt-1 text-text-muted">{r.comment}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}

      <div className="mt-4 space-y-3">
        <StarPicker value={rating} onChange={setRating} />
        <Input
          label="Comentario (opcional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={`Tu experiencia trabajando con ${counterpartyLabel}`}
        />
        <Button
          size="sm"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? 'Guardando…' : 'Guardar valoración'}
        </Button>
      </div>
    </div>
  );
}

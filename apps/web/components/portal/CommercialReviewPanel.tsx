'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  COMMERCIAL_PRODUCER_ASPECT_LABELS_ES,
  COMMERCIAL_REFERRER_ASPECT_LABELS_ES,
  averageCommercialAspectScores,
  commercialProducerAspectKeys,
  commercialReferrerAspectKeys,
  legacyCommercialRatingFromOverall,
  type CommercialReviewTarget,
} from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { useMe } from '@/hooks/useMe';
import { Button, Input, useToast } from '@/components';
import { RatingInput } from '@/components/reviews/RatingInput';
import { getErrorMessage } from '@/lib/errors';
import { CommercialAspectBreakdown } from './CommercialAspectBreakdown';

type Props = {
  mode: 'producer' | 'referrer';
  counterpartyId: string;
  counterpartyLabel: string;
};

const DEFAULT_SCORE = 8;

function buildInitialScores(
  targetType: CommercialReviewTarget,
  existing?: Record<string, number> | null,
): Record<string, number> {
  const keys =
    targetType === 'REFERRER'
      ? [...commercialReferrerAspectKeys]
      : [...commercialProducerAspectKeys];
  const out: Record<string, number> = {};
  for (const key of keys) {
    out[key] = existing?.[key] ?? DEFAULT_SCORE;
  }
  return out;
}

export function CommercialReviewPanel({ mode, counterpartyId, counterpartyLabel }: Props) {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { userId } = useMe();

  const targetType: CommercialReviewTarget = mode === 'producer' ? 'REFERRER' : 'PRODUCER';
  const aspectLabels =
    targetType === 'REFERRER'
      ? COMMERCIAL_REFERRER_ASPECT_LABELS_ES
      : COMMERCIAL_PRODUCER_ASPECT_LABELS_ES;

  const [scores, setScores] = useState<Record<string, number>>(() =>
    buildInitialScores(targetType),
  );
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

  const aboutCounterparty = mode === 'producer' ? data?.aboutReferrer : data?.aboutProducer;
  const summaryCounterparty =
    mode === 'producer' ? data?.summaryAboutReferrer : data?.summaryAboutProducer;

  const myReview = useMemo(
    () => aboutCounterparty?.find((r) => r.reviewerUserId === userId),
    [aboutCounterparty, userId],
  );

  useEffect(() => {
    if (!myReview) return;
    if (myReview.aspectRatings && Object.keys(myReview.aspectRatings).length > 0) {
      setScores(buildInitialScores(targetType, myReview.aspectRatings));
    }
    setComment(myReview.comment ?? '');
  }, [myReview, targetType]);

  const overallPreview = useMemo(
    () => averageCommercialAspectScores(scores),
    [scores],
  );

  const saveMutation = useMutation({
    mutationFn: () => {
      const overallRating = overallPreview;
      const aspectRatings = { ...scores };
      const rating = legacyCommercialRatingFromOverall(overallRating);
      const payload = {
        overallRating,
        aspectRatings,
        rating,
        comment: comment.trim() || undefined,
      };
      return mode === 'producer'
        ? repos.commercialReviews.createAsProducer(counterpartyId, payload)
        : repos.commercialReviews.createAsReferrer(counterpartyId, payload);
    },
    onSuccess: () => {
      addToast('Valoración guardada', 'success');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  return (
    <div className="mt-4 border-t border-border pt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
        Valoración comercial (privada)
      </p>
      <p className="mt-1 text-xs text-text-muted leading-relaxed">
        Solo visible para tu {mode === 'producer' ? 'productora' : 'perfil'} y {counterpartyLabel}.
        No aparece en perfiles públicos ni en reseñas de eventos.
      </p>

      {isLoading ? (
        <p className="mt-3 text-sm text-text-muted">Cargando valoraciones…</p>
      ) : (
        <>
          {summaryCounterparty && summaryCounterparty.totalReviews > 0 ? (
            <p className="mt-3 text-sm text-text">
              Promedio sobre {counterpartyLabel}:{' '}
              <span className="font-semibold text-accent">
                {summaryCounterparty.averageRating?.toFixed(1)}
                <span className="font-normal text-text-muted"> /10</span>
              </span>{' '}
              ({summaryCounterparty.totalReviews} valoración
              {summaryCounterparty.totalReviews === 1 ? '' : 'es'})
            </p>
          ) : null}

          {aboutCounterparty && aboutCounterparty.length > 0 ? (
            <ul className="mt-2 space-y-3">
              {aboutCounterparty.slice(0, 3).map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-border/60 bg-bg px-3 py-2 text-xs"
                >
                  <span className="font-medium text-accent">
                    {r.overallRating ?? r.rating * 2}
                    <span className="font-normal text-text-muted"> /10</span>
                  </span>
                  {r.aspectRatings ? (
                    <CommercialAspectBreakdown
                      targetType={r.targetType}
                      aspectRatings={r.aspectRatings}
                    />
                  ) : null}
                  {r.comment ? (
                    <p className="mt-2 text-text-muted">{r.comment}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}

      <div className="mt-4 space-y-4">
        <p className="text-sm font-medium text-text">
          Valorá cuatro aspectos (1–10)
          {myReview ? (
            <span className="ml-2 font-normal text-text-muted">· editando tu valoración</span>
          ) : null}
        </p>
        <p className="text-xs text-text-muted">
          Puntaje general estimado:{' '}
          <span className="font-semibold text-accent">{overallPreview}/10</span>
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(aspectLabels).map(([key, label]) => (
            <RatingInput
              key={key}
              label={label}
              value={scores[key] ?? DEFAULT_SCORE}
              onChange={(v) => setScores((p) => ({ ...p, [key]: v }))}
              scale="internal"
            />
          ))}
        </div>

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
          {saveMutation.isPending ? 'Guardando…' : myReview ? 'Actualizar valoración' : 'Guardar valoración'}
        </Button>
      </div>
    </div>
  );
}

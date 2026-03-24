'use client';

import { useState } from 'react';
import type { EntityType } from '@/lib/schemas/review';
import {
  getReviewSchema,
  getDimensionLabels,
  reviewGenericSchema,
} from '@/lib/schemas/review';
import { RatingInput } from './RatingInput';

export interface ReviewFormProps {
  entityType: EntityType;
  entityId: string;
  onSubmit: (values: {
    score: number;
    comment?: string;
    dimensions?: Record<string, number>;
  }) => void;
  isSubmitting?: boolean;
}

function avgScores(nums: number[]): number {
  if (nums.length === 0) return 0;
  return (
    Math.round(
      (nums.reduce((a, b) => a + b, 0) / nums.length) * 10
    ) / 10
  );
}

export function ReviewForm({
  entityType,
  entityId,
  onSubmit,
  isSubmitting = false,
}: ReviewFormProps) {
  const [comment, setComment] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [genericScore, setGenericScore] = useState(3);
  const [error, setError] = useState<string | null>(null);

  const schema = getReviewSchema(entityType);
  const labels = getDimensionLabels(entityType);
  const isGeneric =
    entityType === 'event' ||
    !['restaurant', 'producer', 'excursion', 'rental'].includes(entityType);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isGeneric) {
        const parsed = reviewGenericSchema.safeParse({
          score: genericScore,
          comment: comment || undefined,
        });
        if (!parsed.success) {
          setError(
            parsed.error.errors[0]?.message ?? 'Revisá los datos'
          );
          return;
        }
        onSubmit({
          score: genericScore,
          comment: parsed.data.comment,
        });
        return;
      }
      const keys = Object.keys(labels);
      const values: Record<string, number> = {};
      for (const k of keys) values[k] = scores[k] ?? 3;
      const parsed = schema.safeParse({
        ...values,
        comment: comment || undefined,
      });
      if (!parsed.success) {
        setError(
          parsed.error.errors[0]?.message ?? 'Revisá los datos'
        );
        return;
      }
      const nums = Object.values(values);
      const avg = avgScores(nums);
      onSubmit({
        score: avg,
        comment: (parsed.data as { comment?: string }).comment,
        dimensions: values,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-bg-muted/50 overflow-hidden"
    >
      <div className="p-6 sm:p-8">
        <h3 className="text-lg font-semibold text-white">
          Escribir valoración
        </h3>
        <p className="mt-1.5 text-sm text-text-muted">
          Tu opinión ayuda a otros a descubrir experiencias increíbles.
        </p>

        {/* General rating */}
        <div className="mt-6">
          {isGeneric ? (
            <RatingInput
              value={genericScore}
              onChange={setGenericScore}
              label="Valoración general"
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {Object.entries(labels).map(([key, label]) => (
                <RatingInput
                  key={key}
                  value={scores[key] ?? 3}
                  onChange={(v) =>
                    setScores((p) => ({ ...p, [key]: v }))
                  }
                  label={label}
                />
              ))}
            </div>
          )}
        </div>

        {/* Comment */}
        <div className="mt-6">
          <label
            htmlFor="review-comment"
            className="block text-sm font-medium text-text-muted"
          >
            Comentario (opcional)
          </label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            maxLength={500}
            className="mt-2 w-full resize-y rounded-lg border border-border bg-bg px-4 py-3 text-text placeholder:text-text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="Contá tu experiencia para ayudar a otros usuarios. ¿Qué fue lo que más te gustó? Podés mencionar atención, calidad, ambiente o cualquier detalle importante."
          />
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-400">{error}</p>
        )}
      </div>

      {/* Submit footer */}
      <div className="border-t border-border bg-bg-muted/30 px-6 py-4 sm:px-8">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-accent px-5 py-3 font-semibold text-bg shadow-lg shadow-accent/20 transition-all hover:bg-accent-hover hover:shadow-accent/30 disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto sm:min-w-[180px]"
        >
          {isSubmitting ? 'Enviando…' : 'Publicar valoración'}
        </button>
      </div>
    </form>
  );
}

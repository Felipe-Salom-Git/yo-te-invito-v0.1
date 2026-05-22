'use client';

import { useState } from 'react';
import type { EntityType } from '@/lib/schemas/review';
import { getReviewSchema, getDimensionLabels } from '@/lib/schemas/review';
import { RatingInput } from './RatingInput';

export interface ReviewFormSubmitPayload {
  overallRating: number;
  aspectRatings: Record<string, number>;
  comment: string;
}

export interface ReviewFormProps {
  entityType: EntityType;
  entityId: string;
  onSubmit: (values: ReviewFormSubmitPayload) => void;
  isSubmitting?: boolean;
  /** When false, shows hint to sign in (public reviews require account). */
  canSubmit?: boolean;
}

function avgScores(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

export function ReviewForm({
  entityType,
  onSubmit,
  isSubmitting = false,
  canSubmit = true,
}: ReviewFormProps) {
  const [comment, setComment] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const schema = getReviewSchema(entityType);
  const labels = getDimensionLabels(entityType);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!canSubmit) {
      setError('Iniciá sesión para publicar una valoración.');
      return;
    }
    const keys = Object.keys(labels);
    const aspectRatings: Record<string, number> = {};
    for (const k of keys) aspectRatings[k] = scores[k] ?? 8;
    const overallRating = Math.min(
      10,
      Math.max(1, Math.round(avgScores(Object.values(aspectRatings)))),
    );
    const parsed = schema.safeParse({
      ...aspectRatings,
      comment,
      overallRating,
    });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Revisá los datos');
      return;
    }
    onSubmit({
      overallRating,
      aspectRatings,
      comment: parsed.data.comment as string,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-bg-muted/50 overflow-hidden"
    >
      <div className="p-6 sm:p-8">
        <h3 className="text-lg font-semibold text-white">Escribir valoración</h3>
        <p className="mt-1.5 text-sm text-text-muted">
          Valorá cada aspecto del 1 al 10. Solo usuarios registrados pueden publicar.
        </p>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {Object.entries(labels).map(([key, label]) => (
            <RatingInput
              key={key}
              value={scores[key] ?? 8}
              onChange={(v) => setScores((p) => ({ ...p, [key]: v }))}
              label={label}
            />
          ))}
        </div>

        <div className="mt-6">
          <label
            htmlFor="review-comment"
            className="block text-sm font-medium text-text-muted"
          >
            Comentario
          </label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            maxLength={2000}
            required
            className="mt-2 w-full resize-y rounded-lg border border-border bg-bg px-4 py-3 text-text placeholder:text-text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="Contá tu experiencia (mínimo 10 caracteres)."
          />
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </div>

      <div className="border-t border-border bg-bg-muted/30 px-6 py-4 sm:px-8">
        <button
          type="submit"
          disabled={isSubmitting || !canSubmit}
          className="w-full rounded-lg bg-accent px-5 py-3 font-semibold text-bg shadow-accent-glow transition-all hover:bg-accent-hover disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto sm:min-w-[180px]"
        >
          {isSubmitting ? 'Enviando…' : 'Publicar valoración'}
        </button>
      </div>
    </form>
  );
}

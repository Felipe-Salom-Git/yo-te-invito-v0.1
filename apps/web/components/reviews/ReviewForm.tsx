'use client';

import { useState } from 'react';
import type { EntityType } from '@/lib/schemas/review';
import { getReviewSchema, getDimensionLabels, reviewGenericSchema } from '@/lib/schemas/review';

export interface ReviewFormProps {
  entityType: EntityType;
  entityId: string;
  onSubmit: (values: { score: number; comment?: string; dimensions?: Record<string, number> }) => void;
  isSubmitting?: boolean;
}

function avgScores(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

export function ReviewForm({ entityType, entityId, onSubmit, isSubmitting }: ReviewFormProps) {
  const [comment, setComment] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [genericScore, setGenericScore] = useState(3);
  const [error, setError] = useState<string | null>(null);

  const schema = getReviewSchema(entityType);
  const labels = getDimensionLabels(entityType);
  const isGeneric = entityType === 'event' || !['restaurant', 'producer', 'excursion', 'rental'].includes(entityType);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isGeneric) {
        const parsed = reviewGenericSchema.safeParse({ score: genericScore, comment: comment || undefined });
        if (!parsed.success) {
          setError(parsed.error.errors[0]?.message ?? 'Revisá los datos');
          return;
        }
        onSubmit({ score: genericScore, comment: parsed.data.comment });
        return;
      } else {
        const keys = Object.keys(labels);
        const values: Record<string, number> = {};
        for (const k of keys) values[k] = scores[k] ?? 3;
        const parsed = schema.safeParse({ ...values, comment: comment || undefined });
        if (!parsed.success) {
          setError(parsed.error.errors[0]?.message ?? 'Revisá los datos');
          return;
        }
        const nums = Object.values(values);
        const avg = avgScores(nums);
        onSubmit({ score: avg, comment: (parsed.data as { comment?: string }).comment, dimensions: values });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-bg-muted p-4">
      <h3 className="font-medium text-text">Escribir review</h3>
      {isGeneric ? (
        <div>
          <label className="block text-sm text-text-muted">Puntaje (1–5)</label>
          <select
            value={genericScore}
            onChange={(e) => setGenericScore(Number(e.target.value))}
            className="mt-1 rounded border border-border bg-bg px-3 py-2 text-text"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(labels).map(([key, label]) => (
            <div key={key}>
              <label className="block text-sm text-text-muted">{label}</label>
              <select
                value={scores[key] ?? 3}
                onChange={(e) => setScores((p) => ({ ...p, [key]: Number(e.target.value) }))}
                className="mt-1 rounded border border-border bg-bg px-3 py-2 text-text"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
      <div>
        <label className="block text-sm text-text-muted">Comentario (opcional)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-text"
          placeholder="Tu opinión..."
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-accent px-4 py-2 text-bg hover:bg-accent-hover disabled:opacity-50"
      >
        {isSubmitting ? 'Enviando…' : 'Enviar'}
      </button>
    </form>
  );
}

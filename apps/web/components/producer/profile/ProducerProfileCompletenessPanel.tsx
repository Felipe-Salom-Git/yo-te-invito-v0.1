'use client';

import Link from 'next/link';
import type { ProducerDetail } from '@/repositories/interfaces';
import {
  getCompletenessSummaryMessages,
  getProducerProfileCompleteness,
} from '@/lib/producer/producer-profile-completeness';

type Props = {
  profile: ProducerDetail;
};

export function ProducerProfileCompletenessPanel({ profile }: Props) {
  const result = getProducerProfileCompleteness(profile);
  const { items, percent, doneCount, totalRequired } = result;
  const complete = percent >= 100;
  const summary = getCompletenessSummaryMessages(result);

  return (
    <div className="rounded-xl border border-border bg-bg-muted/50 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Completitud del perfil
          </p>
          <p className="mt-1 text-lg font-semibold text-text">
            {complete ? 'Perfil básico completo' : `${percent}% completado`}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            {doneCount}/{totalRequired} ítems recomendados
          </p>
        </div>
        <div
          className={`rounded-full border px-3 py-1 text-sm font-medium ${
            complete
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-amber-500/25 bg-amber-500/10 text-amber-200/90'
          }`}
        >
          {complete ? 'Listo' : 'En progreso'}
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>

      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-sm">
            <span
              className={item.done ? 'text-accent' : 'text-text-muted'}
              aria-hidden
            >
              {item.done ? '✓' : '○'}
            </span>
            <span className={item.done ? 'text-text-muted line-through' : 'text-text'}>
              {item.label}
              {item.optional ? (
                <span className="text-text-muted"> (opcional)</span>
              ) : null}
            </span>
            {!item.done ? (
              <Link
                href={item.editHref}
                className="ml-auto shrink-0 text-xs text-accent hover:underline"
              >
                Completar
              </Link>
            ) : null}
          </li>
        ))}
      </ul>

      {summary.length > 0 ? (
        <ul className="mt-4 space-y-1 text-xs text-text-muted">
          {summary.map((m) => (
            <li key={m}>· {m}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

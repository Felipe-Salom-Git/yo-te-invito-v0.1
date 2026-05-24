'use client';

import Link from 'next/link';
import type { OnboardingChecklistResult } from '@/lib/onboarding/onboarding-checklist.types';
import { OnboardingCompletionBadge } from './OnboardingCompletionBadge';

type Props = {
  result: OnboardingChecklistResult;
  className?: string;
  /** Ocultar cuando está 100% completo (por defecto se muestra resumen breve). */
  collapseWhenComplete?: boolean;
};

export function OnboardingChecklistCard({
  result,
  className = '',
  collapseWhenComplete = false,
}: Props) {
  if (collapseWhenComplete && result.complete) {
    return null;
  }

  const { items, doneCount, totalCount, percent, title, subtitle, primaryCtaHref, primaryCtaLabel } =
    result;

  return (
    <section
      className={`rounded-xl border border-border/80 bg-bg-muted/40 p-4 sm:p-5 ${className}`.trim()}
      aria-labelledby="onboarding-checklist-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Próximos pasos
          </p>
          <h2 id="onboarding-checklist-heading" className="mt-1 text-lg font-semibold text-text">
            {title}
          </h2>
          <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
          <p className="mt-2 text-xs text-text-muted">
            {doneCount} de {totalCount} pasos completados
          </p>
        </div>
        <OnboardingCompletionBadge doneCount={doneCount} totalCount={totalCount} />
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${Math.min(100, percent)}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progreso de onboarding: ${percent}%`}
        />
      </div>

      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-sm">
            <span className={item.done ? 'text-accent' : 'text-text-muted'} aria-hidden>
              {item.done ? '✓' : '○'}
            </span>
            <span className={item.done ? 'text-text-muted line-through' : 'text-text'}>
              {item.label}
            </span>
            {!item.done && item.href ? (
              <Link
                href={item.href}
                className="ml-auto shrink-0 text-xs text-accent hover:underline"
              >
                Ir
              </Link>
            ) : null}
          </li>
        ))}
      </ul>

      {!result.complete ? (
        <Link
          href={primaryCtaHref}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-bg hover:bg-accent-hover sm:w-auto"
        >
          {primaryCtaLabel}
        </Link>
      ) : null}
    </section>
  );
}

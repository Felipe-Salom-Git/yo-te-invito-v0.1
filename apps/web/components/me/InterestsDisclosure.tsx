'use client';

import type { ReactNode } from 'react';

type Props = {
  title: string;
  description?: string;
  badge?: string;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
};

export function InterestsDisclosure({
  title,
  description,
  badge,
  defaultOpen = false,
  className = '',
  children,
}: Props) {
  return (
    <details
      className={`group rounded-lg border border-border bg-bg-muted/60 open:border-accent/30 ${className}`.trim()}
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-bg text-text-muted transition-transform group-open:rotate-90"
          aria-hidden
        >
          ›
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-text">{title}</span>
            {badge ? (
              <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                {badge}
              </span>
            ) : null}
          </span>
          {description ? (
            <span className="mt-0.5 block text-sm text-text-muted">{description}</span>
          ) : null}
        </span>
      </summary>
      <div className="border-t border-border px-4 pb-4 pt-3">{children}</div>
    </details>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface PublicSearchBarProps {
  /** Initial query (e.g. from /explore URL). */
  defaultQuery?: string;
  /** Compact single-line style for navbar-adjacent areas. */
  variant?: 'default' | 'compact';
  className?: string;
}

/**
 * Lightweight keyword search → `/explore?q=...` (V3.1 Etapa 2).
 */
export function PublicSearchBar({
  defaultQuery = '',
  variant = 'default',
  className = '',
}: PublicSearchBarProps) {
  const router = useRouter();
  const [q, setQ] = useState(defaultQuery);

  useEffect(() => {
    setQ(defaultQuery);
  }, [defaultQuery]);

  const submit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = q.trim();
      if (!trimmed) {
        router.push('/explore');
        return;
      }
      router.push(`/explore?q=${encodeURIComponent(trimmed)}`);
    },
    [q, router],
  );

  const isCompact = variant === 'compact';

  return (
    <form
      onSubmit={submit}
      className={`flex w-full items-stretch gap-2 ${className}`}
      role="search"
      aria-label="Buscar en Yo Te Invito"
    >
      <label htmlFor="public-search-q" className="sr-only">
        Buscar eventos, lugares o experiencias
      </label>
      <input
        id="public-search-q"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar eventos, lugares o experiencias"
        autoComplete="off"
        className={
          isCompact
            ? 'min-w-0 flex-1 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-white/45 focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/40'
            : 'min-w-0 flex-1 rounded-lg border border-border bg-bg-muted/80 px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent'
        }
      />
      <button
        type="submit"
        className={
          isCompact
            ? 'shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg'
            : 'shrink-0 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg'
        }
      >
        Buscar
      </button>
    </form>
  );
}

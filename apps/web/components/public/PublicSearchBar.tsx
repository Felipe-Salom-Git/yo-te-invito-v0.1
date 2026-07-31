'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  SUGGESTIONS_MIN_CHARS,
  useExploreSuggestions,
} from '@/lib/query/explore';
import {
  getCategoryLabel,
  getContentDetailHref,
} from '@/lib/home/contentRoutes';

const DEBOUNCE_MS = 300;

export interface PublicSearchBarProps {
  /** Initial query (e.g. from /explore URL). */
  defaultQuery?: string;
  /** Compact single-line style for navbar-adjacent areas. */
  variant?: 'default' | 'compact';
  className?: string;
}

/**
 * Keyword search → `/explore?q=...` with predictive suggestions (V3.2 Slice 5).
 */
export function PublicSearchBar({
  defaultQuery = '',
  variant = 'default',
  className = '',
}: PublicSearchBarProps) {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState(defaultQuery);
  const [debouncedQ, setDebouncedQ] = useState(defaultQuery);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    setQ(defaultQuery);
    setDebouncedQ(defaultQuery);
  }, [defaultQuery]);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQ(q), DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [q]);

  const suggestionsEnabled = open && debouncedQ.trim().length >= SUGGESTIONS_MIN_CHARS;
  const { data, isFetching, isError } = useExploreSuggestions(
    debouncedQ,
    suggestionsEnabled,
  );
  const suggestions = data?.data ?? [];

  useEffect(() => {
    setHighlight(0);
  }, [debouncedQ, suggestions.length]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const goExplore = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      setOpen(false);
      if (!trimmed) {
        router.push('/explore');
        return;
      }
      router.push(`/explore?q=${encodeURIComponent(trimmed)}`);
    },
    [router],
  );

  const openSuggestion = useCallback(
    (item: (typeof suggestions)[number]) => {
      setOpen(false);
      router.push(
        getContentDetailHref({
          id: item.id,
          category: item.category ?? undefined,
          gastroProfileId: item.gastroProfileId,
        }),
      );
    },
    [router],
  );

  const submit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      goExplore(q);
    },
    [goExplore, q],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      if (suggestions.length === 0) return;
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (suggestions.length === 0) return;
      setHighlight((h) => Math.max(h - 1, 0));
      return;
    }
    if (event.key === 'Enter' && open && suggestions[highlight]) {
      event.preventDefault();
      openSuggestion(suggestions[highlight]);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
  };

  const isCompact = variant === 'compact';
  const showPanel =
    open &&
    debouncedQ.trim().length >= SUGGESTIONS_MIN_CHARS &&
    (isFetching || isError || suggestions.length >= 0);

  return (
    <div ref={rootRef} className={`relative w-full ${className}`}>
      <form
        onSubmit={submit}
        className="flex w-full items-stretch gap-2"
        role="search"
        aria-label="Buscar en Yo Te Invito"
      >
        <label htmlFor="public-search-q" className="sr-only">
          Buscar eventos, lugares o experiencias
        </label>
        <div className="relative min-w-0 flex-1">
          <input
            id="public-search-q"
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Buscar eventos, lugares o experiencias"
            autoComplete="off"
            role="combobox"
            aria-expanded={showPanel}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              showPanel && suggestions[highlight]
                ? `${listId}-opt-${highlight}`
                : undefined
            }
            className={
              isCompact
                ? 'w-full rounded-full border border-white/15 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-white/45 focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/40'
                : 'w-full rounded-lg border border-border bg-bg-muted/80 px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent'
            }
          />
          {showPanel ? (
            <ul
              id={listId}
              role="listbox"
              className={
                isCompact
                  ? 'absolute z-40 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-white/15 bg-bg py-1 shadow-xl'
                  : 'absolute z-40 mt-2 max-h-72 w-full overflow-auto rounded-lg border border-border bg-bg py-1 shadow-lg'
              }
            >
              {isFetching && suggestions.length === 0 ? (
                <li className="px-3 py-2 text-sm text-text-muted" role="presentation">
                  Buscando…
                </li>
              ) : null}
              {isError ? (
                <li className="px-3 py-2 text-sm text-text-muted" role="presentation">
                  No pudimos cargar sugerencias.
                </li>
              ) : null}
              {!isFetching && !isError && suggestions.length === 0 ? (
                <li className="px-3 py-2 text-sm text-text-muted" role="presentation">
                  Sin coincidencias. Presioná Buscar para ver resultados.
                </li>
              ) : null}
              {suggestions.map((item, index) => {
                const active = index === highlight;
                const meta = [
                  getCategoryLabel(item.category ?? undefined),
                  item.subcategoryName,
                  item.producerName,
                  item.city,
                ]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <li
                    key={item.id}
                    id={`${listId}-opt-${index}`}
                    role="option"
                    aria-selected={active}
                    className={`cursor-pointer px-3 py-2 ${
                      active ? 'bg-accent/15' : 'hover:bg-white/5'
                    }`}
                    onMouseEnter={() => setHighlight(index)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      openSuggestion(item);
                    }}
                  >
                    <p className="line-clamp-1 text-sm font-medium text-text">{item.title}</p>
                    {meta ? (
                      <p className="mt-0.5 line-clamp-1 text-xs text-text-muted">{meta}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
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
    </div>
  );
}

'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { filterOptionsByQuery } from '@/lib/geo/locality-normalize';

export type SearchableComboboxOption = {
  value: string;
  label: string;
};

type SearchableComboboxProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableComboboxOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  /** Shown when the filter yields no rows. */
  emptyMessage?: string;
  allowClear?: boolean;
  id?: string;
  density?: 'default' | 'dense';
  className?: string;
  /** Optional custom filter; default ignores accents/case/extra spaces. */
  filterOption?: (option: SearchableComboboxOption, query: string) => boolean;
};

export function SearchableCombobox({
  label,
  value,
  onChange,
  options,
  placeholder = 'Buscar…',
  disabled,
  required,
  error,
  emptyMessage = 'Sin resultados',
  allowClear = true,
  id,
  density = 'default',
  className = '',
  filterOption,
}: SearchableComboboxProps) {
  const reactId = useId();
  const inputId = id ?? (label ? `${reactId}-input` : `${reactId}-combobox`);
  const listboxId = `${inputId}-listbox`;
  const errorId = error ? `${inputId}-error` : undefined;
  const dense = density === 'dense';

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value],
  );

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(selected?.label ?? '');
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery(selected?.label ?? '');
    }
  }, [selected?.label, value, open]);

  const filtered = useMemo(() => {
    if (filterOption) {
      const q = query.trim();
      if (!q) return options;
      return options.filter((o) => filterOption(o, q));
    }
    return filterOptionsByQuery(options, query);
  }, [filterOption, options, query]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery(selected?.label ?? '');
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, selected?.label]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-index="${highlight}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  const commit = useCallback(
    (next: SearchableComboboxOption | null) => {
      if (!next) {
        onChange('');
        setQuery('');
        setOpen(false);
        return;
      }
      onChange(next.value);
      setQuery(next.label);
      setOpen(false);
    },
    [onChange],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlight((h) => Math.max(h - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      if (!open) return;
      event.preventDefault();
      const opt = filtered[highlight];
      if (opt) commit(opt);
      return;
    }
    if (event.key === 'Escape') {
      if (!open) return;
      event.preventDefault();
      setOpen(false);
      setQuery(selected?.label ?? '');
      return;
    }
    if (event.key === 'Tab') {
      setOpen(false);
      setQuery(selected?.label ?? '');
    }
  };

  return (
    <div ref={rootRef} className={`relative w-full min-w-0 ${className}`}>
      {label ? (
        <label
          htmlFor={inputId}
          className={
            dense
              ? 'mb-1 block text-xs font-medium text-text'
              : 'mb-1.5 block text-sm font-medium text-text'
          }
        >
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={open && filtered[highlight] ? `${inputId}-opt-${highlight}` : undefined}
          aria-invalid={!!error}
          aria-describedby={errorId}
          aria-required={required || undefined}
          disabled={disabled}
          required={required && !value}
          autoComplete="off"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className={`
            w-full rounded border bg-bg text-text placeholder:text-text-muted
            focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent
            disabled:cursor-not-allowed disabled:opacity-50
            border-border
            ${allowClear && value ? 'pr-16' : 'pr-9'}
            ${dense ? 'min-h-[1.75rem] px-2 py-1 text-xs leading-tight' : 'min-h-11 px-3 py-2'}
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
          `}
        />
        <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
          {allowClear && value && !disabled ? (
            <button
              type="button"
              className="rounded px-1.5 text-sm text-text-muted hover:text-text"
              aria-label="Limpiar selección"
              onClick={() => commit(null)}
            >
              ×
            </button>
          ) : null}
          <span className="pointer-events-none px-1 text-xs text-text-muted" aria-hidden>
            ▾
          </span>
        </div>
      </div>

      {open && !disabled ? (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded border border-border bg-bg py-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-text-muted" role="presentation">
              {emptyMessage}
            </li>
          ) : (
            filtered.map((opt, index) => {
              const active = index === highlight;
              const isSelected = opt.value === value;
              return (
                <li
                  key={opt.value}
                  id={`${inputId}-opt-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  className={`cursor-pointer px-3 py-2 text-sm ${
                    active ? 'bg-accent/15 text-text' : 'text-text'
                  } ${isSelected ? 'font-medium' : ''}`}
                  onMouseEnter={() => setHighlight(index)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(opt);
                  }}
                >
                  {opt.label}
                </li>
              );
            })
          )}
        </ul>
      ) : null}

      {error ? (
        <p id={errorId} className={`mt-1 text-red-500 ${dense ? 'text-xs' : 'text-sm'}`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

'use client';

export type ProducerEventFilter =
  | 'all'
  | 'ticketed'
  | 'publicity'
  | 'upcoming';

const FILTERS: { id: ProducerEventFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'ticketed', label: 'Con ticketera' },
  { id: 'publicity', label: 'Solo publicidad' },
  { id: 'upcoming', label: 'Próximos' },
];

type Props = {
  value: ProducerEventFilter;
  onChange: (value: ProducerEventFilter) => void;
};

export function PublicProducerEventFilters({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onChange(f.id)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            value === f.id
              ? 'border border-accent-muted bg-accent-surface text-accent-soft'
              : 'border border-border bg-bg-muted text-text-muted hover:text-text'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

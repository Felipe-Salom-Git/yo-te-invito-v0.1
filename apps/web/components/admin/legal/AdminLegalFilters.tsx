export type LegalListFilter =
  | 'all'
  | 'public'
  | 'internal'
  | 'signup'
  | 'checkout'
  | 'portal';

const FILTER_OPTIONS: { id: LegalListFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'public', label: 'Públicos' },
  { id: 'internal', label: 'Internos' },
  { id: 'signup', label: 'Registro' },
  { id: 'checkout', label: 'Checkout' },
  { id: 'portal', label: 'Portal' },
];

type Props = {
  value: LegalListFilter;
  onChange: (value: LegalListFilter) => void;
};

export function AdminLegalFilters({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar documentos legales">
      {FILTER_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={value === opt.id}
          onClick={() => onChange(opt.id)}
          className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
            value === opt.id
              ? 'border-accent/50 bg-accent/10 text-accent'
              : 'border-border/80 bg-bg-muted/40 text-text-muted hover:border-accent/30 hover:text-text'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

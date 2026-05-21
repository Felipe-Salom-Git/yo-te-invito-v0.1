'use client';

export interface RatingInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  /** 1–10 scale (public reviews V2) */
  max?: number;
}

export function RatingInput({
  value,
  onChange,
  label,
  max = 10,
}: RatingInputProps) {
  const stars = Array.from({ length: max }, (_, i) => i + 1);
  return (
    <div>
      {label && (
        <p className="mb-2 text-sm font-medium text-text-muted">{label}</p>
      )}
      <div className="flex gap-1">
        {stars.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="h-10 w-10 rounded-lg border border-border bg-bg/50 text-xl transition-colors hover:border-accent/50 hover:bg-accent/10 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
            aria-label={`${n} de ${max} estrellas`}
          >
            <span className={value >= n ? 'text-accent' : 'text-text-muted'}>
              ★
            </span>
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-text-muted">
        {value} de {max}
      </p>
    </div>
  );
}

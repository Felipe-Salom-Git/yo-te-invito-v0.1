'use client';

import { FieldCharacterCounter } from '@/components/forms/FieldCharacterCounter';
import { RENTAL_SUMMARY_MAX_LENGTH } from '@/lib/rentals/rentalSummary';

type RentalSummaryFieldProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  hint?: string;
};

export function RentalSummaryField({
  value,
  onChange,
  label = 'Resumen',
  hint = 'Texto corto que se muestra debajo del título en la ficha pública.',
}: RentalSummaryFieldProps) {
  const len = value.length;

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-text">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, RENTAL_SUMMARY_MAX_LENGTH))}
        rows={2}
        maxLength={RENTAL_SUMMARY_MAX_LENGTH}
        placeholder="Ej.: Kayak doble con chaleco y remos incluidos."
        className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
        aria-describedby="rental-summary-hint rental-summary-counter"
      />
      <p id="rental-summary-hint" className="mt-1 text-xs text-text-muted">
        {hint}
      </p>
      <FieldCharacterCounter
        id="rental-summary-counter"
        current={len}
        max={RENTAL_SUMMARY_MAX_LENGTH}
        className="mt-1"
      />
    </div>
  );
}

'use client';

import { RENTAL_SUMMARY_MAX_LENGTH } from '@/lib/rentals/rentalSummary';

type RentalSummaryFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

export function RentalSummaryField({ value, onChange }: RentalSummaryFieldProps) {
  const len = value.length;
  const atLimit = len >= RENTAL_SUMMARY_MAX_LENGTH;

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-text">Resumen</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, RENTAL_SUMMARY_MAX_LENGTH))}
        rows={2}
        maxLength={RENTAL_SUMMARY_MAX_LENGTH}
        placeholder="Ej.: Kayak doble con chaleco y remos incluidos."
        className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
        aria-describedby="rental-summary-hint"
      />
      <p id="rental-summary-hint" className="mt-1 text-xs text-text-muted">
        Texto corto que se muestra debajo del título en la ficha pública.
      </p>
      <p className={`mt-1 text-right text-xs ${atLimit ? 'text-amber-500' : 'text-text-muted'}`}>
        {len}/{RENTAL_SUMMARY_MAX_LENGTH}
      </p>
    </div>
  );
}

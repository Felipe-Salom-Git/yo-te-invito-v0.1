'use client';

import { Input } from '@/components';
import type { DiscountAgreementFormState } from '@/lib/admin/discount-agreement-form';

type Props = {
  value: DiscountAgreementFormState;
  onChange: (next: DiscountAgreementFormState) => void;
  /** Unique per page (inputs derive their id from it). */
  idPrefix: string;
  /** Replace flow: a new row opens from `validFrom` and has no end date. */
  showValidTo?: boolean;
  fromLabel?: string;
  disabled?: boolean;
};

/** G10.B — terms of the commercial contract of ONE discount (never of the local). */
export function DiscountAgreementTermsFields({
  value,
  onChange,
  idPrefix,
  showValidTo = true,
  fromLabel = 'Desde',
  disabled,
}: Props) {
  const set = (patch: Partial<DiscountAgreementFormState>) => onChange({ ...value, ...patch });
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Input
        id={`${idPrefix}-unit-price`}
        label="Valor por validación (ARS, pesos)"
        inputMode="numeric"
        value={value.unitPricePesos}
        disabled={disabled}
        onChange={(e) => set({ unitPricePesos: e.target.value })}
        required
      />
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-text">Moneda</span>
        <select
          className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
          value="ARS"
          disabled
          aria-label="Moneda"
        >
          <option value="ARS">ARS</option>
        </select>
      </label>
      <Input
        id={`${idPrefix}-multiplier`}
        label="Multiplicador de canje"
        value={value.barterMultiplier}
        disabled={disabled}
        onChange={(e) => set({ barterMultiplier: e.target.value })}
        required
      />
      <Input
        id={`${idPrefix}-from`}
        label={fromLabel}
        type="date"
        value={value.validFrom}
        disabled={disabled}
        onChange={(e) => set({ validFrom: e.target.value })}
        required
      />
      {showValidTo ? (
        <Input
          id={`${idPrefix}-to`}
          label="Hasta (opcional)"
          type="date"
          value={value.validTo}
          disabled={disabled}
          onChange={(e) => set({ validTo: e.target.value })}
        />
      ) : null}
      <label className="block text-sm sm:col-span-2 lg:col-span-3">
        <span className="mb-1.5 block font-medium text-text">Notas (opcional)</span>
        <textarea
          id={`${idPrefix}-notes`}
          className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
          rows={2}
          value={value.notes}
          disabled={disabled}
          onChange={(e) => set({ notes: e.target.value })}
        />
      </label>
    </div>
  );
}
